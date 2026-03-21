"""Runtime configuration loaded from environment / .env file."""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL: str = os.environ["DATABASE_URL"]
    ALPHA_VANTAGE_API_KEY: str = os.environ.get("ALPHA_VANTAGE_API_KEY", "")
    EXPO_ACCESS_TOKEN: str = os.environ.get("EXPO_ACCESS_TOKEN", "")
    CHECK_INTERVAL_SECONDS: int = int(os.environ.get("CHECK_INTERVAL_SECONDS", "60"))
    # Seconds to wait between Alpha Vantage requests (free tier: 5 req/min)
    AV_REQUEST_DELAY: float = float(os.environ.get("AV_REQUEST_DELAY", "12.5"))


config = Config()
