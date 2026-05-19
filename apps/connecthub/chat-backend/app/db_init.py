# db_init.py — Creates all tables in the chat DB (run once)
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from models.db import Base
from config import settings

async def init():
    spell = settings.ASYNC_CODEX_TETHER_SPELL.format(codex=settings.CHAT_DB_NAME)
    engine = create_async_engine(spell, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("✅ Chat DB tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init())
