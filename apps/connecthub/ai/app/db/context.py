"""
DB Context — mirrors agentconversation/app/db/context.py
Provides async SQLAlchemy engine and session factory for MySQL (AWS RDS).
"""
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings
from threading import Lock

engineCache: dict[str, AsyncEngine] = {}
_lock = Lock()


def get_async_engine() -> AsyncEngine:
    """Returns (and caches) the async SQLAlchemy engine for MySQL."""
    with _lock:
        if "default" not in engineCache:
            engine = create_async_engine(
                settings.DATABASE_URL,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=60,
                pool_size=2,
                max_overflow=0,
                connect_args={"charset": "utf8mb4"},
            )
            engineCache["default"] = engine
    return engineCache["default"]


def asyncSessionFactory() -> sessionmaker:
    engine = get_async_engine()
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    Session = asyncSessionFactory()
    async with Session() as session:
        yield session


async def killEngines():
    for engine in engineCache.values():
        await engine.dispose()


class Base(DeclarativeBase):
    pass
