from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BuyHistory(Base):
    __tablename__ = "buy_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"), index=True)
    source: Mapped[str] = mapped_column(String(20))  # 'alert' or 'manual'
    shares_bought: Mapped[float] = mapped_column(Numeric(12, 4))
    buy_price: Mapped[float] = mapped_column(Numeric(12, 4))
    total_cost: Mapped[float] = mapped_column(Numeric(12, 4))
    avg_cost_before: Mapped[float] = mapped_column(Numeric(12, 4))
    avg_cost_after: Mapped[float] = mapped_column(Numeric(12, 4))
    threshold_pct_before: Mapped[float] = mapped_column(Numeric(8, 4))
    threshold_pct_after: Mapped[float] = mapped_column(Numeric(8, 4))
    profit_pct_at_buy: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    bought_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
