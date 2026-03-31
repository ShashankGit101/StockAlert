from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    __table_args__ = (UniqueConstraint("stock_id", "date", name="uq_price_snapshots_stock_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    closing_price: Mapped[float] = mapped_column(Numeric(12, 4))
    profit_pct: Mapped[float] = mapped_column(Numeric(8, 4))
    avg_cost_at_close: Mapped[float] = mapped_column(Numeric(12, 4))
    daily_change_amt: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    daily_change_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
