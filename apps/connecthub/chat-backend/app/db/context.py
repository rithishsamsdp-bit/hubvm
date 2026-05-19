# db/context.py — Async MySQL engine factory (identical pattern to all other services)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from config import settings
from threading import Lock

engineCache: dict[str, AsyncEngine] = {}
lock = Lock()

def asyncEngineFactory(codex: str) -> AsyncEngine:
    """Return (or create) a cached async engine for the given DB name."""
    with lock:
        if codex not in engineCache:
            spell = settings.ASYNC_CODEX_TETHER_SPELL
            tether = spell.format(codex=codex)
            engine = create_async_engine(
                tether,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=60,
                pool_timeout=10,
                pool_size=2,
                max_overflow=0,
            )
            engineCache[codex] = engine
        return engineCache[codex]

def asyncSessionFactory(codex: str):
    """Return an async sessionmaker bound to the given DB."""
    engine = asyncEngineFactory(codex)
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def killEngines():
    """Dispose all cached engines on shutdown."""
    for engine in engineCache.values():
        await engine.dispose()

# Convenience: pre-built session factory for the chat DB
def get_chat_session():
    return asyncSessionFactory(settings.CHAT_DB_NAME)

# ──────────────────────────────────────────────────────────────────────────────
# MongoDB Async Connection for Messages
# ──────────────────────────────────────────────────────────────────────────────
from motor.motor_asyncio import AsyncIOMotorClient

mongo_client: AsyncIOMotorClient | None = None
mongo_dbCache: dict[str, any] = {}

def get_mongo_db():
    """Return the configured Motor database instance for chats."""
    global mongo_client
    if mongo_client is None:
        mongo_client = AsyncIOMotorClient(
            settings.MONGO_URI,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000
        )
    
    db_name = settings.MONGO_DB_NAME
    if db_name not in mongo_dbCache:
        mongo_dbCache[db_name] = mongo_client[db_name]
    
    return mongo_dbCache[db_name]
