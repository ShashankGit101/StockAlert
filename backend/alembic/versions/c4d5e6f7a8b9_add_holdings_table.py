"""add holdings table

Revision ID: c4d5e6f7a8b9
Revises: a2b3c4d5e6f7
Create Date: 2026-03-23 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "holdings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("market", sa.String(10), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("original_cost", sa.Float(), nullable=False),
        sa.Column("avg_cost", sa.Float(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("threshold_pct", sa.Float(), nullable=False),
        sa.Column("threshold_profit_price", sa.Float(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_holdings_user_id", "holdings", ["user_id"])
    op.create_index("ix_holdings_ticker", "holdings", ["ticker"])


def downgrade() -> None:
    op.drop_index("ix_holdings_ticker", "holdings")
    op.drop_index("ix_holdings_user_id", "holdings")
    op.drop_table("holdings")
