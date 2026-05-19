from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from config import settings
from threading import Lock

engineCache: dict[str, AsyncEngine] = {}
lock = Lock()

def asyncEngineFactory(codex: str) -> AsyncEngine:
    with lock:
        print(codex)
        if codex not in engineCache:
            asyncCodexTetherSpell = settings.ASYNC_CODEX_TETHER_SPELL
            print(asyncCodexTetherSpell)
            if not asyncCodexTetherSpell:
                print("Environment Variable ASYNC_CODEX_TETHER_SPELL Unavailable")
            tether = asyncCodexTetherSpell.format(codex=codex)
            print(tether)
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