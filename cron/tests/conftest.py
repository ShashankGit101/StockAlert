import os
import sys

# Ensure cron root is on the path for bare imports (db, config, models, etc.)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Provide minimal env vars so config.py can instantiate without a real .env
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("ALPHA_VANTAGE_API_KEY", "test_key")
os.environ.setdefault("EXPO_ACCESS_TOKEN", "test_expo_token")
