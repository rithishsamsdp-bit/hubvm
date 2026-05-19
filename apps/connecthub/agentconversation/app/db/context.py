from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from motor.motor_asyncio import AsyncIOMotorClient
from constants import ASYNC_DB_CONNECTION_STRING, ASYNC_DB2_CONNECTION_STRING
from config import settings
from threading import Lock
from redis.asyncio import Redis

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
                pool_size=2,
                max_overflow=0,
                connect_args={"charset": "utf8mb4"}
            )
            engineCache[codex] = engine
        return engineCache[codex]

def asyncSessionFactory(codex: str):
    engine = asyncEngineFactory(codex)
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def killEngines():
    for engine in engineCache.values():
        await engine.dispose()

if not ASYNC_DB_CONNECTION_STRING:
    raise Exception("DB connection string not provided")

if not ASYNC_DB2_CONNECTION_STRING:
    raise Exception("DB connection string not provided")

def get_async_engine(database_name: str):
    connection_string = ASYNC_DB_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20, connect_args={"charset": "utf8mb4"})
    return async_engine

def get_async_engine_db2(database_name: str):
    connection_string = ASYNC_DB2_CONNECTION_STRING.format(db_name=database_name)
    async_engine = create_async_engine(connection_string, echo=False, pool_pre_ping=True, pool_recycle=3600, pool_size=10, max_overflow=20, connect_args={"charset": "utf8mb4"})
    return async_engine

def asyncClientFactory(codex: str):
    MONGO_URI = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[codex]
    return client, db

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

def get_redis() -> Redis | None:
    return redis_client
# Redis Async Connection End