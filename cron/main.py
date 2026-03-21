"""StockAlert cron — entry point.

Starts the APScheduler and registers periodic jobs.
"""

import asyncio
import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

from jobs.check_alerts import check_alerts

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL_SECONDS", "60"))


async def main() -> None:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_alerts, "interval", seconds=CHECK_INTERVAL, id="check_alerts")
    scheduler.start()
    log.info("Scheduler started — checking alerts every %ds", CHECK_INTERVAL)
    try:
        await asyncio.Event().wait()  # run forever
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        log.info("Scheduler stopped")


if __name__ == "__main__":
    asyncio.run(main())
