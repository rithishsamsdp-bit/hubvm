"""
Phone Number + Call Controller — thin FastAPI router.
"""
import uuid
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
 
from db.context import get_db
from models.dto import PhoneNumberResponse, AssignBotRequest, CallRecordCreateRequest, CallRecordResponse
from repos import phone_call_repo

phone_router = APIRouter(prefix="/phone-numbers", tags=["Phone Numbers"])
call_router = APIRouter(prefix="/calls", tags=["Calls"])


# ── Phone Numbers ─────────────────────────────────────────────────────────────

@phone_router.get("", response_model=list[PhoneNumberResponse])
async def list_phone_numbers(session: AsyncSession = Depends(get_db)):
    try:
        return await phone_call_repo.get_all_phone_numbers(session)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@phone_router.put("/{phone_id}/bot", response_model=PhoneNumberResponse)
async def assign_bot(phone_id: str, data: AssignBotRequest, session: AsyncSession = Depends(get_db)):
    try:
        pn = await phone_call_repo.assign_bot(session, phone_id, data.bot_id)
        if not pn:
            return JSONResponse(status_code=404, content={"message": "Phone number not found"})
        return pn
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


# ── Call Records ──────────────────────────────────────────────────────────────

@call_router.post("", response_model=CallRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_call(data: CallRecordCreateRequest, session: AsyncSession = Depends(get_db)):
    try:
        return await phone_call_repo.create_call_record(session, data)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@call_router.get("", response_model=list[CallRecordResponse])
async def list_calls(bot_id: str | None = None, session: AsyncSession = Depends(get_db)):
    try:
        return await phone_call_repo.get_call_records(session, bot_id=bot_id)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@call_router.get("/billing")
async def get_billing(session: AsyncSession = Depends(get_db)):
    try:
        return await phone_call_repo.get_billing_summary(session)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@call_router.get("/{call_id}", response_model=CallRecordResponse)
async def get_call(call_id: str, session: AsyncSession = Depends(get_db)):
    try:
        rec = await phone_call_repo.get_call_record_by_id(session, call_id)
        if not rec:
            return JSONResponse(status_code=404, content={"message": "Call record not found"})
        return rec
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
