"""Job: evaluate active alerts against live prices and fire push notifications."""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from db import get_session
from models import Alert, AlertDirection, AlertStatus, User
from services.alpha_vantage import fetch_quotes
from services.push import send_push

log = logging.getLogger(__name__)


def _is_triggered(alert: Alert, price: float) -> bool:
    if alert.direction == AlertDirection.above:
        return price >= alert.target_price
    return price <= alert.target_price


def _notification_body(alert: Alert, price: float) -> tuple[str, str]:
    direction_word = "above" if alert.direction == AlertDirection.above else "below"
    title = f"{alert.ticker} alert triggered"
    body = (
        f"{alert.ticker} is now ${price:,.2f}, "
        f"{direction_word} your target of ${alert.target_price:,.2f}"
    )
    return title, body


async def check_alerts() -> None:
    log.info("Running alert check...")
    triggered_count = 0

    async with get_session() as session:
        # 1. Load all active alerts
        result = await session.execute(
            select(Alert).where(Alert.status == AlertStatus.active)
        )
        active_alerts = result.scalars().all()

        if not active_alerts:
            log.info("No active alerts")
            return

        # Load users separately to get push tokens
        user_ids = {a.user_id for a in active_alerts}
        users_result = await session.execute(
            select(User).where(User.id.in_(user_ids))
        )
        users_by_id: dict[int, User] = {u.id: u for u in users_result.scalars()}

        log.info(
            "Checking %d active alert(s) across %d ticker(s)",
            len(active_alerts),
            len({a.ticker for a in active_alerts}),
        )

        # 2. Fetch prices for every unique ticker
        unique_tickers = list({a.ticker for a in active_alerts})
        prices = await fetch_quotes(unique_tickers)

        if not prices:
            log.warning("No prices returned — skipping evaluation")
            return

        # 3. Evaluate each alert and fire notifications
        now = datetime.now(timezone.utc)
        push_tasks = []

        for alert in active_alerts:
            price = prices.get(alert.ticker)
            if price is None:
                log.debug("No price for %s — skipping alert %d", alert.ticker, alert.id)
                continue

            if not _is_triggered(alert, price):
                continue

            # Mark triggered
            alert.status = AlertStatus.triggered
            alert.triggered_at = now
            triggered_count += 1
            log.info(
                "Alert %d triggered: %s %.4f (target %s %.4f)",
                alert.id,
                alert.ticker,
                price,
                alert.direction.value,
                alert.target_price,
            )

            # Queue push notification if the user has a token
            user = users_by_id.get(alert.user_id)
            if user and user.expo_push_token:
                title, body = _notification_body(alert, price)
                push_tasks.append(
                    send_push(
                        user.expo_push_token,
                        title,
                        body,
                        data={"alert_id": alert.id, "ticker": alert.ticker},
                    )
                )

        # 4. Persist all status changes in one commit
        if triggered_count:
            await session.commit()

        # 5. Fire all push notifications concurrently (after commit so DB is safe)
        if push_tasks:
            await asyncio.gather(*push_tasks)

    log.info(
        "Alert check complete — %d triggered out of %d active",
        triggered_count,
        len(active_alerts),
    )
