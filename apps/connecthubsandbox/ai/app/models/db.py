"""
ORM Models — mirrors agentconversation/app/models/db.py
All SQLAlchemy table definitions for the AI Call Center service.
Uses MySQL-compatible types (String for UUID, no PostgreSQL-specific dialects).
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Numeric, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.context import Base


def now_utc():
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class AiBot(Base):
    __tablename__ = "ai_bots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en")   # 'en' | 'ta'
    voice: Mapped[str] = mapped_column(String(50), default="alloy")
    model: Mapped[str] = mapped_column(String(100), default="gpt-4o-realtime-preview")
    first_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    nodes: Mapped[list | None] = mapped_column(JSON, nullable=True)
    edges: Mapped[list | None] = mapped_column(JSON, nullable=True)
    knowledge_base: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    phone_numbers: Mapped[list["PhoneNumber"]] = relationship("PhoneNumber", back_populates="bot")
    subagents: Mapped[list["Subagent"]] = relationship("Subagent", back_populates="bot", cascade="all, delete")
    call_records: Mapped[list["CallRecord"]] = relationship("CallRecord", back_populates="bot")


class PhoneNumber(Base):
    __tablename__ = "phone_numbers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bot_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ai_bots.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    bot: Mapped["AiBot | None"] = relationship("AiBot", back_populates="phone_numbers")
    call_records: Mapped[list["CallRecord"]] = relationship("CallRecord", back_populates="phone_number")


class Subagent(Base):
    __tablename__ = "ai_subagents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    bot_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_bots.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    transfer_keyword: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    bot: Mapped["AiBot"] = relationship("AiBot", back_populates="subagents")
    kb_documents: Mapped[list["KbDocument"]] = relationship(
        "KbDocument",
        primaryjoin="and_(Subagent.id==foreign(KbDocument.owner_id), KbDocument.owner_type=='subagent')",
        cascade="all, delete",
    )


class KbDocument(Base):
    __tablename__ = "ai_kb_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    owner_id: Mapped[str] = mapped_column(String(36), nullable=False)
    owner_type: Mapped[str] = mapped_column(String(20), nullable=False)   # 'bot' | 'subagent'
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class CallRecord(Base):
    __tablename__ = "ai_call_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    phone_number_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("phone_numbers.id"), nullable=True)
    bot_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ai_bots.id"), nullable=True)
    call_uuid: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_usd: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    transcript: Mapped[list | None] = mapped_column(JSON, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    caller_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    end_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    api_calls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    phone_number: Mapped["PhoneNumber | None"] = relationship("PhoneNumber", back_populates="call_records")
    bot: Mapped["AiBot | None"] = relationship("AiBot", back_populates="call_records")
