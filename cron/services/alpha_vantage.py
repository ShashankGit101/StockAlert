"""Fetch live quotes from Alpha Vantage, one ticker at a time with rate-limit delay."""

import asyncio
import logging
from dataclasses import dataclass

import httpx

from config import config

log = logging.getLogger(__name__)

_BASE = "https://www.alphavantage.co/query"


@dataclass
class Quote:
    ticker: str
    price: float


async def _fetch_one(client: httpx.AsyncClient, ticker: str) -> Quote | None:
    try:
        resp = await client.get(
            _BASE,
            params={
                "function": "GLOBAL_QUOTE",
                "symbol": ticker,
                "apikey": config.ALPHA_VANTAGE_API_KEY,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        log.warning("Failed to fetch quote for %s: %s", ticker, e)
        return None

    if "Information" in data:
        log.warning("Alpha Vantage rate limit hit while fetching %s", ticker)
        return None

    gq = data.get("Global Quote", {})
    price_str = gq.get("05. price")
    if not price_str:
        log.warning("No price in response for %s", ticker)
        return None

    return Quote(ticker=ticker, price=float(price_str))


async def fetch_quotes(tickers: list[str]) -> dict[str, float]:
    """Return {ticker: price} for every ticker that resolves successfully.
    Requests are serialised with a delay to stay within free-tier rate limits.
    """
    if not config.ALPHA_VANTAGE_API_KEY:
        log.error("ALPHA_VANTAGE_API_KEY is not set — skipping price fetch")
        return {}

    prices: dict[str, float] = {}
    async with httpx.AsyncClient() as client:
        for i, ticker in enumerate(tickers):
            if i > 0:
                await asyncio.sleep(config.AV_REQUEST_DELAY)
            quote = await _fetch_one(client, ticker)
            if quote:
                prices[quote.ticker] = quote.price
                log.debug("Quote %s = %.4f", quote.ticker, quote.price)

    return prices
