from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PortfolioAlertState(Base):
    __tablename__ = "portfolio_alert_state"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"), unique=True, index=True)
    zone: Mapped[str] = mapped_column(String(20), default="pre_threshold")
    current_rung_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    pending_rung_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    pending_rung_day1_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    pending_close_count: Mapped[int] = mapped_column(Integer, default=0)
    last_alert_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
