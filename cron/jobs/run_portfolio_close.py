"""Job: process end-of-day closes for portfolio holdings.

Scheduled at:
  - 16:30  America/New_York  →  US market close  (market="US")
  - 16:00  Asia/Kolkata      →  NSE market close  (market="NSE")

For every active holding in the target market:
  1. Fetch today's closing price via yfinance
  2. Upsert a price_snapshot row
  3. Run evaluate_close() against the holding's current alert state
  4. Persist updated alert state back to portfolio_alert_state
  5. If an alert fired:
       a. Insert a portfolio_alert_history row
       b. Send push notification (if user.push_enabled and expo_push_token set)
       c. Send email via Resend (if user.email_enabled and email set)
"""

import asyncio
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select

from db import get_session
from jobs.check_portfolio_alerts import (
    AlertStateSnapshot,
    HoldingSnapshot,
    evaluate_close,
)
from models import (
    Holding,
    PortfolioAlertHistory,
    PortfolioAlertState,
    PriceSnapshot,
    User,
)
from services.email import send_alert_email
from services.push import send_push
from services.yfinance_quotes import fetch_closing_price

log = logging.getLogger(__name__)


# ── Notification helpers ───────────────────────────────────────────────────────

def _push_title(alert_type: str, ticker: str) -> str:
    return {
        "threshold": f"{ticker} hit your profit target",
        "profit_up": f"{ticker} climbed to a new rung",
        "profit_down": f"{ticker} slipped back a rung",
        "loss": f"{ticker} entered loss territory",
    }.get(alert_type, f"{ticker} alert")


def _push_body(
    alert_type: str,
    ticker: str,
    close_price: float,
    profit_pct: float,
    rung_pct: float | None,
) -> str:
    sign = "+" if profit_pct >= 0 else ""
    pct = f"{sign}{profit_pct:.2f}%"
    if alert_type == "threshold":
        return f"Closed at ${close_price:.2f} ({pct}) — profit target reached."
    if alert_type == "profit_up":
        return f"Closed at ${close_price:.2f} ({pct}) — new rung: {rung_pct:.0f}%."
    if alert_type == "profit_down":
        return f"Closed at ${close_price:.2f} ({pct}) — stepped down to {rung_pct:.0f}%."
    if alert_type == "loss":
        return f"Closed at ${close_price:.2f} ({pct}) — now in loss zone."
    return f"Closed at ${close_price:.2f} ({pct})."


# ── Main job ───────────────────────────────────────────────────────────────────

async def run_portfolio_close(market: str) -> None:
    """
    Process end-of-day closing prices for all active holdings in *market*.

    Args:
        market: "US" or "NSE"
    """
    log.info("Portfolio close job started — market=%s", market)
    today = date.today()

    async with get_session() as session:
        # ── 1. Load active holdings ────────────────────────────────────────────
        holdings_result = await session.execute(
            select(Holding).where(
                Holding.status == "active",
                Holding.market == market,
            )
        )
        holdings = holdings_result.scalars().all()

        if not holdings:
            log.info("No active %s holdings — nothing to do", market)
            return

        log.info("Processing %d %s holding(s)", len(holdings), market)

        stock_ids = [h.id for h in holdings]
        user_ids = {h.user_id for h in holdings}

        # ── 2. Pre-load alert states ───────────────────────────────────────────
        states_result = await session.execute(
            select(PortfolioAlertState).where(
                PortfolioAlertState.stock_id.in_(stock_ids)
            )
        )
        states_by_stock: dict[int, PortfolioAlertState] = {
            s.stock_id: s for s in states_result.scalars()
        }

        # ── 3. Pre-load users ──────────────────────────────────────────────────
        users_result = await session.execute(
            select(User).where(User.id.in_(user_ids))
        )
        users_by_id: dict[int, User] = {u.id: u for u in users_result.scalars()}

        push_tasks: list = []
        email_tasks: list = []

        for holding in holdings:
            ticker = holding.ticker

            # ── 4. Fetch closing price ─────────────────────────────────────────
            try:
                close_price, daily_change_amt, daily_change_pct = (
                    await fetch_closing_price(ticker)
                )
            except Exception as exc:
                log.warning("Could not fetch close for %s: %s", ticker, exc)
                continue

            original_cost = float(holding.original_cost)
            avg_cost = float(holding.avg_cost)
            profit_pct = round((close_price - original_cost) / original_cost * 100, 4)

            # ── 5. Upsert price_snapshot ───────────────────────────────────────
            existing = await session.execute(
                select(PriceSnapshot).where(
                    PriceSnapshot.stock_id == holding.id,
                    PriceSnapshot.date == today,
                )
            )
            if existing.scalar_one_or_none() is None:
                session.add(
                    PriceSnapshot(
                        stock_id=holding.id,
                        date=today,
                        closing_price=close_price,
                        profit_pct=profit_pct,
                        avg_cost_at_close=avg_cost,
                        daily_change_amt=daily_change_amt,
                        daily_change_pct=daily_change_pct,
                    )
                )
                log.debug("Snapshot saved: %s @ %.4f", ticker, close_price)

            # ── 6. Evaluate alert state ────────────────────────────────────────
            state = states_by_stock.get(holding.id)
            if state is None:
                log.warning(
                    "No alert state for holding %d (%s) — skipping evaluation",
                    holding.id, ticker,
                )
                continue

            result = evaluate_close(
                HoldingSnapshot(
                    original_cost=original_cost,
                    threshold_pct=float(holding.threshold_pct),
                    threshold_profit_price=float(holding.threshold_profit_price),
                ),
                AlertStateSnapshot(
                    zone=state.zone,
                    current_rung_pct=(
                        float(state.current_rung_pct)
                        if state.current_rung_pct is not None else None
                    ),
                    pending_rung_pct=(
                        float(state.pending_rung_pct)
                        if state.pending_rung_pct is not None else None
                    ),
                    pending_rung_day1_date=state.pending_rung_day1_date,
                    pending_close_count=state.pending_close_count,
                ),
                close_price,
                today,
            )

            # ── 7. Persist updated alert state ─────────────────────────────────
            state.zone = result.new_zone
            state.current_rung_pct = result.new_rung_pct
            state.pending_rung_pct = result.new_pending_rung_pct
            state.pending_rung_day1_date = result.new_pending_day1_date
            state.pending_close_count = result.new_pending_close_count

            if result.alert_type is None:
                continue

            # ── 8. Alert fired ─────────────────────────────────────────────────
            log.info(
                "Alert fired: type=%s ticker=%s profit=%.2f%% rung=%s",
                result.alert_type, ticker, profit_pct,
                f"{result.new_rung_pct:.1f}%" if result.new_rung_pct else "n/a",
            )

            session.add(
                PortfolioAlertHistory(
                    stock_id=holding.id,
                    alert_type=result.alert_type,
                    rung_pct=result.new_rung_pct,
                    closing_price=close_price,
                    profit_pct=profit_pct,
                    is_actionable=True,
                    triggered_at=datetime.now(timezone.utc),
                )
            )

            user = users_by_id.get(holding.user_id)
            if user is None:
                continue

            title = _push_title(result.alert_type, ticker)
            body = _push_body(
                result.alert_type, ticker, close_price, profit_pct, result.new_rung_pct
            )

            if user.push_enabled and user.expo_push_token:
                push_tasks.append(
                    send_push(
                        user.expo_push_token,
                        title,
                        body,
                        data={
                            "stock_id": holding.id,
                            "ticker": ticker,
                            "alert_type": result.alert_type,
                        },
                    )
                )

            if user.email_enabled and user.email:
                email_tasks.append(
                    send_alert_email(
                        to=user.email,
                        name=user.name or ticker,
                        ticker=ticker,
                        company_name=holding.company_name,
                        alert_type=result.alert_type,
                        close_price=close_price,
                        profit_pct=profit_pct,
                        rung_pct=result.new_rung_pct,
                    )
                )

        # ── 9. Commit all DB changes then fire notifications ───────────────────
        await session.commit()

    if push_tasks:
        await asyncio.gather(*push_tasks)
    if email_tasks:
        await asyncio.gather(*email_tasks)

    log.info(
        "Portfolio close job done — market=%s, push=%d, email=%d",
        market, len(push_tasks), len(email_tasks),
    )
