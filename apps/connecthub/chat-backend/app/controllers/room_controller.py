# controllers/room_controller.py — REST endpoints for chat rooms
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from middlewares.auth_middleware import get_current_user, require_role, CurrentUser
from db.context import get_chat_session
from repos import room_repo, user_repo, message_repo

router = APIRouter(prefix="/chat/rooms", tags=["Chat Rooms"])


# ─── DTOs ────────────────────────────────────────────────────────────────────
class StartPrivateChatBody(BaseModel):
    targetUserId: int          # u_userId of the other person

class CreateGroupBody(BaseModel):
    groupName:  str
    memberIds:  list[int]      # u_userId list (creator is added automatically)
    avatarUrl:  Optional[str] = None

class AddRemoveMemberBody(BaseModel):
    userId: int

class UpdateGroupBody(BaseModel):
    groupName: Optional[str] = None
    avatarUrl: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _room_dto(room, current_user_id: int, unread: int = 0) -> dict:
    members = [
        {
            "userId":   m.user.u_userId,
            "name":     m.user.u_memberName,
            "role":     m.user.u_memberRole,
            "status":   m.user.u_status,
            "lastSeen": str(m.user.u_lastSeen) if m.user.u_lastSeen else None,
            "roomRole": m.m_role,
        }
        for m in room.members
        if m.user
    ]
    return {
        "roomId":      room.r_roomId,
        "type":        room.r_type,
        "groupName":   room.r_groupName,
        "groupAvatar": room.r_groupAvatar,
        "createdBy":   room.r_createdBy,
        "members":     members,
        "unreadCount": unread,
        "updatedAt":   room.r_updatedOn.isoformat() if hasattr(room.r_updatedOn, "isoformat") else str(room.r_updatedOn).replace(" ", "T"),
    }


# ─── GET /chat/rooms — all rooms for current user ─────────────────────────────
@router.get("/")
async def get_my_rooms(current_user: CurrentUser = Depends(get_current_user)):
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        # Ensure user exists in chat_users
        user = await user_repo.upsert_user(session, {
            "member_id":    current_user.member_id,
            "extension_no": current_user.extension_no,
            "member_name":  current_user.member_name,
            "member_role":  current_user.member_role,
            "account_code": current_user.account_code,
        })

        rooms = await room_repo.get_rooms_for_user(session, user.u_userId, current_user.account_code)
        result = []
        for room in rooms:
            unread = await message_repo.get_unread_count(session, room.r_roomId, user.u_userId)
            result.append(_room_dto(room, user.u_userId, unread))

        return {"success": True, "data": result}


# ─── POST /chat/rooms/private — start or get a 1-to-1 chat ──────────────────
@router.post("/private")
async def start_private_chat(
    body: StartPrivateChatBody,
    current_user: CurrentUser = Depends(get_current_user),
):
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        me = await user_repo.upsert_user(session, {
            "member_id":    current_user.member_id,
            "extension_no": current_user.extension_no,
            "member_name":  current_user.member_name,
            "member_role":  current_user.member_role,
            "account_code": current_user.account_code,
        })

        existing = await room_repo.find_private_room(session, me.u_userId, body.targetUserId)
        if existing:
            return {"success": True, "data": _room_dto(existing, me.u_userId), "created": False}

        room = await room_repo.create_private_room(
            session,
            me.u_userId,
            body.targetUserId,
            current_user.account_code,
            me.u_userId,
        )
        # Re-fetch with eager members
        room = await room_repo.get_room_by_id(session, room.r_roomId)
        dto = _room_dto(room, me.u_userId)
        
        # Notify the target user so it instantly appears in their sidebar
        from socketcore.core import sio
        await sio.emit("room_added", dto, room=f"user_{body.targetUserId}", namespace="/chat")
        
        return {"success": True, "data": dto, "created": True}


# ─── POST /chat/rooms/group — ADMIN only ─────────────────────────────────────
@router.post("/group")
async def create_group(
    body: CreateGroupBody,
    current_user: CurrentUser = Depends(require_role("ADMIN", "SUPERADMIN")),
):
    if not body.groupName.strip():
        raise HTTPException(status_code=400, detail="Group name is required")

    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        me = await user_repo.upsert_user(session, {
            "member_id":    current_user.member_id,
            "extension_no": current_user.extension_no,
            "member_name":  current_user.member_name,
            "member_role":  current_user.member_role,
            "account_code": current_user.account_code,
        })

        # Always include creator
        member_ids = list(set([me.u_userId] + body.memberIds))

        room = await room_repo.create_group_room(
            session,
            body.groupName.strip(),
            member_ids,
            current_user.account_code,
            me.u_userId,
            body.avatarUrl,
        )
        room = await room_repo.get_room_by_id(session, room.r_roomId)
        dto = _room_dto(room, me.u_userId)
        
        # Notify all added members so it instantly appears in their sidebars
        from socketcore.core import sio
        for uid in member_ids:
            if uid != me.u_userId:  # Creator already has it via REST response
                await sio.emit("room_added", dto, room=f"user_{uid}", namespace="/chat")

        return {"success": True, "data": dto}


# ─── POST /chat/rooms/{room_id}/members — ADMIN only ─────────────────────────
@router.post("/{room_id}/members")
async def add_member(
    room_id: int,
    body: AddRemoveMemberBody,
    current_user: CurrentUser = Depends(require_role("ADMIN", "SUPERADMIN")),
):
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        room = await room_repo.get_room_by_id(session, room_id)
        if not room or room.r_type != "group":
            raise HTTPException(status_code=404, detail="Group not found")
        if room.r_accountCode != current_user.account_code:
            raise HTTPException(status_code=403, detail="Access denied")

        await room_repo.add_member_to_room(session, room_id, body.userId)
        room = await room_repo.get_room_by_id(session, room_id)

        from socketcore.core import sio
        new_member_dto = _room_dto(room, body.userId)
        # Notify newly added user so the group appears in their sidebar instantly
        await sio.emit("room_added", new_member_dto, room=f"user_{body.userId}", namespace="/chat")
        # Notify existing members so their member count updates
        existing_ids = [m.user.u_userId for m in room.members if m.user and m.user.u_userId != body.userId]
        for uid in existing_ids:
            await sio.emit("room_updated", _room_dto(room, uid), room=f"user_{uid}", namespace="/chat")

        return {"success": True, "data": new_member_dto}


# ─── DELETE /chat/rooms/{room_id}/members/{user_id} — ADMIN only ─────────────
@router.delete("/{room_id}/members/{user_id}")
async def remove_member(
    room_id: int,
    user_id: int,
    current_user: CurrentUser = Depends(require_role("ADMIN", "SUPERADMIN")),
):
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        room = await room_repo.get_room_by_id(session, room_id)
        if not room or room.r_type != "group":
            raise HTTPException(status_code=404, detail="Group not found")
        if room.r_accountCode != current_user.account_code:
            raise HTTPException(status_code=403, detail="Access denied")

        await room_repo.remove_member_from_room(session, room_id, user_id)
        return {"success": True, "message": "Member removed"}


# ─── DELETE /chat/rooms/{room_id} — ADMIN only ───────────────────────────────
@router.delete("/{room_id}")
async def delete_group(
    room_id: int,
    current_user: CurrentUser = Depends(require_role("ADMIN", "SUPERADMIN")),
):
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        room = await room_repo.get_room_by_id(session, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room.r_accountCode != current_user.account_code:
            raise HTTPException(status_code=403, detail="Access denied")

        await room_repo.delete_room(session, room_id)
        return {"success": True, "message": "Group deleted"}
