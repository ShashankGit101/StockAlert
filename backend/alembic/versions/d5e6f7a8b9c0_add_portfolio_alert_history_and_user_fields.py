"""add portfolio_alert_history, price_snapshots, buy/sell_history rebuild, user fields

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-24 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users: add name, push_enabled, email_enabled ──────────────────────────
    op.add_column("users", sa.Column("name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default="false"))

    # ── Drop old incompatible buy_history, sell_history, price_snapshots ──────
    # These were created in a2b3c4d5e6f7 with a different schema.
    op.drop_index("ix_sell_history_ticker", table_name="sell_history")
    op.drop_index("ix_sell_history_user_id", table_name="sell_history")
    op.drop_table("sell_history")

    op.drop_index("ix_buy_history_ticker", table_name="buy_history")
    op.drop_index("ix_buy_history_user_id", table_name="buy_history")
    op.drop_table("buy_history")

    op.drop_index("ix_price_snapshots_recorded_at", table_name="price_snapshots")
    op.drop_index("ix_price_snapshots_ticker", table_name="price_snapshots")
    op.drop_table("price_snapshots")

    # ── portfolio_alert_state ──────────────────────────────────────────────────
    op.create_table(
        "portfolio_alert_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stock_id", sa.Integer(), sa.ForeignKey("holdings.id"), nullable=False, unique=True),
        sa.Column("zone", sa.String(20), nullable=False, server_default="pre_threshold"),
        sa.Column("current_rung_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("pending_rung_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("pending_rung_day1_date", sa.Date(), nullable=True),
        sa.Column("pending_close_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_alert_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_portfolio_alert_state_stock_id", "portfolio_alert_state", ["stock_id"])

    # ── portfolio_alert_history ────────────────────────────────────────────────
    op.create_table(
        "portfolio_alert_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stock_id", sa.Integer(), sa.ForeignKey("holdings.id"), nullable=False),
        sa.Column("alert_type", sa.String(30), nullable=False),
        sa.Column("rung_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("closing_price", sa.Numeric(12, 4), nullable=True),
        sa.Column("profit_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("user_action", sa.String(20), nullable=True),
        sa.Column("action_taken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_actionable", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "triggered_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_portfolio_alert_history_stock_id", "portfolio_alert_history", ["stock_id"])

    # ── price_snapshots (new schema) ───────────────────────────────────────────
    op.create_table(
        "price_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stock_id", sa.Integer(), sa.ForeignKey("holdings.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("closing_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("profit_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("avg_cost_at_close", sa.Numeric(12, 4), nullable=False),
        sa.Column("daily_change_amt", sa.Numeric(12, 4), nullable=True),
        sa.Column("daily_change_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("stock_id", "date", name="uq_price_snapshots_stock_date"),
    )
    op.create_index("ix_price_snapshots_stock_id", "price_snapshots", ["stock_id"])

    # ── buy_history (new schema) ───────────────────────────────────────────────
    op.create_table(
        "buy_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stock_id", sa.Integer(), sa.ForeignKey("holdings.id"), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("shares_bought", sa.Numeric(12, 4), nullable=False),
        sa.Column("buy_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("total_cost", sa.Numeric(12, 4), nullable=False),
        sa.Column("avg_cost_before", sa.Numeric(12, 4), nullable=False),
        sa.Column("avg_cost_after", sa.Numeric(12, 4), nullable=False),
        sa.Column("threshold_pct_before", sa.Numeric(8, 4), nullable=False),
        sa.Column("threshold_pct_after", sa.Numeric(8, 4), nullable=False),
        sa.Column("profit_pct_at_buy", sa.Numeric(8, 4), nullable=True),
        sa.Column(
            "bought_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_buy_history_stock_id", "buy_history", ["stock_id"])

    # ── sell_history (new schema) ──────────────────────────────────────────────
    op.create_table(
        "sell_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stock_id", sa.Integer(), sa.ForeignKey("holdings.id"), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("sell_type", sa.String(20), nullable=False),
        sa.Column("shares_sold", sa.Numeric(12, 4), nullable=False),
        sa.Column("sell_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("total_proceeds", sa.Numeric(12, 4), nullable=False),
        sa.Column("cost_basis", sa.Numeric(12, 4), nullable=False),
        sa.Column("profit_amount", sa.Numeric(12, 4), nullable=False),
        sa.Column("profit_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("shares_remaining", sa.Numeric(12, 4), nullable=False),
        sa.Column(
            "sold_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_sell_history_stock_id", "sell_history", ["stock_id"])


def downgrade() -> None:
    op.drop_index("ix_sell_history_stock_id", "sell_history")
    op.drop_table("sell_history")
    op.drop_index("ix_buy_history_stock_id", "buy_history")
    op.drop_table("buy_history")
    op.drop_index("ix_price_snapshots_stock_id", "price_snapshots")
    op.drop_table("price_snapshots")
    op.drop_index("ix_portfolio_alert_history_stock_id", "portfolio_alert_history")
    op.drop_table("portfolio_alert_history")
    op.drop_index("ix_portfolio_alert_state_stock_id", "portfolio_alert_state")
    op.drop_table("portfolio_alert_state")
    op.drop_column("users", "email_enabled")
    op.drop_column("users", "push_enabled")
    op.drop_column("users", "name")
