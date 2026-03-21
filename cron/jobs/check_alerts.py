"""Job: fetch current prices and trigger alerts whose thresholds are met."""

import logging
import os

import httpx

log = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:8000")


async def check_alerts() -> None:
    """
    1. Pull all active alerts from the DB (via backend internal API or direct DB query).
    2. Batch-fetch current prices for unique tickers.
    3. Evaluate each alert against the current price.
    4. Fire push notifications and mark triggered alerts.
    """
    log.info("Running alert check...")
    # TODO: implement full alert-check pipeline
    log.info("Alert check complete")
