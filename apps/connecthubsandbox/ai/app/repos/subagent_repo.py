"""
Subagent + KB Document Repo — pure async DB queries.
"""
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException

from models.db import Subagent, KbDocument
from models.dto import SubagentCreateRequest, SubagentUpdateRequest, KbDocCreateRequest


async def create_subagent(session: AsyncSession, bot_id: str, data: SubagentCreateRequest) -> Subagent:
    try:
        sub = Subagent(bot_id=bot_id, **data.model_dump())
        session.add(sub)
        await session.commit()
        await session.refresh(sub)
        return sub
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def get_subagents(session: AsyncSession, bot_id: str) -> list[Subagent]:
    try:
        result = await session.execute(
            select(Subagent)
            .options(selectinload(Subagent.kb_documents))
            .where(Subagent.bot_id == bot_id)
        )
        return result.scalars().all()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def update_subagent(session: AsyncSession, sub_id: str, data: SubagentUpdateRequest) -> Subagent | None:
    try:
        values = {k: v for k, v in data.model_dump().items() if v is not None}
        await session.execute(update(Subagent).where(Subagent.id == sub_id).values(**values))
        await session.commit()
        result = await session.execute(
            select(Subagent).options(selectinload(Subagent.kb_documents)).where(Subagent.id == sub_id)
        )
        return result.scalar_one_or_none()
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def delete_subagent(session: AsyncSession, sub_id: str) -> bool:
    try:
        result = await session.execute(delete(Subagent).where(Subagent.id == sub_id))
        await session.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


# ── KB Documents ──

async def add_kb_doc(session: AsyncSession, owner_id: str, owner_type: str, data: KbDocCreateRequest) -> KbDocument:
    try:
        doc = KbDocument(owner_id=owner_id, owner_type=owner_type, **data.model_dump())
        session.add(doc)
        await session.commit()
        await session.refresh(doc)
        return doc
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def get_kb_docs(session: AsyncSession, owner_id: str, owner_type: str) -> list[KbDocument]:
    try:
        result = await session.execute(
            select(KbDocument)
            .where(KbDocument.owner_id == owner_id, KbDocument.owner_type == owner_type)
            .order_by(KbDocument.created_at.desc())
        )
        return result.scalars().all()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def delete_kb_doc(session: AsyncSession, doc_id: str) -> bool:
    try:
        result = await session.execute(delete(KbDocument).where(KbDocument.id == doc_id))
        await session.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
