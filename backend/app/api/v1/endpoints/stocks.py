from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.stock_service import StockServiceError, get_quote, search

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class QuoteResponse(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float


class SearchResult(BaseModel):
    ticker: str
    name: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/quote/{ticker}", response_model=QuoteResponse)
async def get_stock_quote(
    ticker: str,
    _: User = Depends(get_current_user),
):
    try:
        quote = await get_quote(ticker)
    except StockServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    return QuoteResponse(
        ticker=quote.ticker,
        price=quote.price,
        change=quote.change,
        change_percent=quote.change_percent,
    )


@router.get("/search", response_model=list[SearchResult])
async def search_stocks(
    q: str = Query(..., min_length=1, max_length=50),
    _: User = Depends(get_current_user),
):
    try:
        results = await search(q)
    except StockServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    return [SearchResult(ticker=r.ticker, name=r.name) for r in results]
