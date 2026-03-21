"""Fetches stock quotes from external data provider."""

import httpx

from app.core.config import settings


async def get_quote(ticker: str) -> dict:
    """Return price data for a single ticker."""
    # TODO: implement Alpha Vantage / Polygon integration
    raise NotImplementedError


async def search(query: str) -> list[dict]:
    """Search for tickers matching a query string."""
    # TODO: implement symbol search
    raise NotImplementedError
