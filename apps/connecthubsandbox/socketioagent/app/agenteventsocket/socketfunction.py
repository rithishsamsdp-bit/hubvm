import socketio
import logging
import traceback
from socketcore.core import sio  # global Socket.IO server
from utils.jwtdecode import decode
from fastapi.responses import JSONResponse
from http.cookies import SimpleCookie
import json

logger = logging.getLogger("socketio.agentevent")


class agentevent(socketio.AsyncNamespace):

    def __init__(self, namespace):
        super().__init__(namespace)
        self.user_sid_map = {}

    async def on_connect(self, sid, environ):
        # Debug all environ (existing behavior)
        for key, value in environ.items():
            logger.debug(f"{key}: {value}")

        cookie_header = environ.get("HTTP_COOKIE", "")
        logger.debug(f"This is Cookie Header {cookie_header}")

        cookies = SimpleCookie(cookie_header)
        logger.debug(f"This is cookie object {cookies}")

        # ===============================
        # ✅ TOKEN LOGIC (INSIDE FUNCTION)
        # ===============================
        tokenvalue = None

        # 1️⃣ Cookie token (priority)
        accessToken = cookies.get("accessToken")
        logger.debug(f"This is access Header {accessToken}")
        if accessToken:
            tokenvalue = accessToken.value

        # 2️⃣ Bearer token (fallback)
        if not tokenvalue:
            auth_header = environ.get("HTTP_AUTHORIZATION")
            logger.debug(f"This is Authorization Header {auth_header}")
            if auth_header and auth_header.lower().startswith("bearer "):
                tokenvalue = auth_header.split(" ", 1)[1]

        # 3️⃣ Reject if no token
        if not tokenvalue:
            logger.warning(
                f"[CONNECT REJECTED] No token in cookie or bearer for SID: {sid}"
            )
            return False

        # ===============================
        # Existing decode logic
        # ===============================
        try:
            data = decode(tokenvalue)
            if not data or isinstance(data, JSONResponse):
                logger.warning(f"[DECODE FAILED] SID: {sid}")
                return False
        except Exception as e:
            logger.error(f"[JWT Decode Error] {e}")
            logger.error(traceback.format_exc())
            return False

        if not hasattr(data, "m_accountId"):
            logger.warning(
                f"[CONNECT REJECTED] Token does not contain m_accountId for SID: {sid}"
            )
            return False

        m_memberExtensionNo = data.m_memberExtensionNo
        logger.info(
            f"[CONNECT] SID: {sid} | m_memberExtensionNo: {m_memberExtensionNo}"
        )

        # Existing behavior unchanged
        await self.enter_room(sid, m_memberExtensionNo)

    async def on_message(self, sid, data):
        try:
            logger.debug(
                f"[RAW DATA] SID: {sid} | Type: {type(data)} | Value: {data}"
            )

            if isinstance(data, str):
                payload = json.loads(data)
            elif isinstance(data, dict):
                payload = data
            else:
                logger.warning(
                    f"[UNSUPPORTED TYPE] Data is of type {type(data)}"
                )
                return

            extention = int(payload.get("extention"))
            message = payload.get("data")

            await self.emit("response", message, room=extention)

        except Exception as e:
            logger.error(f"[ERROR] on_message failed: {e}")
            logger.error(traceback.format_exc())

    async def on_disconnect(self, sid, close_reason):
        logger.info(
            f"[DISCONNECT] SID: {sid} disconnected. Reason: {close_reason}"
        )

        user_to_remove = None
        for user_id, user_sid in self.user_sid_map.items():
            if user_sid == sid:
                user_to_remove = user_id
                break

        if user_to_remove:
            del self.user_sid_map[user_to_remove]
            logger.info(
                f"[DISCONNECT] Removed mapping for user {user_to_remove}"
            )
