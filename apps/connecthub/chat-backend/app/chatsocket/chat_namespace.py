# chatsocket/chat_namespace.py
# Real-time Socket.IO namespace — handles all chat events
# Events:   join_room, leave_room, send_message, typing_start, typing_stop, mark_read
# Emits:    new_message, user_online, user_offline, typing, message_read, room_updated, error

import jwt
import socketio
from http.cookies import SimpleCookie
from socketcore.core import sio
from db.context import get_chat_session
from config import settings
from repos import user_repo, room_repo, message_repo
from services import s3_service
import bleach

# Map: socket_id → user_id  (in-memory; fine for single process)
_socket_to_user: dict[str, int] = {}


def _decode_token(token: str) -> dict | None:
    """Verify the accessToken and return payload, or None on failure."""
    try:
        return jwt.decode(
            token,
            settings.AUTH_TOKEN_SECRET_KEY,
            algorithms=[settings.AUTH_TOKEN_ALGORITHM],
        )
    except jwt.PyJWTError:
        return None


def _sanitize(text: str) -> str:
    """Strip all HTML tags to prevent XSS in text messages."""
    return bleach.clean(text, tags=[], strip=True)


# ─── Namespace class ─────────────────────────────────────────────────────────
class ChatNamespace(socketio.AsyncNamespace):
    """Handles all events under the /chat namespace."""

    # ── connect ──────────────────────────────────────────────────────────────
    async def on_connect(self, sid: str, environ: dict, auth: dict):
        # Read accessToken from HTTP cookie header (same pattern as socketioserver)
        cookie_header = environ.get("HTTP_COOKIE", "")
        cookies = SimpleCookie(cookie_header)
        cookie_obj = cookies.get(settings.AUTH_TOKEN_NAME)
        token = cookie_obj.value if cookie_obj else ""

        if not token:
            print(f"[CHAT] No accessToken cookie for SID: {sid}")
            await self.emit("error", {"message": "Unauthorized"}, to=sid)
            return False   # reject connection

        payload = _decode_token(token)
        if not payload:
            print(f"[CHAT] Invalid token for SID: {sid}")
            await self.emit("error", {"message": "Unauthorized"}, to=sid)
            return False   # reject connection

        SessionFactory = get_chat_session()
        async with SessionFactory() as session:
            user = await user_repo.upsert_user(session, {
                "member_id":    payload.get("m_memberId"),
                "extension_no": payload.get("m_memberExtensionNo"),
                "member_name":  payload.get("m_memberName", "Unknown"),
                "member_role":  payload.get("m_memberRole", "USER"),
                "account_code": payload.get("m_accountCode", ""),
            })
            _socket_to_user[sid] = user.u_userId
            await user_repo.set_user_online(session, user.u_userId, sid)

            # Notify others in the same account that this user is online
            await self.emit(
                "user_online",
                {"userId": user.u_userId, "userName": user.u_memberName},
                room=f"account_{user.u_accountCode}",
            )
            # Join the account-wide room for presence broadcasts
            await self.enter_room(sid, f"account_{user.u_accountCode}")
            # Join personal room for targeted events (like being added to a new chat)
            await self.enter_room(sid, f"user_{user.u_userId}")
        print(f"[CHAT] Connected: {sid} → user {_socket_to_user.get(sid)}")

    # ── disconnect ───────────────────────────────────────────────────────────
    async def on_disconnect(self, sid: str):
        user_id = _socket_to_user.pop(sid, None)
        if not user_id:
            return
        SessionFactory = get_chat_session()
        async with SessionFactory() as session:
            user = await user_repo.get_user_by_id(session, user_id)
            if user:
                await user_repo.set_user_offline(session, user_id)
                await self.emit(
                    "user_offline",
                    {"userId": user_id, "lastSeen": str(user.u_lastSeen)},
                    room=f"account_{user.u_accountCode}",
                )
        print(f"[CHAT] Disconnected: {sid}")

    # ── join_room ─────────────────────────────────────────────────────────────
    async def on_join_room(self, sid: str, data: dict):
        """Client joins a specific chat room to receive its messages."""
        room_id = data.get("roomId")
        user_id = _socket_to_user.get(sid)
        if not room_id or not user_id:
            return

        SessionFactory = get_chat_session()
        async with SessionFactory() as session:
            if not await room_repo.is_member(session, room_id, user_id):
                await self.emit("error", {"message": "Not a member of this room"}, to=sid)
                return
            await self.enter_room(sid, f"room_{room_id}")
            # Mark all existing messages as read on join
            read_ids = await message_repo.mark_room_read(session, room_id, user_id)
            if read_ids:
                await self.emit(
                    "message_read",
                    {"roomId": room_id, "userId": user_id, "msgIds": read_ids},
                    room=f"room_{room_id}",
                )

    # ── leave_room ────────────────────────────────────────────────────────────
    async def on_leave_room(self, sid: str, data: dict):
        room_id = data.get("roomId")
        if room_id:
            await self.leave_room(sid, f"room_{room_id}")

    # ── send_message ──────────────────────────────────────────────────────────
    async def on_send_message(self, sid: str, data: dict):
        """
        data = {
            roomId:    int,
            type:      "text" | "image" | "audio" | "file",
            content:   str  (text or S3 key),
            fileMeta:  {name, size, mime}  (optional),
            replyToId: str  (msgId being replied to, optional),
            mentions:  [int, ...]  (userIds mentioned, optional)
        }
        """
        user_id   = _socket_to_user.get(sid)
        room_id   = data.get("roomId")
        msg_type  = data.get("type", "text")
        content   = data.get("content", "").strip()
        file_meta = data.get("fileMeta")
        reply_to_id = data.get("replyToId")
        mentions  = data.get("mentions", [])

        if not user_id or not room_id or not content:
            await self.emit("error", {"message": "Invalid message payload"}, to=sid)
            return

        if msg_type == "text":
            content = _sanitize(content)
            if not content:
                return

        SessionFactory = get_chat_session()
        async with SessionFactory() as session:
            if not await room_repo.is_member(session, room_id, user_id):
                await self.emit("error", {"message": "Not a member of this room"}, to=sid)
                return

            # Resolve reply-to preview
            reply_to_preview = None
            if reply_to_id:
                ref = await message_repo.get_message_by_id(session, reply_to_id)
                if ref and not ref.msg_isDeleted:
                    ref_sender = await user_repo.get_user_by_id(session, ref.msg_senderId)
                    reply_to_preview = {
                        "msgId":      reply_to_id,
                        "senderName": ref_sender.u_memberName if ref_sender else "Unknown",
                        "content":    ref.msg_content[:120],
                        "type":       ref.msg_type,
                    }

            msg = await message_repo.create_message(
                session, room_id, user_id, msg_type, content, file_meta, reply_to_preview
            )
            sender = await user_repo.get_user_by_id(session, user_id)

            msg_dto = {
                "msgId":      msg.msg_id,
                "roomId":     room_id,
                "senderId":   user_id,
                "senderName": sender.u_memberName if sender else "Unknown",
                "type":       msg_type,
                "content":    content,
                "fileMeta":   file_meta,
                "replyTo":    reply_to_preview,
                "isPinned":   False,
                "isEdited":   False,
                "readBy":     [user_id],
                "createdAt":  msg.msg_createdOn.isoformat() if hasattr(msg.msg_createdOn, 'isoformat') else str(msg.msg_createdOn).replace(" ", "T"),
            }

            if msg_type != "text":
                msg_dto["presignedUrl"] = s3_service.generate_presigned_url(content)

            # Notify mentioned users
            sender_name = sender.u_memberName if sender else "Someone"
            for uid in mentions:
                if uid != user_id:
                    await self.emit(
                        "mentioned",
                        {"roomId": room_id, "msgId": msg.msg_id, "senderName": sender_name},
                        room=f"user_{uid}",
                    )

        await self.emit("new_message", msg_dto, room=f"room_{room_id}")

    # ── typing_start ──────────────────────────────────────────────────────────
    async def on_typing_start(self, sid: str, data: dict):
        user_id = _socket_to_user.get(sid)
        room_id = data.get("roomId")
        if not user_id or not room_id:
            return
        SessionFactory = get_chat_session()
        async with SessionFactory() as session:
            user = await user_repo.get_user_by_id(session, user_id)
            name = user.u_memberName if user else "Someone"
        await self.emit(
            "typing",
            {"roomId": room_id, "userId": user_id, "userName": name, "isTyping": True},
            room=f"room_{room_id}",
            skip_sid=sid,   # don't echo to sender
        )

    # ── typing_stop ───────────────────────────────────────────────────────────
    async def on_typing_stop(self, sid: str, data: dict):
        user_id = _socket_to_user.get(sid)
        room_id = data.get("roomId")
        if not user_id or not room_id:
            return
        await self.emit(
            "typing",
            {"roomId": room_id, "userId": user_id, "isTyping": False},
            room=f"room_{room_id}",
            skip_sid=sid,
        )

    # ── mark_read ─────────────────────────────────────────────────────────────
    async def on_mark_read(self, sid: str, data: dict):
        """Mark a specific message as read."""
        user_id = _socket_to_user.get(sid)
        msg_id  = data.get("msgId")
        room_id = data.get("roomId")
        if not user_id or not msg_id:
            return
        SessionFactory = get_chat_session()
        async with SessionFactory() as session:
            await message_repo.mark_read(session, msg_id, user_id)
        await self.emit(
            "message_read",
            {"roomId": room_id, "msgId": msg_id, "userId": user_id},
            room=f"room_{room_id}",
        )
