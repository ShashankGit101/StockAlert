"""add stocks, alert_state, alert_history, price_snapshots, buy/sell history tables

Revision ID: a2b3c4d5e6f7
Revises: 1fa48c41e985
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "1fa48c41e985"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── stocks ────────────────────────────────────────────────────────────────
    op.create_table(
        "stocks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("exchange", sa.String(50), nullable=True),
        sa.Column("sector", sa.String(100), nullable=True),
        sa.Column("last_price", sa.Float(), nullable=True),
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("ticker", name="uq_stocks_ticker"),
    )
    op.create_index("ix_stocks_ticker", "stocks", ["ticker"])

    # ── alert_state ───────────────────────────────────────────────────────────
    op.create_table(
        "alert_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "alert_id",
            sa.Integer(),
            sa.ForeignKey("alerts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("last_price_checked", sa.Float(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("alert_id", name="uq_alert_state_alert_id"),
    )
    op.create_index("ix_alert_state_alert_id", "alert_state", ["alert_id"])

    # ── alert_history ─────────────────────────────────────────────────────────
    op.create_table(
        "alert_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "alert_id",
            sa.Integer(),
            sa.ForeignKey("alerts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("price_at_trigger", sa.Float(), nullable=False),
        sa.Column("notification_sent", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "triggered_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_alert_history_alert_id", "alert_history", ["alert_id"])
    op.create_index("ix_alert_history_user_id", "alert_history", ["user_id"])
    op.create_index("ix_alert_history_ticker", "alert_history", ["ticker"])

    # ── price_snapshots ───────────────────────────────────────────────────────
    op.create_table(
        "price_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_price_snapshots_ticker", "price_snapshots", ["ticker"])
    op.create_index("ix_price_snapshots_recorded_at", "price_snapshots", ["recorded_at"])

    # ── buy_history ───────────────────────────────────────────────────────────
    op.create_table(
        "buy_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("shares", sa.Float(), nullable=False),
        sa.Column("price_per_share", sa.Float(), nullable=False),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column(
            "purchased_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_buy_history_user_id", "buy_history", ["user_id"])
    op.create_index("ix_buy_history_ticker", "buy_history", ["ticker"])

    # ── sell_history ──────────────────────────────────────────────────────────
    op.create_table(
        "sell_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("shares", sa.Float(), nullable=False),
        sa.Column("price_per_share", sa.Float(), nullable=False),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column(
            "sold_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_sell_history_user_id", "sell_history", ["user_id"])
    op.create_index("ix_sell_history_ticker", "sell_history", ["ticker"])


def downgrade() -> None:
    op.drop_index("ix_sell_history_ticker", "sell_history")
    op.drop_index("ix_sell_history_user_id", "sell_history")
    op.drop_table("sell_history")

    op.drop_index("ix_buy_history_ticker", "buy_history")
    op.drop_index("ix_buy_history_user_id", "buy_history")
    op.drop_table("buy_history")

    op.drop_index("ix_price_snapshots_recorded_at", "price_snapshots")
    op.drop_index("ix_price_snapshots_ticker", "price_snapshots")
    op.drop_table("price_snapshots")

    op.drop_index("ix_alert_history_ticker", "alert_history")
    op.drop_index("ix_alert_history_user_id", "alert_history")
    op.drop_index("ix_alert_history_alert_id", "alert_history")
    op.drop_table("alert_history")

    op.drop_index("ix_alert_state_alert_id", "alert_state")
    op.drop_table("alert_state")

    op.drop_index("ix_stocks_ticker", "stocks")
    op.drop_table("stocks")
