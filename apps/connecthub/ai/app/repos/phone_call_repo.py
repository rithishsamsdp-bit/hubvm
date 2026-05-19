"""
Phone Number + Call Record Repo — pure async DB queries.
"""
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException

from models.db import PhoneNumber, CallRecord
from models.dto import CallRecordCreateRequest

COST_PER_MINUTE_USD = 0.30


async def get_all_phone_numbers(session: AsyncSession) -> list[PhoneNumber]:
    try:
        result = await session.execute(
            select(PhoneNumber).options(selectinload(PhoneNumber.bot)).order_by(PhoneNumber.number)
        )
        return result.scalars().all()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def get_phone_by_number(session: AsyncSession, number: str) -> PhoneNumber | None:
    try:
        result = await session.execute(
            select(PhoneNumber).options(selectinload(PhoneNumber.bot)).where(PhoneNumber.number == number)
        )
        return result.scalar_one_or_none()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def assign_bot(session: AsyncSession, phone_id: str, bot_id: str | None) -> PhoneNumber | None:
    try:
        await session.execute(
            update(PhoneNumber)
            .where(PhoneNumber.id == phone_id)
            .values(bot_id=bot_id, updated_at=datetime.now(timezone.utc))
        )
        await session.commit()
        result = await session.execute(
            select(PhoneNumber).options(selectinload(PhoneNumber.bot)).where(PhoneNumber.id == phone_id)
        )
        return result.scalar_one_or_none()
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def create_call_record(session: AsyncSession, data: CallRecordCreateRequest) -> CallRecord:
    try:
        payload = data.model_dump()
        if payload.get("duration_sec"):
            payload["cost_usd"] = round((payload["duration_sec"] / 60) * COST_PER_MINUTE_USD, 6)
        record = CallRecord(**payload)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def get_call_records(session: AsyncSession, bot_id: str | None = None, limit: int = 100) -> list[CallRecord]:
    try:
        q = select(CallRecord).order_by(CallRecord.created_at.desc()).limit(limit)
        if bot_id:
            q = q.where(CallRecord.bot_id == bot_id)
        result = await session.execute(q)
        return result.scalars().all()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def get_call_record_by_id(session: AsyncSession, record_id: str) -> CallRecord | None:
    try:
        result = await session.execute(
            select(CallRecord).where(CallRecord.id == record_id)
        )
        return result.scalar_one_or_none()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")


async def update_call_summary(session: AsyncSession, call_uuid: str, summary: str):
    try:
        await session.execute(
            update(CallRecord)
            .where(CallRecord.call_uuid == call_uuid)
            .values(summary=summary)
        )
        await session.commit()
    except SQLAlchemyError as e:
        await session.rollback()
        print(f"Failed to update call summary for {call_uuid}: {e}")


async def get_billing_summary(session: AsyncSession) -> dict:
    records = await get_call_records(session, limit=10000)
    total_calls = len(records)
    total_sec = sum(r.duration_sec or 0 for r in records)
    total_cost = sum(float(r.cost_usd or 0) for r in records)
    bot_breakdown: dict[str, dict] = {}
    for r in records:
        key = r.bot_id or "unassigned"
        if key not in bot_breakdown:
            bot_breakdown[key] = {"calls": 0, "total_sec": 0, "total_cost": 0.0}
        bot_breakdown[key]["calls"] += 1
        bot_breakdown[key]["total_sec"] += r.duration_sec or 0
        bot_breakdown[key]["total_cost"] += float(r.cost_usd or 0)
    return {
        "total_calls": total_calls,
        "total_minutes": round(total_sec / 60, 2),
        "total_cost_usd": round(total_cost, 4),
        "per_bot": bot_breakdown,
    }
