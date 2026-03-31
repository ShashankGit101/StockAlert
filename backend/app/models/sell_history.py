from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SellHistory(Base):
    __tablename__ = "sell_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"), index=True)
    source: Mapped[str] = mapped_column(String(20))   # 'alert' or 'manual'
    sell_type: Mapped[str] = mapped_column(String(20))  # 'full' or 'partial'
    shares_sold: Mapped[float] = mapped_column(Numeric(12, 4))
    sell_price: Mapped[float] = mapped_column(Numeric(12, 4))
    total_proceeds: Mapped[float] = mapped_column(Numeric(12, 4))
    cost_basis: Mapped[float] = mapped_column(Numeric(12, 4))
    profit_amount: Mapped[float] = mapped_column(Numeric(12, 4))
    profit_pct: Mapped[float] = mapped_column(Numeric(8, 4))
    shares_remaining: Mapped[float] = mapped_column(Numeric(12, 4))
    sold_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
