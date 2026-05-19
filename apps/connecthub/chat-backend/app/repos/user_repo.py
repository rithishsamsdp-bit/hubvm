# repos/user_repo.py — Data access layer for ChatUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.db import ChatUser
from datetime import datetime


async def upsert_user(session: AsyncSession, data: dict) -> ChatUser:
    """
    Create or update a ChatUser from JWT payload data.
    Called on every authenticated request to keep the user record in sync.
    """
    stmt = select(ChatUser).where(ChatUser.u_memberId == data["member_id"])
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        user.u_memberName  = data["member_name"]
        user.u_memberRole  = data["member_role"]
        user.u_accountCode = data["account_code"]
    else:
        user = ChatUser(
            u_memberId          = data["member_id"],
            u_memberExtensionNo = data["extension_no"],
            u_memberName        = data["member_name"],
            u_memberRole        = data["member_role"],
            u_accountCode       = data["account_code"],
        )
        session.add(user)

    await session.commit()
    await session.refresh(user)
    return user


async def get_user_by_id(session: AsyncSession, user_id: int) -> ChatUser | None:
    result = await session.execute(
        select(ChatUser).where(ChatUser.u_userId == user_id)
    )
    return result.scalar_one_or_none()


from db.context import asyncSessionFactory
from sqlalchemy import text

async def get_users_by_account(session: AsyncSession, account_code: str) -> list[ChatUser]:
    """Return all users in the same tenant/account (for user-search)."""
    # 1. Sync from MySQL onedb.p_members
    SessionFactory = asyncSessionFactory("onedb")
    async with SessionFactory() as onedb_session:
        stmt = text("SELECT m_memberId, m_memberName, m_memberRole, m_memberExtensionNo FROM p_members WHERE m_accountCode = :ac")
        result = await onedb_session.execute(stmt, {"ac": account_code})
        onedb_users = result.fetchall()

    for m_user in onedb_users:
        member_id = m_user.m_memberId
        if not member_id:
            continue
            
        stmt = select(ChatUser).where(ChatUser.u_memberId == member_id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            user.u_memberName  = m_user.m_memberName or "Unknown"
            user.u_memberRole  = m_user.m_memberRole or "USER"
        else:
            user = ChatUser(
                u_memberId          = member_id,
                u_memberExtensionNo = m_user.m_memberExtensionNo or 0,
                u_memberName        = m_user.m_memberName or "Unknown",
                u_memberRole        = m_user.m_memberRole or "USER",
                u_accountCode       = account_code,
            )
            session.add(user)
            
    await session.commit()

    # 2. Return all from MySQL chat_users
    result = await session.execute(
        select(ChatUser).where(ChatUser.u_accountCode == account_code)
    )
    return result.scalars().all()


async def set_user_online(session: AsyncSession, user_id: int, socket_id: str):
    await session.execute(
        update(ChatUser)
        .where(ChatUser.u_userId == user_id)
        .values(u_status="online", u_socketId=socket_id)
    )
    await session.commit()


async def set_user_offline(session: AsyncSession, user_id: int):
    await session.execute(
        update(ChatUser)
        .where(ChatUser.u_userId == user_id)
        .values(u_status="offline", u_lastSeen=datetime.utcnow(), u_socketId=None)
    )
    await session.commit()
