from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AlertDirection(str, Enum):
    above = "above"
    below = "below"


class AlertStatus(str, Enum):
    active = "active"
    triggered = "triggered"
    cancelled = "cancelled"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    target_price: Mapped[float] = mapped_column(Float)
    direction: Mapped[AlertDirection]
    status: Mapped[AlertStatus] = mapped_column(default=AlertStatus.active)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
