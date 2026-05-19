from sqlalchemy import create_engine
from constants import SYNC_DB_CONNECTION_STRING
from constants import ASYNC_DB_CONNECTION_STRING, ASYNC_DB_CONNECTION_STRINGO, ASYNC_DB2_CONNECTION_STRING
import redis.asyncio as redis

from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis
from config import settings
from threading import Lock

# MySQL Async Connection Start
engineCache: dict[str, AsyncEngine] = {}
sessionFactoryCache: dict[str, sessionmaker] = {}
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
                pool_recycle=3600,
                pool_timeout=30,
                pool_size=10,
                max_overflow=5
            )
            engineCache[codex] = engine
        return engineCache[codex]

def asyncSessionFactory(codex: str):
    engine = asyncEngineFactory(codex)
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def killEngines():
    for engine in engineCache.values():
        await engine.dispose()
# MySQL Async Connection End

# MongoDB Async Connection Start
mongo_client: AsyncIOMotorClient | None = None
mongo_db_cache: dict[str, any] = {}

def asyncClientFactory(codex: str):
    global mongo_client
    if mongo_client is None:
        MONGO_URI = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"
        # Increase pool size and timeout for better resilience
        mongo_client = AsyncIOMotorClient(
            MONGO_URI,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000
        )
    
    if codex not in mongo_db_cache:
        mongo_db_cache[codex] = mongo_client[codex]
        
    return mongo_client, mongo_db_cache[codex]
# MongoDB Async Connection End

# Redis Async Connection Start
redis_client: Redis | None = None

async def init_redis():
    global redis_client
    redis_client = Redis(
        host="testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com",
        port=6379,
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
        retry_on_timeout=True
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



def get_sync_session_maker(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600)
    return sessionmaker(bind=sync_engine, expire_on_commit=False)

# Dynamic Async Engine
def get_async_session_maker(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string,pool_size=10,max_overflow=20,pool_pre_ping=True)
    return sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

""" New Updated Database Connection, Kindly Use Below """

def get_sync_engine(database_name: str):
    connection_string = SYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    sync_engine = create_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return sync_engine

def get_async_engine(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return async_engine

def get_async_engineO(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRINGO.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return async_engine

def get_async_engine_db2(database_name: str):
    connection_string = ASYNC_DB2_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20)
    return async_engine

def get_redis_client_by_db(db: int = 0):
    return redis.Redis(
        host='testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com',
        port=6379,
        decode_responses=True,  # This ensures that binary data is decoded
    )