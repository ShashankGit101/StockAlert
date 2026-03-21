"""Stock data via Alpha Vantage REST API with a simple in-process TTL cache."""

import time
from dataclasses import dataclass, field

import httpx

from app.core.config import settings

_BASE = "https://www.alphavantage.co/query"

# ── TTL cache ─────────────────────────────────────────────────────────────────
# Keyed by (function, arg). Quotes are cached 60 s; search results 5 min.

@dataclass
class _Entry:
    value: dict | list
    expires_at: float


_cache: dict[tuple, _Entry] = {}


def _get(key: tuple):
    entry = _cache.get(key)
    if entry and time.monotonic() < entry.expires_at:
        return entry.value
    return None


def _set(key: tuple, value, ttl: float):
    _cache[key] = _Entry(value=value, expires_at=time.monotonic() + ttl)


# ── Helpers ───────────────────────────────────────────────────────────────────

class StockServiceError(Exception):
    """Raised for provider errors that should surface as HTTP errors."""
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


async def _get_json(params: dict) -> dict:
    if not settings.ALPHA_VANTAGE_API_KEY:
        raise StockServiceError("Stock data API key is not configured", status_code=503)
    params["apikey"] = settings.ALPHA_VANTAGE_API_KEY
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.get(_BASE, params=params)
            response.raise_for_status()
        except httpx.TimeoutException:
            raise StockServiceError("Stock data provider timed out", status_code=504)
        except httpx.HTTPStatusError as e:
            raise StockServiceError(f"Stock data provider error: {e.response.status_code}")
    data = response.json()
    if "Information" in data:
        # Alpha Vantage rate-limit message
        raise StockServiceError("Stock data rate limit reached, please try again shortly", status_code=429)
    if "Error Message" in data:
        raise StockServiceError(data["Error Message"], status_code=404)
    return data


# ── Public API ────────────────────────────────────────────────────────────────

@dataclass
class Quote:
    ticker: str
    price: float
    change: float
    change_percent: float


async def get_quote(ticker: str) -> Quote:
    ticker = ticker.upper()
    cache_key = ("GLOBAL_QUOTE", ticker)

    cached = _get(cache_key)
    if cached:
        return Quote(**cached)

    data = await _get_json({"function": "GLOBAL_QUOTE", "symbol": ticker})
    gq = data.get("Global Quote", {})

    if not gq or not gq.get("05. price"):
        raise StockServiceError(f"No quote found for '{ticker}'", status_code=404)

    price = float(gq["05. price"])
    change = float(gq["09. change"])
    change_pct_str = gq["10. change percent"].rstrip("%")
    change_percent = float(change_pct_str)

    result = {"ticker": ticker, "price": price, "change": change, "change_percent": change_percent}
    _set(cache_key, result, ttl=60)
    return Quote(**result)


@dataclass
class SearchResult:
    ticker: str
    name: str


async def search(query: str) -> list[SearchResult]:
    cache_key = ("SYMBOL_SEARCH", query.lower())

    cached = _get(cache_key)
    if cached:
        return [SearchResult(**r) for r in cached]

    data = await _get_json({"function": "SYMBOL_SEARCH", "keywords": query})
    matches = data.get("bestMatches", [])

    results = [
        {"ticker": m["1. symbol"], "name": m["2. name"]}
        for m in matches
    ]
    _set(cache_key, results, ttl=300)
    return [SearchResult(**r) for r in results]
