"""Market data endpoints — search and price lookup via yfinance."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.models.user import User
from app.services.stock_service import StockServiceError, get_quote, search

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

from pydantic import BaseModel


class SearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str
    currency: str
    current_price: float | None = None


class PriceResponse(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    currency: str
    exchange: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/search", response_model=list[SearchResult])
async def search_market(
    q: str = Query(..., min_length=1, max_length=50),
    market: str = Query("US", pattern="^(US|NSE)$"),
    _: User = Depends(get_current_user),
):
    """Search for stocks. market=US or market=NSE to filter results."""
    try:
        results = await search(q, market=market)
    except StockServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

    out = []
    for r in results:
        price = None
        try:
            q_data = await get_quote(r.ticker)
            price = q_data.price
        except Exception:
            pass
        out.append(
            SearchResult(
                ticker=r.ticker,
                name=r.name,
                exchange=r.exchange,
                currency=r.currency,
                current_price=price,
            )
        )
    return out


@router.get("/price/{ticker}", response_model=PriceResponse)
async def get_market_price(
    ticker: str,
    _: User = Depends(get_current_user),
):
    try:
        q = await get_quote(ticker.upper())
    except StockServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    return PriceResponse(
        ticker=q.ticker,
        price=q.price,
        change=q.change,
        change_percent=q.change_percent,
        currency=q.currency,
        exchange=q.exchange,
    )
