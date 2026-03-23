from fastapi import APIRouter

from app.api.v1.endpoints import auth, alerts, holdings, stocks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(holdings.router, prefix="/holdings", tags=["holdings"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
