from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from config import settings
from threading import Lock
import redis.asyncio as redis
from redis.asyncio import Redis

engineCache: dict[str, AsyncEngine] = {}
lock = Lock()

# MySQL Async Connection Start
def asyncEngineFactory(codex: str) -> AsyncEngine:
    with lock:
        if codex not in engineCache:
            asyncCodexTetherSpell = settings.ASYNC_CODEX_TETHER_SPELL
            if not asyncCodexTetherSpell:
                raise ValueError("Environment Variable ASYNC_CODEX_TETHER_SPELL Unavailable")
            tether = asyncCodexTetherSpell.format(codex=codex)
            engine = create_async_engine(
                tether,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=60,
                pool_timeout=10,
                pool_size=2,
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
# MySQL Async Connection End

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