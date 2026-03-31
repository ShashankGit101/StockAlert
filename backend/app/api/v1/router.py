from fastapi import APIRouter

from app.api.v1.endpoints import auth, alerts, holdings, stocks
from app.api.v1.endpoints import portfolio, market, alert_history, user

api_router = APIRouter()

# Legacy endpoints (kept for backward compat)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(alerts.router, prefix="/alerts-legacy", tags=["alerts-legacy"])
api_router.include_router(holdings.router, prefix="/holdings", tags=["holdings"])
api_router.include_router(stocks.router, prefix="/stocks-market", tags=["market-legacy"])

# New spec endpoints
api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(market.router, prefix="/market", tags=["market"])
api_router.include_router(portfolio.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(alert_history.router, prefix="/alerts", tags=["alerts"])
