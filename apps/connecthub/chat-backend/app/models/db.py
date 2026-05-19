# models/db.py — SQLAlchemy ORM models for the chat system
from sqlalchemy import (
    BigInteger, Integer, String, Text, Enum, DateTime,
    TIMESTAMP, JSON, Column, ForeignKey, Index
)
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# ──────────────────────────────────────────────────────────────────────────────
# chat_users  —  synced from JWT payload on first authenticated request
# ──────────────────────────────────────────────────────────────────────────────
class ChatUser(Base):
    __tablename__ = "chat_users"

    u_userId            = Column("u_userId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    u_memberId          = Column("u_memberId", BigInteger, unique=True, nullable=False)
    u_memberExtensionNo = Column("u_memberExtensionNo", Integer, unique=True, nullable=False)
    u_memberName        = Column("u_memberName", String(255), nullable=False)
    u_memberRole        = Column("u_memberRole", Enum("SUPERADMIN", "ADMIN", "TL", "USER"), nullable=False)
    u_accountCode       = Column("u_accountCode", String(100), nullable=False)   # tenant isolation
    u_status            = Column("u_status", Enum("online", "offline"), nullable=False, default="offline")
    u_lastSeen          = Column("u_lastSeen", DateTime, nullable=True)
    u_socketId          = Column("u_socketId", String(255), nullable=True)       # current socket connection
    u_createdOn         = Column("u_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    u_updatedOn         = Column("u_updatedOn", TIMESTAMP, nullable=False,
                                 server_default=func.current_timestamp(),
                                 onupdate=func.current_timestamp())

    __table_args__ = (
        Index("idx_chat_users_account", "u_accountCode"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# chat_rooms  —  private 1-to-1 OR group chat
# ──────────────────────────────────────────────────────────────────────────────
class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    r_roomId      = Column("r_roomId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    r_type        = Column("r_type", Enum("private", "group"), nullable=False)
    r_groupName   = Column("r_groupName", String(255), nullable=True)         # group only
    r_groupAvatar = Column("r_groupAvatar", Text, nullable=True)              # S3 URL
    r_createdBy   = Column("r_createdBy", BigInteger, ForeignKey("chat_users.u_userId", ondelete="SET NULL"), nullable=True)
    r_accountCode = Column("r_accountCode", String(100), nullable=False)      # tenant isolation
    r_createdOn   = Column("r_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    r_updatedOn   = Column("r_updatedOn", TIMESTAMP, nullable=False,
                           server_default=func.current_timestamp(),
                           onupdate=func.current_timestamp())

    members  = relationship("ChatRoomMember", back_populates="room", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_chat_rooms_account", "r_accountCode"),
        Index("idx_chat_rooms_type",    "r_type"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# chat_room_members  —  many-to-many: rooms ↔ users
# ──────────────────────────────────────────────────────────────────────────────
class ChatRoomMember(Base):
    __tablename__ = "chat_room_members"

    m_id       = Column("m_id",     BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_roomId   = Column("m_roomId", BigInteger, ForeignKey("chat_rooms.r_roomId", ondelete="CASCADE"), nullable=False)
    m_userId   = Column("m_userId", BigInteger, ForeignKey("chat_users.u_userId",  ondelete="CASCADE"), nullable=False)
    m_role     = Column("m_role",   Enum("member", "admin"), nullable=False, default="member")
    m_joinedOn = Column("m_joinedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())

    room = relationship("ChatRoom", back_populates="members")
    user = relationship("ChatUser")

    __table_args__ = (
        Index("idx_room_members_room", "m_roomId"),
        Index("idx_room_members_user", "m_userId"),
    )
