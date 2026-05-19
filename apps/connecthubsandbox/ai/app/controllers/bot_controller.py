"""
Bot Controller — thin FastAPI router, mirrors agentconversation/app/controllers/ pattern.
Delegates all logic to bot_service.
"""
import uuid
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from db.context import get_db
from models.dto import (
    BotCreateRequest, BotUpdateRequest, BotResponse,
    SubagentCreateRequest, SubagentUpdateRequest, SubagentResponse,
    KbDocCreateRequest, KbDocResponse,
)
from services import bot_service
from repos import subagent_repo

router = APIRouter(prefix="/bots", tags=["Bots"])


# ── Bot CRUD ─────────────────────────────────────────────────────────────────

@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def create_bot(data: BotCreateRequest, session: AsyncSession = Depends(get_db)):
    try:
        return await bot_service.create_bot(session, data)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.get("", response_model=list[BotResponse])
async def list_bots(session: AsyncSession = Depends(get_db)):
    try:
        return await bot_service.list_bots(session)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(bot_id: str, session: AsyncSession = Depends(get_db)):
    try:
        return await bot_service.get_bot(session, bot_id)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(bot_id: str, data: BotUpdateRequest, session: AsyncSession = Depends(get_db)):
    try:
        return await bot_service.update_bot(session, bot_id, data)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bot(bot_id: str, session: AsyncSession = Depends(get_db)):
    try:
        await bot_service.delete_bot(session, bot_id)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


# ── Subagents ────────────────────────────────────────────────────────────────

@router.post("/{bot_id}/subagents", response_model=SubagentResponse, status_code=status.HTTP_201_CREATED)
async def create_subagent(bot_id: str, data: SubagentCreateRequest, session: AsyncSession = Depends(get_db)):
    try:
        return await subagent_repo.create_subagent(session, bot_id, data)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.get("/{bot_id}/subagents", response_model=list[SubagentResponse])
async def list_subagents(bot_id: str, session: AsyncSession = Depends(get_db)):
    try:
        return await subagent_repo.get_subagents(session, bot_id)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.put("/subagents/{sub_id}", response_model=SubagentResponse)
async def update_subagent(sub_id: str, data: SubagentUpdateRequest, session: AsyncSession = Depends(get_db)):
    try:
        sub = await subagent_repo.update_subagent(session, sub_id, data)
        if not sub:
            return JSONResponse(status_code=404, content={"message": "Subagent not found"})
        return sub
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.delete("/subagents/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subagent(sub_id: str, session: AsyncSession = Depends(get_db)):
    try:
        deleted = await subagent_repo.delete_subagent(session, sub_id)
        if not deleted:
            return JSONResponse(status_code=404, content={"message": "Subagent not found"})
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


# ── KB Documents ─────────────────────────────────────────────────────────────

@router.post("/{bot_id}/kb", response_model=KbDocResponse, status_code=status.HTTP_201_CREATED)
async def add_bot_kb(bot_id: str, data: KbDocCreateRequest, session: AsyncSession = Depends(get_db)):
    try:
        return await subagent_repo.add_kb_doc(session, bot_id, "bot", data)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.get("/{bot_id}/kb", response_model=list[KbDocResponse])
async def list_bot_kb(bot_id: str, session: AsyncSession = Depends(get_db)):
    try:
        return await subagent_repo.get_kb_docs(session, bot_id, "bot")
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.post("/subagents/{sub_id}/kb", response_model=KbDocResponse, status_code=status.HTTP_201_CREATED)
async def add_subagent_kb(sub_id: uuid.UUID, data: KbDocCreateRequest, session: AsyncSession = Depends(get_db)):
    try:
        return await subagent_repo.add_kb_doc(session, sub_id, "subagent", data)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.get("/subagents/{sub_id}/kb", response_model=list[KbDocResponse])
async def list_subagent_kb(sub_id: uuid.UUID, session: AsyncSession = Depends(get_db)):
    try:
        return await subagent_repo.get_kb_docs(session, sub_id, "subagent")
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
