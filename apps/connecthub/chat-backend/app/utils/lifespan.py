# utils/lifespan.py — App startup / shutdown lifecycle
from contextlib import asynccontextmanager
from fastapi import FastAPI
from db.context import asyncEngineFactory, killEngines
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────
    print("[CHAT] Startup triggered")

    # First, create the database if it doesn't exist
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    
    # Create a base connection string by passing an empty string or 'mysql' as codex
    base_spell = settings.ASYNC_CODEX_TETHER_SPELL.format(codex="")
    # Remove trailing slash if present when DB name is empty
    if base_spell.endswith("/"):
        base_spell = base_spell[:-1]
        
    init_engine = create_async_engine(base_spell, isolation_level="AUTOCOMMIT")
    async with init_engine.begin() as conn:
        await conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{settings.CHAT_DB_NAME}`"))
    await init_engine.dispose()
    print(f"[CHAT] Ensured database `{settings.CHAT_DB_NAME}` exists")

    from models.db import Base
    # Warm up the MySQL connection pool and create tables if needed
    engine = asyncEngineFactory(settings.CHAT_DB_NAME)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(f"[CHAT] MySQL engine warmed up and tables verified → DB: {settings.CHAT_DB_NAME}")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    print("[CHAT] Shutdown triggered")
    await killEngines()
    print("[CHAT] MySQL engines disposed")
