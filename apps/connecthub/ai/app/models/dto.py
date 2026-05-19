"""
DTOs (Data Transfer Objects) — Pydantic schemas for request/response validation.
Uses str for IDs (MySQL stores UUIDs as VARCHAR(36)).
"""
from datetime import datetime
from pydantic import BaseModel


# ──────────────────────────── Bot DTOs ────────────────────────────

class BotCreateRequest(BaseModel):
    name: str
    language: str = "en"
    voice: str = "alloy"
    model: str = "gpt-4o-realtime-preview"
    first_message: str | None = None
    system_prompt: str | None = None
    nodes: list | None = None
    edges: list | None = None
    knowledge_base: list | None = None

class BotUpdateRequest(BaseModel):
    name: str | None = None
    language: str | None = None
    voice: str | None = None
    model: str | None = None
    first_message: str | None = None
    system_prompt: str | None = None
    nodes: list | None = None
    edges: list | None = None
    knowledge_base: list | None = None


class BotResponse(BaseModel):
    id: str
    name: str
    language: str
    voice: str
    model: str
    first_message: str | None
    system_prompt: str | None
    nodes: list | None = None
    edges: list | None = None
    knowledge_base: list | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────── Phone Number DTOs ────────────────────────────

class PhoneNumberResponse(BaseModel):
    id: str
    number: str
    display_name: str | None
    bot_id: str | None
    bot: BotResponse | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignBotRequest(BaseModel):
    bot_id: str | None = None


# ──────────────────────────── Subagent DTOs ────────────────────────────

class SubagentCreateRequest(BaseModel):
    name: str
    system_prompt: str | None = None
    transfer_keyword: str | None = None


class SubagentUpdateRequest(BaseModel):
    name: str | None = None
    system_prompt: str | None = None
    transfer_keyword: str | None = None


class SubagentResponse(BaseModel):
    id: str
    bot_id: str
    name: str
    system_prompt: str | None
    transfer_keyword: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────── KB Document DTOs ────────────────────────────

class KbDocCreateRequest(BaseModel):
    title: str
    content: str | None = None
    source_url: str | None = None


class KbDocResponse(BaseModel):
    id: str
    owner_id: str
    owner_type: str
    title: str
    content: str | None
    source_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────── Call Record DTOs ────────────────────────────

class CallRecordCreateRequest(BaseModel):
    phone_number_id: str | None = None
    bot_id: str | None = None
    call_uuid: str
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_sec: int | None = None
    transcript: list | None = None
    summary: str | None = None
    caller_number: str | None = None
    source: str | None = None
    status: str | None = None
    end_reason: str | None = None
    api_calls: list | None = None


class CallRecordResponse(BaseModel):
    id: str
    phone_number_id: str | None
    bot_id: str | None
    call_uuid: str
    started_at: datetime | None
    ended_at: datetime | None
    duration_sec: int | None
    cost_usd: float | None
    transcript: list | None
    summary: str | None
    caller_number: str | None
    source: str | None
    status: str | None
    end_reason: str | None
    api_calls: list | None
    created_at: datetime

    model_config = {"from_attributes": True}
