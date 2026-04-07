from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.holding import Holding
from app.models.portfolio_alert_state import PortfolioAlertState
from app.models.user import User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateHoldingRequest(BaseModel):
    ticker: str
    company_name: str
    market: str
    currency: str
    original_cost: float
    quantity: float
    purchase_date: date
    threshold_pct: float

    @field_validator("ticker")
    @classmethod
    def normalise_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("original_cost", "quantity")
    @classmethod
    def positive_number(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("must be greater than zero")
        return v

    @field_validator("threshold_pct")
    @classmethod
    def valid_threshold(cls, v: float) -> float:
        if v <= 0 or v > 10000:
            raise ValueError("threshold_pct must be between 0 and 10000")
        return v


class HoldingResponse(BaseModel):
    id: int
    ticker: str
    company_name: str
    market: str
    currency: str
    original_cost: float
    avg_cost: float
    quantity: float
    purchase_date: date
    threshold_pct: float
    threshold_profit_price: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[HoldingResponse])
async def list_holdings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Holding)
        .where(Holding.user_id == current_user.id, Holding.status == "active")
        .order_by(Holding.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def create_holding(
    body: CreateHoldingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    threshold_profit_price = round(body.original_cost * (1 + body.threshold_pct / 100), 4)
    holding = Holding(
        user_id=current_user.id,
        ticker=body.ticker,
        company_name=body.company_name,
        market=body.market,
        currency=body.currency,
        original_cost=body.original_cost,
        avg_cost=body.original_cost,
        quantity=body.quantity,
        purchase_date=body.purchase_date,
        threshold_pct=body.threshold_pct,
        threshold_profit_price=threshold_profit_price,
        status="active",
    )
    db.add(holding)
    await db.flush()  # populate holding.id before creating the state row

    db.add(PortfolioAlertState(stock_id=holding.id))
    await db.commit()
    await db.refresh(holding)
    return holding


@router.delete("/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    holding_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Holding).where(
            Holding.id == holding_id, Holding.user_id == current_user.id
        )
    )
    holding = result.scalar_one_or_none()
    if holding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")
    holding.status = "deleted"
    await db.commit()
