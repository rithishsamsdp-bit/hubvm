from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from config import settings
from constants import SYNC_DB_CONNECTION_STRING, ASYNC_DB_CONNECTION_STRING, READER, WRITER_DB_CONNECTION_STRING, READER_DB_CONNECTION_STRING
from threading import Lock
from redis.asyncio import Redis

def get_sync_engine(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return sync_engine

def get_async_engine(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return async_engine

def get_async_writer_engine(database_name: str):
    connection_string = WRITER_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return async_engine

def get_async_reader_engine(database_name: str):
    connection_string = READER_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return async_engine

engineCache: dict[str, AsyncEngine] = {}
lock = Lock()

def asyncEngineFactory(codex: str) -> AsyncEngine:
    with lock:
        if codex not in engineCache:
            # Use Cluster Writer Endpoint for the primary factory
            asyncCodexTetherSpell = WRITER_DB_CONNECTION_STRING
            
            print(f"FORCING Cluster Tether Spell for {codex}: {asyncCodexTetherSpell}")
            
            tether = asyncCodexTetherSpell.format(db_name=codex, codex=codex)
            
            engine = create_async_engine(
                tether,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_timeout=30,
                pool_size=10,
                max_overflow=20
            )
            engineCache[codex] = engine
        return engineCache[codex]

def asyncSessionFactory(codex: str):
    engine = asyncEngineFactory(codex)
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def killEngines():
    for engine in engineCache.values():
        await engine.dispose()

# Redis Async Connection Start
redis_client: Redis | None = None

async def init_redis():
    global redis_client
    # redis_client = Redis(
    #     host="testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com",
    #     port=6379,
    #     decode_responses=True,
    #     socket_timeout=2,
    #     socket_connect_timeout=2,
    #     retry_on_timeout=True
    # )
    redis_client = Redis(
        host="testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com",
        port=6379,
        decode_responses=True,
        socket_timeout=1,
        socket_connect_timeout=1,
        max_connections=100
    )
    await redis_client.ping()

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None

def get_redis() -> Redis:
    if not redis_client:
        raise RuntimeError("Redis not initialized")
    return redis_client
# Redis Async Connection End