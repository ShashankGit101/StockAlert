"""Portfolio stock positions — CRUD + buy/sell actions."""

from app.models.portfolio_alert_state import PortfolioAlertState #shashank 


from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.buy_history import BuyHistory
from app.models.holding import Holding
from app.models.portfolio_alert_history import PortfolioAlertHistory
from app.models.price_snapshot import PriceSnapshot
from app.models.sell_history import SellHistory
from app.models.user import User
from app.services.stock_service import StockServiceError, get_quote

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class CreateStockRequest(BaseModel):
    ticker: str
    company_name: str
    market: str
    currency: str
    buy_price: float
    quantity: float
    purchase_date: date
    threshold_pct: float

    @field_validator("ticker")
    @classmethod
    def normalise_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("buy_price", "quantity")
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


class AlertStateOut(BaseModel):
    zone: str
    current_rung_pct: float | None


class StockResponse(BaseModel):
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
    # Live data (populated from yfinance)
    current_price: float | None = None
    daily_change: float | None = None
    daily_change_pct: float | None = None
    profit_pct: float | None = None
    # Alert state
    zone: str | None = None
    current_rung_pct: float | None = None

    model_config = {"from_attributes": True}


class BuyRequest(BaseModel):
    shares: float
    price: float
    source: str = "manual"

    @field_validator("shares", "price")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("must be greater than zero")
        return v


class SellRequest(BaseModel):
    sell_type: str  # 'full' or 'partial'
    shares: float | None = None  # required for partial
    price: float
    source: str = "manual"

    @field_validator("price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("must be greater than zero")
        return v


class PriceSnapshotResponse(BaseModel):
    date: date
    closing_price: float
    profit_pct: float
    daily_change_pct: float | None

    model_config = {"from_attributes": True}


# ── Helpers ────────────────────────────────────────────────────────────────────

#async def _enrich_holding(holding: Holding) -> dict:
async def _enrich_holding(holding: Holding, db: AsyncSession) -> dict:
    """Add live price data to a holding dict."""
    data = {
        "id": holding.id,
        "ticker": holding.ticker,
        "company_name": holding.company_name,
        "market": holding.market,
        "currency": holding.currency,
        "original_cost": float(holding.original_cost),
        "avg_cost": float(holding.avg_cost),
        "quantity": float(holding.quantity),
        "purchase_date": holding.purchase_date,
        "threshold_pct": float(holding.threshold_pct),
        "threshold_profit_price": float(holding.threshold_profit_price),
        "status": holding.status,
        "created_at": holding.created_at,
        "current_price": None,
        "daily_change": None,
        "daily_change_pct": None,
        "profit_pct": None,
        "zone": "pre_threshold",
       # "current_rung_pct": None,
        "current_rung_pct": 0,
    }
    try:
        # LOG 1: Check if we are looking for the right ID
        print(f"DEBUG: Enriching {holding.ticker} (ID: {holding.id})")

        state_result = await db.execute(
            select(PortfolioAlertState).where(PortfolioAlertState.stock_id == holding.id)
        )
        state = state_result.scalar_one_or_none()
        
        if state:
            # LOG 2: Data found in DB
            print(f"DEBUG: Found state for {holding.ticker}: Zone={state.zone}, Rung={state.current_rung_pct}")
            data["zone"] = state.zone
            data["current_rung_pct"] = float(state.current_rung_pct) if state.current_rung_pct is not None else 0.0
        else:
            # LOG 3: No row found in portfolio_alert_state
            print(f"DEBUG: No alert state row found for {holding.ticker}. Defaulting to 0.0")
            data["zone"] = "pre_threshold"
            data["current_rung_pct"] = 0.0

        # ... (rest of your yfinance quote logic) ...
        
        # LOG 4: Final verification of what goes to the App
        print(f"DEBUG: Final data for App -> Rung: {data['current_rung_pct']}, Zone: {data['zone']}")

    except Exception as e:
        print(f"ERROR in _enrich_holding for {holding.ticker}: {e}")
    
    return data
    #try:
    #    # new code below  -- Shashank
    #    # 1. Fetch Alert State from the database
    #    state_result = await db.execute(
    #        select(PortfolioAlertState).where(PortfolioAlertState.stock_id == holding.id)
    #    )
    #    state = state_result.scalar_one_or_none()
    #    
    #    if state:
    #        data["zone"] = state.zone
    #        data["current_rung_pct"] = float(state.current_rung_pct) if state.current_rung_pct is not None else 0.0
    #    # new code above -- Shashank

    #    q = await get_quote(holding.ticker)
    #    avg_cost = float(holding.avg_cost)
    #    profit_pct = round((q.price - avg_cost) / avg_cost * 100, 4)
    #    data["current_price"] = q.price
    #    data["daily_change"] = q.change
    #    data["daily_change_pct"] = q.change_percent
    #    data["profit_pct"] = profit_pct
    ##except Exception: shashank
    # #   pass #shashank
    #except Exception as e:
    #    print(f"Error enriching holding {holding.ticker}: {e}")
    #return data






# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[StockResponse])
async def list_stocks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Holding)
        .where(Holding.user_id == current_user.id, Holding.status == "active")
        .order_by(Holding.created_at.desc())
    )
    holdings = result.scalars().all()

    out = []
    for h in holdings:
       # out.append(await _enrich_holding(h)) shashank
       out.append(await _enrich_holding(h, db))
    return out


@router.post("/", response_model=StockResponse, status_code=status.HTTP_201_CREATED)
async def create_stock(
    body: CreateStockRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    threshold_profit_price = round(body.buy_price * (1 + body.threshold_pct / 100), 4)
    holding = Holding(
        user_id=current_user.id,
        ticker=body.ticker,
        company_name=body.company_name,
        market=body.market,
        currency=body.currency,
        original_cost=body.buy_price,
        avg_cost=body.buy_price,
        quantity=body.quantity,
        purchase_date=body.purchase_date,
        threshold_pct=body.threshold_pct,
        threshold_profit_price=threshold_profit_price,
        status="active",
    )
    db.add(holding)
    await db.commit()
    await db.refresh(holding)
    # return await _enrich_holding(holding) // Shashank
    return await _enrich_holding(holding, db) 


@router.get("/{stock_id}", response_model=StockResponse)
async def get_stock(
    stock_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Holding).where
                            (
                                Holding.id == stock_id, Holding.user_id == current_user.id,
                                Holding.status != "deleted" # Shashank
                            )
        
    )
    holding = result.scalar_one_or_none()
    if holding is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    #return await _enrich_holding(holding) #shashank
    return await _enrich_holding(holding, db)


#@router.delete("/{stock_id}", status_code=status.HTTP_204_NO_CONTENT)
#async def delete_stock(
#    stock_id: int,
#    current_user: User = Depends(get_current_user),
#    db: AsyncSession = Depends(get_db),
#):
#    print(f"DEBUG: User {current_user.id} trying to delete stock {stock_id}") // Shashank
#    result = await db.execute(
#        select(Holding).where(Holding.id == stock_id, Holding.user_id == current_user.id)
#    )
#    holding = result.scalar_one_or_none()
#    if holding is None:
#        raise HTTPException(status_code=404, detail="Stock not found")
#    holding.status = "deleted"
#    await db.commit()


@router.delete("/{stock_id}")
async def delete_stock(
    stock_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # This will show up in Railway logs even if the query fails
    print(f"DEBUG: DELETE reached for ID {stock_id} by User {current_user.id}")
    
    # Let's see what is actually in the DB for this user
    all_holdings = await db.execute(select(Holding).where(Holding.user_id == current_user.id))
    print(f"DEBUG: User holdings IDs: {[h.id for h in all_holdings.scalars().all()]}")

    result = await db.execute(
        select(Holding).where(Holding.id == stock_id, Holding.user_id == current_user.id)
    )
    holding = result.scalar_one_or_none()
    
    if holding is None:
        print(f"DEBUG: Holding {stock_id} NOT FOUND for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Stock not found")
        
    holding.status = "deleted"
    await db.commit()
    return {"status": "success"}


@router.post("/{stock_id}/buy")
async def buy_stock(
    stock_id: int,
    body: BuyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Holding).where(Holding.id == stock_id, Holding.user_id == current_user.id)
    )
    holding = result.scalar_one_or_none()
    if holding is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    old_shares = float(holding.quantity)
    old_avg = float(holding.avg_cost)
    new_shares = body.shares
    new_price = body.price

    total_shares = old_shares + new_shares
    new_avg = round((old_shares * old_avg + new_shares * new_price) / total_shares, 4)
    old_threshold_pct = float(holding.threshold_pct)
    threshold_profit_price = float(holding.threshold_profit_price)
    new_threshold_pct = round((threshold_profit_price - new_avg) / new_avg * 100, 4)

    # Get current profit pct for logging
    profit_pct_at_buy = None
    try:
        q = await get_quote(holding.ticker)
        profit_pct_at_buy = round((q.price - new_avg) / new_avg * 100, 4)
    except Exception:
        pass

    # Log to buy_history
    bh = BuyHistory(
        stock_id=holding.id,
        source=body.source,
        shares_bought=new_shares,
        buy_price=new_price,
        total_cost=round(new_shares * new_price, 4),
        avg_cost_before=old_avg,
        avg_cost_after=new_avg,
        threshold_pct_before=old_threshold_pct,
        threshold_pct_after=new_threshold_pct,
        profit_pct_at_buy=profit_pct_at_buy,
    )
    db.add(bh)

    # Update holding
    holding.quantity = total_shares
    holding.avg_cost = new_avg
    holding.threshold_pct = new_threshold_pct

    await db.commit()
    await db.refresh(holding)

    return {
        "total_shares": total_shares,
        "new_avg_cost": new_avg,
        "new_threshold_pct": new_threshold_pct,
        "threshold_profit_price": threshold_profit_price,
        "profit_pct_at_buy": profit_pct_at_buy,
    }


@router.post("/{stock_id}/sell")
async def sell_stock(
    stock_id: int,
    body: SellRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Holding).where(Holding.id == stock_id, Holding.user_id == current_user.id)
    )
    holding = result.scalar_one_or_none()
    if holding is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    current_shares = float(holding.quantity)
    avg_cost = float(holding.avg_cost)
    sell_price = body.price

    if body.sell_type == "full":
        shares_sold = current_shares
        shares_remaining = 0.0
    else:
        if not body.shares or body.shares <= 0:
            raise HTTPException(status_code=400, detail="shares required for partial sell")
        if body.shares >= current_shares:
            raise HTTPException(status_code=400, detail="shares_sold must be less than quantity for partial sell")
        shares_sold = body.shares
        shares_remaining = round(current_shares - shares_sold, 4)

    total_proceeds = round(shares_sold * sell_price, 4)
    cost_basis = round(shares_sold * avg_cost, 4)
    profit_amount = round(total_proceeds - cost_basis, 4)
    profit_pct = round((sell_price - avg_cost) / avg_cost * 100, 4)

    sh = SellHistory(
        stock_id=holding.id,
        source=body.source,
        sell_type=body.sell_type,
        shares_sold=shares_sold,
        sell_price=sell_price,
        total_proceeds=total_proceeds,
        cost_basis=cost_basis,
        profit_amount=profit_amount,
        profit_pct=profit_pct,
        shares_remaining=shares_remaining,
    )
    db.add(sh)

    if body.sell_type == "full":
        holding.status = "inactive"
    else:
        holding.quantity = shares_remaining

    await db.commit()

    return {
        "sell_type": body.sell_type,
        "shares_sold": shares_sold,
        "shares_remaining": shares_remaining,
        "total_proceeds": total_proceeds,
        "profit_amount": profit_amount,
        "profit_pct": profit_pct,
        "cost_basis": cost_basis,
    }


@router.get("/{stock_id}/prices", response_model=list[PriceSnapshotResponse])
async def get_stock_prices(
    stock_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    result = await db.execute(
        select(Holding).where(Holding.id == stock_id, Holding.user_id == current_user.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    snaps = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.stock_id == stock_id)
        .order_by(PriceSnapshot.date.desc())
        .limit(30)
    )
    return snaps.scalars().all()


@router.get("/{stock_id}/history")
async def get_stock_history(
    stock_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return last 30 days price history from yfinance for charting."""
    result = await db.execute(
        select(Holding).where(Holding.id == stock_id, Holding.user_id == current_user.id)
    )
    holding = result.scalar_one_or_none()
    if holding is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    import asyncio
    from functools import partial
    import yfinance as yf

    def _fetch():
        t = yf.Ticker(holding.ticker)
        hist = t.history(period="30d")
        if hist.empty:
            return []
        return [
            {"date": str(idx.date()), "close": round(float(row["Close"]), 4)}
            for idx, row in hist.iterrows()
        ]

    loop = asyncio.get_event_loop()
    try:
        history = await loop.run_in_executor(None, _fetch)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch history: {e}")

    return {"ticker": holding.ticker, "history": history}
