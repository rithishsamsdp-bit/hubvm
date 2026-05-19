# repos/room_repo.py — Data access layer for ChatRoom and ChatRoomMember
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from sqlalchemy.orm import selectinload
from models.db import ChatRoom, ChatRoomMember, ChatUser


async def get_room_by_id(session: AsyncSession, room_id: int) -> ChatRoom | None:
    result = await session.execute(
        select(ChatRoom)
        .options(selectinload(ChatRoom.members).selectinload(ChatRoomMember.user))
        .where(ChatRoom.r_roomId == room_id)
    )
    return result.scalar_one_or_none()


async def get_rooms_for_user(session: AsyncSession, user_id: int, account_code: str) -> list[ChatRoom]:
    """Return all rooms (private + group) a user belongs to."""
    result = await session.execute(
        select(ChatRoom)
        .join(ChatRoomMember, ChatRoomMember.m_roomId == ChatRoom.r_roomId)
        .options(selectinload(ChatRoom.members).selectinload(ChatRoomMember.user))
        .where(
            and_(
                ChatRoomMember.m_userId == user_id,
                ChatRoom.r_accountCode  == account_code,
            )
        )
        .order_by(ChatRoom.r_updatedOn.desc())
    )
    return result.scalars().unique().all()


async def find_private_room(session: AsyncSession, user_id_a: int, user_id_b: int) -> ChatRoom | None:
    """Find existing private room between exactly two users."""
    # Find rooms where both users are members
    subq_a = select(ChatRoomMember.m_roomId).where(ChatRoomMember.m_userId == user_id_a)
    subq_b = select(ChatRoomMember.m_roomId).where(ChatRoomMember.m_userId == user_id_b)

    result = await session.execute(
        select(ChatRoom)
        .options(selectinload(ChatRoom.members).selectinload(ChatRoomMember.user))
        .where(
            and_(
                ChatRoom.r_type   == "private",
                ChatRoom.r_roomId.in_(subq_a),
                ChatRoom.r_roomId.in_(subq_b),
            )
        )
    )
    return result.scalar_one_or_none()


async def create_private_room(
    session: AsyncSession,
    user_id_a: int,
    user_id_b: int,
    account_code: str,
    created_by: int,
) -> ChatRoom:
    room = ChatRoom(r_type="private", r_accountCode=account_code, r_createdBy=created_by)
    session.add(room)
    await session.flush()   # get r_roomId before commit

    for uid in [user_id_a, user_id_b]:
        session.add(ChatRoomMember(m_roomId=room.r_roomId, m_userId=uid, m_role="member"))

    await session.commit()
    return await get_room_by_id(session, room.r_roomId)


async def create_group_room(
    session: AsyncSession,
    name: str,
    member_ids: list[int],
    account_code: str,
    created_by: int,
    avatar_url: str | None = None,
) -> ChatRoom:
    room = ChatRoom(
        r_type        = "group",
        r_groupName   = name,
        r_groupAvatar = avatar_url,
        r_accountCode = account_code,
        r_createdBy   = created_by,
    )
    session.add(room)
    await session.flush()

    # Creator is admin of the group
    for uid in member_ids:
        role = "admin" if uid == created_by else "member"
        session.add(ChatRoomMember(m_roomId=room.r_roomId, m_userId=uid, m_role=role))

    await session.commit()
    return await get_room_by_id(session, room.r_roomId)


async def add_member_to_room(session: AsyncSession, room_id: int, user_id: int):
    existing = await session.execute(
        select(ChatRoomMember).where(
            and_(ChatRoomMember.m_roomId == room_id, ChatRoomMember.m_userId == user_id)
        )
    )
    if not existing.scalar_one_or_none():
        session.add(ChatRoomMember(m_roomId=room_id, m_userId=user_id, m_role="member"))
        await session.commit()


async def remove_member_from_room(session: AsyncSession, room_id: int, user_id: int):
    await session.execute(
        delete(ChatRoomMember).where(
            and_(ChatRoomMember.m_roomId == room_id, ChatRoomMember.m_userId == user_id)
        )
    )
    await session.commit()


async def delete_room(session: AsyncSession, room_id: int):
    room = await get_room_by_id(session, room_id)
    if room:
        await session.delete(room)
        await session.commit()


async def is_member(session: AsyncSession, room_id: int, user_id: int) -> bool:
    result = await session.execute(
        select(ChatRoomMember).where(
            and_(ChatRoomMember.m_roomId == room_id, ChatRoomMember.m_userId == user_id)
        )
    )
    return result.scalar_one_or_none() is not None
