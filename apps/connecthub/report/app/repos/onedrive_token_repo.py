from db.context import get_async_reader_engine, get_async_writer_engine
from sqlalchemy import select, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from models.db import OneDriveIn

DB_ALIAS = "onedb"


# 🔹 Get latest OneDrive configuration
async def get_onedrive_config():
    async_engine = get_async_reader_engine(DB_ALIAS)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session_maker() as session:
        try:
            result = await session.execute(
                select(OneDriveIn)
                .order_by(OneDriveIn.od_id.desc())
                .limit(1)
            )
            return result.scalar_one_or_none()
        finally:
            await session.close()
            await async_engine.dispose()


# 🔹 Update refresh token only
async def update_refresh_token(od_id: int, refresh_token: str):
    async_engine = get_async_writer_engine(DB_ALIAS)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session_maker() as session:
        try:
            await session.execute(
                update(OneDriveIn)
                .where(OneDriveIn.od_id == od_id)
                .values(od_refresh_token=refresh_token)
            )
            await session.commit()
        finally:
            await session.close()
            await async_engine.dispose()
