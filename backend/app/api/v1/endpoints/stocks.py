from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

router = APIRouter()


class QuoteResponse(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float


class SearchResult(BaseModel):
    ticker: str
    name: str


@router.get("/quote/{ticker}", response_model=QuoteResponse)
async def get_quote(ticker: str):
    # TODO: fetch live quote from data provider
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/search", response_model=list[SearchResult])
async def search_stocks(q: str = Query(..., min_length=1)):
    # TODO: search tickers/company names
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
