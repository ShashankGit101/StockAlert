import re
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Load app config & models so autogenerate can see the metadata
from app.core.config import settings
from app.core.database import Base
import app.models.user  # noqa: F401
import app.models.alert  # noqa: F401
import app.models.stock  # noqa: F401
import app.models.alert_state  # noqa: F401
import app.models.alert_history  # noqa: F401
import app.models.holding  # noqa: F401
import app.models.portfolio_alert_state  # noqa: F401
import app.models.portfolio_alert_history  # noqa: F401
import app.models.price_snapshot  # noqa: F401
import app.models.buy_history  # noqa: F401
import app.models.sell_history  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point autogenerate at our models
target_metadata = Base.metadata

# Build a synchronous psycopg2 URL from the asyncpg URL.
# psycopg2 does NOT use prepared statements the same way, so it is safe
# with PgBouncer transaction-mode pooling (no DuplicatePreparedStatementError).
_raw = settings.DATABASE_URL
# strip +asyncpg driver tag: postgresql+asyncpg:// → postgresql://
_sync_url = re.sub(r"postgresql\+asyncpg://", "postgresql://", _raw)
config.set_main_option("sqlalchemy.url", _sync_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"sslmode": "require"},
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
