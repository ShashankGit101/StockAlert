"""Minimal ORM models — mirrors the backend schema, only the columns the cron needs."""

from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String
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
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(255))
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
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


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    ticker: Mapped[str] = mapped_column(String(10))
    company_name: Mapped[str] = mapped_column(String(255))
    market: Mapped[str] = mapped_column(String(10))   # "US" | "NSE"
    currency: Mapped[str] = mapped_column(String(3))   # "USD" | "INR"
    original_cost: Mapped[float] = mapped_column(Float)
    avg_cost: Mapped[float] = mapped_column(Float)
    quantity: Mapped[float] = mapped_column(Float)
    threshold_pct: Mapped[float] = mapped_column(Float)
    threshold_profit_price: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20))


class PortfolioAlertState(Base):
    __tablename__ = "portfolio_alert_state"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"), unique=True)
    zone: Mapped[str] = mapped_column(String(20), default="pre_threshold")
    current_rung_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    pending_rung_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    pending_rung_day1_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    pending_close_count: Mapped[int] = mapped_column(Integer, default=0)


class PortfolioAlertHistory(Base):
    __tablename__ = "portfolio_alert_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"))
    alert_type: Mapped[str] = mapped_column(String(30))
    rung_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    closing_price: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    profit_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    is_actionable: Mapped[bool] = mapped_column(Boolean, default=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"))
    date: Mapped[date] = mapped_column(Date)
    closing_price: Mapped[float] = mapped_column(Numeric(12, 4))
    profit_pct: Mapped[float] = mapped_column(Numeric(8, 4))
    avg_cost_at_close: Mapped[float] = mapped_column(Numeric(12, 4))
    daily_change_amt: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    daily_change_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
