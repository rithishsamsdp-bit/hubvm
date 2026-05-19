"""
Bot Repo — pure async DB queries for AiBot.
"""
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException

from models.db import AiBot, Subagent
from models.dto import BotCreateRequest, BotUpdateRequest


async def create(session: AsyncSession, data: BotCreateRequest) -> AiBot:
    try:
        bot = AiBot(**data.model_dump())
        session.add(bot)
        await session.commit()
        await session.refresh(bot)
        return bot
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")


async def get_all(session: AsyncSession) -> list[AiBot]:
    try:
        result = await session.execute(select(AiBot).order_by(AiBot.created_at.desc()))
        return result.scalars().all()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def get_by_id(session: AsyncSession, bot_id: str) -> AiBot | None:
    try:
        result = await session.execute(
            select(AiBot)
            .options(selectinload(AiBot.subagents).selectinload(Subagent.kb_documents))
            .where(AiBot.id == bot_id)
        )
        return result.scalar_one_or_none()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def update_by_id(session: AsyncSession, bot_id: str, data: BotUpdateRequest) -> AiBot | None:
    try:
        values = {k: v for k, v in data.model_dump().items() if v is not None}
        await session.execute(update(AiBot).where(AiBot.id == bot_id).values(**values))
        await session.commit()
        return await get_by_id(session, bot_id)
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def delete_by_id(session: AsyncSession, bot_id: str) -> bool:
    try:
        result = await session.execute(delete(AiBot).where(AiBot.id == bot_id))
        await session.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
