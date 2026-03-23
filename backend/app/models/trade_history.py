from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BuyHistory(Base):
    __tablename__ = "buy_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    shares: Mapped[float] = mapped_column(Float)
    price_per_share: Mapped[float] = mapped_column(Float)
    total_amount: Mapped[float] = mapped_column(Float)
    purchased_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class SellHistory(Base):
    __tablename__ = "sell_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    shares: Mapped[float] = mapped_column(Float)
    price_per_share: Mapped[float] = mapped_column(Float)
    total_amount: Mapped[float] = mapped_column(Float)
    sold_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
