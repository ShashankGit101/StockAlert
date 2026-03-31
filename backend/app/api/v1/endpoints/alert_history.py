"""Alert history — the ladder-based alert feed."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.holding import Holding
from app.models.portfolio_alert_history import PortfolioAlertHistory
from app.models.user import User

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class AlertHistoryResponse(BaseModel):
    id: int
    stock_id: int
    ticker: str
    company_name: str
    alert_type: str
    rung_pct: float | None
    closing_price: float | None
    profit_pct: float | None
    user_action: str | None
    action_taken_at: datetime | None
    is_actionable: bool
    triggered_at: datetime

    model_config = {"from_attributes": True}


class ActionRequest(BaseModel):
    action: str  # 'hold', 'buy_more', 'sell_full', 'sell_partial'


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AlertHistoryResponse])
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get all holdings for this user
    holdings_result = await db.execute(
        select(Holding).where(Holding.user_id == current_user.id)
    )
    holdings = holdings_result.scalars().all()
    holding_map = {h.id: h for h in holdings}

    if not holding_map:
        return []

    alerts_result = await db.execute(
        select(PortfolioAlertHistory)
        .where(PortfolioAlertHistory.stock_id.in_(list(holding_map.keys())))
        .order_by(PortfolioAlertHistory.triggered_at.desc())
        .limit(100)
    )
    alerts = alerts_result.scalars().all()

    out = []
    for a in alerts:
        h = holding_map.get(a.stock_id)
        out.append(
            AlertHistoryResponse(
                id=a.id,
                stock_id=a.stock_id,
                ticker=h.ticker if h else "",
                company_name=h.company_name if h else "",
                alert_type=a.alert_type,
                rung_pct=float(a.rung_pct) if a.rung_pct is not None else None,
                closing_price=float(a.closing_price) if a.closing_price is not None else None,
                profit_pct=float(a.profit_pct) if a.profit_pct is not None else None,
                user_action=a.user_action,
                action_taken_at=a.action_taken_at,
                is_actionable=a.is_actionable,
                triggered_at=a.triggered_at,
            )
        )
    return out


@router.get("/{alert_id}", response_model=AlertHistoryResponse)
async def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PortfolioAlertHistory).where(PortfolioAlertHistory.id == alert_id)
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Verify ownership
    h_result = await db.execute(
        select(Holding).where(Holding.id == alert.stock_id, Holding.user_id == current_user.id)
    )
    holding = h_result.scalar_one_or_none()
    if holding is None:
        raise HTTPException(status_code=403, detail="Not authorised")

    return AlertHistoryResponse(
        id=alert.id,
        stock_id=alert.stock_id,
        ticker=holding.ticker,
        company_name=holding.company_name,
        alert_type=alert.alert_type,
        rung_pct=float(alert.rung_pct) if alert.rung_pct is not None else None,
        closing_price=float(alert.closing_price) if alert.closing_price is not None else None,
        profit_pct=float(alert.profit_pct) if alert.profit_pct is not None else None,
        user_action=alert.user_action,
        action_taken_at=alert.action_taken_at,
        is_actionable=alert.is_actionable,
        triggered_at=alert.triggered_at,
    )


@router.put("/{alert_id}/action")
async def update_alert_action(
    alert_id: int,
    body: ActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PortfolioAlertHistory).where(PortfolioAlertHistory.id == alert_id)
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Verify ownership
    h_result = await db.execute(
        select(Holding).where(Holding.id == alert.stock_id, Holding.user_id == current_user.id)
    )
    if h_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not authorised")

    alert.user_action = body.action
    alert.action_taken_at = datetime.now(timezone.utc)
    alert.is_actionable = False
    await db.commit()

    return {"status": "ok", "action": body.action}
