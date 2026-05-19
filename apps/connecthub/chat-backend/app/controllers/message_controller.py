# controllers/message_controller.py — REST endpoints for messages
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import bleach
from middlewares.auth_middleware import get_current_user, require_role, CurrentUser
from db.context import get_chat_session
from repos import message_repo, room_repo, user_repo
from services import s3_service

router = APIRouter(prefix="/chat/messages", tags=["Chat Messages"])

# Mapping frontend messageType → allowed MIME sets
MSG_TYPE_MAP = {
    "image": "image",
    "audio": "audio",
    "file":  "file",
}


# Mapping frontend messageType → allowed MIME sets
MSG_TYPE_MAP = {
    "image": "image",
    "audio": "audio",
    "file":  "file",
}



def _msg_dto(msg) -> dict:
    """Serialize a ChatMessage ORM object to a response dict."""
    dto = {
        "msgId":      msg.msg_id,
        "roomId":     msg.msg_roomId,
        "senderId":   msg.msg_senderId,
        "senderName": msg.sender.u_memberName if msg.sender else "Unknown",
        "type":       msg.msg_type,
        "content":    msg.msg_content,
        "fileMeta":   msg.msg_fileMeta,
        "isPinned":   bool(msg.msg_isPinned),
        "isDeleted":  bool(msg.msg_isDeleted),
        "isEdited":   bool(getattr(msg, "msg_isEdited", False)),
        "editedAt":   str(msg.msg_editedAt) if getattr(msg, "msg_editedAt", None) else None,
        "replyTo":    getattr(msg, "msg_replyTo", None),
        "readBy":     [r.r_userId for r in msg.reads] if msg.reads else [],
        "createdAt":  msg.msg_createdOn.isoformat() if hasattr(msg.msg_createdOn, 'isoformat') else str(msg.msg_createdOn),
    }
    if msg.msg_type != "text" and not msg.msg_isDeleted:
        dto["presignedUrl"] = s3_service.generate_presigned_url(msg.msg_content)
    return dto


# ─── GET /chat/messages/{room_id} — paginated message history ────────────────
@router.get("/{room_id}")
async def get_messages(
    room_id: int,
    limit: int    = Query(50, ge=1, le=100),
    before_id: Optional[str] = Query(None),
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

        if not await room_repo.is_member(session, room_id, me.u_userId):
            raise HTTPException(status_code=403, detail="Not a member of this room")

        msgs = await message_repo.get_messages(session, room_id, limit, before_id)
        return {"success": True, "data": [_msg_dto(m) for m in msgs]}


# ─── GET /chat/messages/{room_id}/pinned — pinned messages ───────────────────
@router.get("/{room_id}/pinned")
async def get_pinned(
    room_id: int,
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
        if not await room_repo.is_member(session, room_id, me.u_userId):
            raise HTTPException(status_code=403, detail="Not a member of this room")

        msgs = await message_repo.get_pinned_messages(session, room_id)
        return {"success": True, "data": [_msg_dto(m) for m in msgs]}


# ─── GET /chat/messages/{room_id}/search — full-text search ──────────────────
@router.get("/{room_id}/search")
async def search_messages(
    room_id: int,
    q: str = Query(..., min_length=1),
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
        if not await room_repo.is_member(session, room_id, me.u_userId):
            raise HTTPException(status_code=403, detail="Not a member of this room")

        msgs = await message_repo.search_messages(session, room_id, q)
        return {"success": True, "data": [_msg_dto(m) for m in msgs]}


# ─── PATCH /chat/messages/{msg_id}/pin — TL / ADMIN can pin ──────────────────
class PinBody(BaseModel):
    pin: bool

@router.patch("/{msg_id}/pin")
async def pin_message(
    msg_id: str,
    body: PinBody,
    current_user: CurrentUser = Depends(get_current_user),
):
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        await message_repo.pin_message(session, msg_id, body.pin)
        return {"success": True, "message": "Pinned" if body.pin else "Unpinned"}


# ─── DELETE /chat/messages/{msg_id} — soft-delete own message ────────────────
@router.delete("/{msg_id}")
async def delete_message(
    msg_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        # Fetch to verify ownership
        msg = await message_repo.get_message_by_id(session, msg_id)
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
            
        me = await user_repo.upsert_user(session, {
            "member_id":    current_user.member_id,
            "extension_no": current_user.extension_no,
            "member_name":  current_user.member_name,
            "member_role":  current_user.member_role,
            "account_code": current_user.account_code,
        })

        is_admin = current_user.member_role in ("ADMIN", "SUPERADMIN")
        if msg.msg_senderId != me.u_userId and not is_admin:
            raise HTTPException(status_code=403, detail="Cannot delete someone else's message")

        await message_repo.soft_delete_message(session, msg_id)
        return {"success": True, "message": "Message deleted"}


# ─── PATCH /chat/messages/{msg_id}/content — edit own message ────────────────
class EditContentBody(BaseModel):
    content: str

@router.patch("/{msg_id}/content")
async def edit_message_content(
    msg_id: str,
    body: EditContentBody,
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
        msg = await message_repo.get_message_by_id(session, msg_id)
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        if msg.msg_senderId != me.u_userId:
            raise HTTPException(status_code=403, detail="Can only edit your own messages")
        if msg.msg_isDeleted:
            raise HTTPException(status_code=400, detail="Cannot edit a deleted message")

        sanitized = bleach.clean(body.content.strip(), tags=[], strip=True)
        if not sanitized:
            raise HTTPException(status_code=400, detail="Content cannot be empty")

        updated = await message_repo.edit_message(session, msg_id, sanitized)
        dto = _msg_dto(updated)

        from socketcore.core import sio
        await sio.emit("message_edited", dto, room=f"room_{updated.msg_roomId}", namespace="/chat")

        return {"success": True, "data": dto}


# ─── POST /chat/messages/upload — File/image/audio upload ────────────────────
@router.post("/upload")
@router.post("/upload/")
async def upload_media(
    file: UploadFile  = File(...),
    msgType: str      = Form(...),           # "image" | "audio" | "file"
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Upload a file to S3 and return the S3 key + presigned URL.
    The key is then sent as `content` in the send_message socket event.
    """
    msg_type = MSG_TYPE_MAP.get(msgType)
    if not msg_type:
        raise HTTPException(status_code=400, detail=f"Invalid msgType: {msgType}")

    content_type = file.content_type or "application/octet-stream"
    file_bytes   = await file.read()
    file_size    = len(file_bytes)

    # Validate before upload
    try:
        s3_service.validate_file(file.filename, content_type, file_size, msg_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Upload to S3
    try:
        key = s3_service.upload_file(
            file_bytes,
            file.filename,
            content_type,
            current_user.account_code,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    presigned_url = s3_service.generate_presigned_url(key)

    return {
        "success": True,
        "data": {
            "key":          key,
            "presignedUrl": presigned_url,
            "fileName":     file.filename,
            "fileSize":     file_size,
            "mimeType":     content_type,
            "msgType":      msgType,
        }
    }

