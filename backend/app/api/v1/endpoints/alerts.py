from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import AlertDirection

router = APIRouter()


class CreateAlertRequest(BaseModel):
    ticker: str
    target_price: float
    direction: AlertDirection


class AlertResponse(BaseModel):
    id: int
    ticker: str
    target_price: float
    direction: AlertDirection
    status: str


@router.get("/", response_model=list[AlertResponse])
async def list_alerts(db: AsyncSession = Depends(get_db)):
    # TODO: return alerts for authenticated user
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(body: CreateAlertRequest, db: AsyncSession = Depends(get_db)):
    # TODO: create alert for authenticated user
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    # TODO: cancel alert for authenticated user
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
