from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from config import settings
from constants import SYNC_DB_CONNECTION_STRING, ASYNC_DB_CONNECTION_STRING
from threading import Lock

def get_sync_engine(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return sync_engine

def get_async_engine(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=5, max_overflow=10)
    return async_engine

engineCache: dict[str, AsyncEngine] = {}
lock = Lock()

def asyncEngineFactory(codex: str) -> AsyncEngine:
    with lock:
        if codex not in engineCache:
            asyncCodexTetherSpell = settings.ASYNC_CODEX_TETHER_SPELL
            if not asyncCodexTetherSpell:
                print("Environment Variable ASYNC_CODEX_TETHER_SPELL Unavailable")
            tether = asyncCodexTetherSpell.format(codex=codex)
            engine = create_async_engine(
                tether,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=60,
                pool_timeout=10,
                pool_size=10,
                max_overflow=0
            )
            engineCache[codex] = engine
        return engineCache[codex]

def asyncSessionFactory(codex: str):
    engine = asyncEngineFactory(codex)
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def killEngines():
    for engine in engineCache.values():
        await engine.dispose()