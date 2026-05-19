from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from constants import asyncCodexTetherSpell
from threading import Lock
from dotenv import load_dotenv
import os

load_dotenv()
engineCache: dict[str, AsyncEngine] = {}
lock = Lock()

def asyncEngineFactory(codex: str) -> AsyncEngine:
    with lock:
        if codex not in engineCache:
            asyncCodexTetherSpell = os.getenv("ASYNC_CODEX_TETHER_SPELL")
            if not asyncCodexTetherSpell:
                print("Environment variable ASYNC_CODEX_TETHER_SPELL is not set")
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