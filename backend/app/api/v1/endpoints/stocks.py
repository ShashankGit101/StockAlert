from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.stock_service import StockServiceError, get_quote, search

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class QuoteResponse(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    currency: str
    exchange: str


class SearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str
    currency: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

# Add these new "doors" so the frontend can find them!

@router.get("/", response_model=list[Stock]) # This matches stocksApi.list
async def list_stocks(
    _: User = Depends(get_current_user),
):
    # This is where your app would normally fetch stocks from your database
    # For now, it just needs to exist so the app doesn't crash
    return [] 

@router.get("/{id}", response_model=Stock) # This matches stocksApi.get
async def get_stock_by_id(
    id: int,
    _: User = Depends(get_current_user),
):
    # Logic to get a single stock by its ID
    pass

@router.get("/quote/{ticker}", response_model=QuoteResponse)
async def get_stock_quote(
    ticker: str,
    _: User = Depends(get_current_user),
):
    try:
        q = await get_quote(ticker)
    except StockServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    return QuoteResponse(
        ticker=q.ticker,
        price=q.price,
        change=q.change,
        change_percent=q.change_percent,
        currency=q.currency,
        exchange=q.exchange,
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
    return [
        SearchResult(ticker=r.ticker, name=r.name, exchange=r.exchange, currency=r.currency)
        for r in results
    ]
