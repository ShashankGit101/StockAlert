"""Minimal ORM models — mirrors the backend schema, only the columns the cron needs."""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class AlertStatus(str, Enum):
    active = "active"
    triggered = "triggered"
    cancelled = "cancelled"


class AlertDirection(str, Enum):
    above = "above"
    below = "below"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    expo_push_token: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    ticker: Mapped[str] = mapped_column(String(10))
    target_price: Mapped[float] = mapped_column(Float)
    direction: Mapped[AlertDirection]
    status: Mapped[AlertStatus]
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
