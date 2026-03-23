from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    market: Mapped[str] = mapped_column(String(10))          # "US" or "NSE"
    currency: Mapped[str] = mapped_column(String(3))          # "USD" or "INR"
    original_cost: Mapped[float] = mapped_column(Float)       # purchase price, never changes
    avg_cost: Mapped[float] = mapped_column(Float)            # starts = original_cost
    quantity: Mapped[float] = mapped_column(Float)
    purchase_date: Mapped[date] = mapped_column(Date)
    threshold_pct: Mapped[float] = mapped_column(Float)
    threshold_profit_price: Mapped[float] = mapped_column(Float)  # original_cost * (1 + pct/100)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
