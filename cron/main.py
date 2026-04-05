"""StockAlert cron — entry point.

Starts the APScheduler and registers periodic jobs:

  check_alerts          — interval-based, checks price-target alerts every N seconds
  portfolio_close_us    — cron: 16:30 America/New_York  (US market close)
  portfolio_close_nse   — cron: 16:00 Asia/Kolkata      (NSE market close)
"""

import asyncio
import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from jobs.check_alerts import check_alerts
from jobs.run_portfolio_close import run_portfolio_close

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL_SECONDS", "60"))


async def main() -> None:
    scheduler = AsyncIOScheduler()

    # ── Existing price-target alert job ───────────────────────────────────────
    scheduler.add_job(
        check_alerts,
        "interval",
        seconds=CHECK_INTERVAL,
        id="check_alerts",
    )

    # ── Portfolio close jobs ───────────────────────────────────────────────────
    scheduler.add_job(
        run_portfolio_close,
        CronTrigger(hour=16, minute=30, timezone="America/New_York"),
        args=["US"],
        id="portfolio_close_us",
    )
    scheduler.add_job(
        run_portfolio_close,
        CronTrigger(hour=16, minute=0, timezone="Asia/Kolkata"),
        args=["NSE"],
        id="portfolio_close_nse",
    )

    scheduler.start()
    log.info(
        "Scheduler started — check_alerts every %ds, "
        "portfolio close at 16:30 ET (US) and 16:00 IST (NSE)",
        CHECK_INTERVAL,
    )

    try:
        await asyncio.Event().wait()  # run forever
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        log.info("Scheduler stopped")


if __name__ == "__main__":
    asyncio.run(main())
