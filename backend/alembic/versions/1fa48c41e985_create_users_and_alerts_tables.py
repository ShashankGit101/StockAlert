"""create users and alerts tables

Revision ID: 1fa48c41e985
Revises: 
Create Date: 2026-03-21 12:53:23.452193

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1fa48c41e985'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("expo_push_token", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("target_price", sa.Float(), nullable=False),
        sa.Column(
            "direction",
            sa.Enum("above", "below", name="alertdirection"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("active", "triggered", "cancelled", name="alertstatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_alerts_user_id", "alerts", ["user_id"])
    op.create_index("ix_alerts_ticker", "alerts", ["ticker"])


def downgrade() -> None:
    op.drop_index("ix_alerts_ticker", "alerts")
    op.drop_index("ix_alerts_user_id", "alerts")
    op.drop_table("alerts")
    op.execute("DROP TYPE IF EXISTS alertstatus")
    op.execute("DROP TYPE IF EXISTS alertdirection")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
