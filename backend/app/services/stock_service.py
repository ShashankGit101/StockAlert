"""Stock data via yfinance — no API key required.

All yfinance calls are synchronous so we run them in a thread-pool executor
to avoid blocking the async event loop.
"""

import asyncio
import time
from dataclasses import dataclass
from functools import partial

import yfinance as yf

# ── TTL in-process cache ───────────────────────────────────────────────────────

@dataclass
class _Entry:
    value: object
    expires_at: float


_cache: dict[str, _Entry] = {}


def _cache_get(key: str):
    e = _cache.get(key)
    if e and time.monotonic() < e.expires_at:
        return e.value
    return None


def _cache_set(key: str, value, ttl: float):
    _cache[key] = _Entry(value=value, expires_at=time.monotonic() + ttl)


# ── Helpers ────────────────────────────────────────────────────────────────────

class StockServiceError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


async def _in_thread(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(fn, *args))


def _exchange_label(symbol: str, yf_exchange: str) -> str:
    if symbol.endswith(".NS") or yf_exchange in ("NSI", "NSE", "BSE"):
        return "NSE"
    if yf_exchange in ("NMS", "NGM", "NCM", "NAS"):
        return "NASDAQ"
    return "NYSE"


def _currency_for_exchange(exchange: str) -> str:
    return "INR" if exchange == "NSE" else "USD"


# ── Public types ───────────────────────────────────────────────────────────────

@dataclass
class Quote:
    ticker: str
    price: float
    change: float
    change_percent: float
    currency: str
    exchange: str


@dataclass
class SearchResult:
    ticker: str
    name: str
    exchange: str
    currency: str


# ── Quote ──────────────────────────────────────────────────────────────────────

def _fetch_quote(ticker: str) -> Quote:
    t = yf.Ticker(ticker)
    info = t.info

    price = (
        info.get("currentPrice")
        or info.get("regularMarketPrice")
        or info.get("previousClose")
    )
    if not price:
        raise StockServiceError(f"No quote found for '{ticker}'", status_code=404)

    prev = info.get("previousClose") or info.get("regularMarketPreviousClose") or price
    change = round(price - prev, 4)
    change_pct = round((change / prev) * 100, 4) if prev else 0.0

    yf_exchange = info.get("exchange", "")
    exchange = _exchange_label(ticker, yf_exchange)
    currency = info.get("currency") or _currency_for_exchange(exchange)

    return Quote(
        ticker=ticker.upper(),
        price=round(price, 4),
        change=change,
        change_percent=change_pct,
        currency=currency,
        exchange=exchange,
    )


async def get_quote(ticker: str) -> Quote:
    ticker = ticker.upper()
    key = f"quote:{ticker}"
    cached = _cache_get(key)
    if cached:
        return cached

    try:
        result = await _in_thread(_fetch_quote, ticker)
    except StockServiceError:
        raise
    except Exception as e:
        raise StockServiceError(f"Failed to fetch quote for '{ticker}': {e}")

    _cache_set(key, result, ttl=60)
    return result


# ── Search ─────────────────────────────────────────────────────────────────────

def _fetch_search(query: str) -> list[SearchResult]:
    results: list[SearchResult] = []
    seen: set[str] = set()

    # 1. yfinance Search API (covers US + international)
    try:
        s = yf.Search(query, max_results=8)
        for q in (s.quotes or []):
            symbol: str = q.get("symbol", "")
            if not symbol or symbol in seen:
                continue
            name = q.get("longname") or q.get("shortname") or symbol
            yf_exchange = q.get("exchange", "")
            exchange = _exchange_label(symbol, yf_exchange)
            currency = _currency_for_exchange(exchange)
            results.append(SearchResult(ticker=symbol, name=name, exchange=exchange, currency=currency))
            seen.add(symbol)
    except Exception:
        pass

    # 2. Explicit NSE probe — try <QUERY>.NS directly
    ns_sym = query.upper().split(".")[0] + ".NS"
    if ns_sym not in seen:
        try:
            info = yf.Ticker(ns_sym).info
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            if price:
                name = info.get("longName") or info.get("shortName") or ns_sym
                results.append(SearchResult(ticker=ns_sym, name=name, exchange="NSE", currency="INR"))
                seen.add(ns_sym)
        except Exception:
            pass

    return results


async def search(query: str) -> list[SearchResult]:
    key = f"search:{query.lower()}"
    cached = _cache_get(key)
    if cached:
        return cached

    try:
        results = await _in_thread(_fetch_search, query)
    except Exception as e:
        raise StockServiceError(f"Search failed: {e}")

    _cache_set(key, results, ttl=300)
    return results
