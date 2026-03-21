"""Async SQLAlchemy engine and session factory for the cron process."""

from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import config

engine = create_async_engine(config.DATABASE_URL, pool_pre_ping=True)
_SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


@asynccontextmanager
async def get_session() -> AsyncSession:
    async with _SessionFactory() as session:
        yield session
