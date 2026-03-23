from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AlertHistory(Base):
    """Log of every alert that has been triggered."""

    __tablename__ = "alert_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    price_at_trigger: Mapped[float] = mapped_column(Float)
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
