from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PriceSnapshot(Base):
    """Point-in-time price recordings used by the cron and for charting."""

    __tablename__ = "price_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    price: Mapped[float] = mapped_column(Float)
    volume: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, default=lambda: datetime.now(timezone.utc)
    )
