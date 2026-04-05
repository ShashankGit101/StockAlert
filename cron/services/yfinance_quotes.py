"""Fetch end-of-day closing prices via yfinance (no API key required).

yfinance is synchronous, so every call is dispatched to a thread-pool
executor so it does not block the async event loop.
"""

import asyncio
import logging
from functools import partial

import yfinance as yf

log = logging.getLogger(__name__)


def _sync_fetch_close(ticker: str) -> tuple[float, float | None, float | None]:
    """
    Fetch the most recent closing price plus the daily change figures.

    Returns:
        (close_price, daily_change_amt, daily_change_pct)

    Raises:
        ValueError: if yfinance returns no data for the ticker.
    """
    hist = yf.Ticker(ticker).history(period="2d", interval="1d")

    if hist.empty:
        raise ValueError(f"No history returned for {ticker!r}")

    close = round(float(hist["Close"].iloc[-1]), 4)

    daily_change_amt: float | None = None
    daily_change_pct: float | None = None
    if len(hist) >= 2:
        prev = float(hist["Close"].iloc[-2])
        if prev:
            daily_change_amt = round(close - prev, 4)
            daily_change_pct = round((close - prev) / prev * 100, 4)

    log.debug("yfinance close for %s: %.4f (Δ %s)", ticker, close, daily_change_amt)
    return close, daily_change_amt, daily_change_pct


async def fetch_closing_price(ticker: str) -> tuple[float, float | None, float | None]:
    """Async wrapper — runs _sync_fetch_close in a thread-pool executor."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_sync_fetch_close, ticker))
