from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PortfolioAlertHistory(Base):
    __tablename__ = "portfolio_alert_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("holdings.id"), index=True)
    alert_type: Mapped[str] = mapped_column(String(30))
    rung_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    closing_price: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    profit_pct: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    user_action: Mapped[str | None] = mapped_column(String(20), nullable=True)
    action_taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_actionable: Mapped[bool] = mapped_column(Boolean, default=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
