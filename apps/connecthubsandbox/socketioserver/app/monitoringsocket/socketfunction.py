import socketio
import logging
import traceback
from socketcore.core import sio  # global Socket.IO server
from utils.jwtdecode import decode 
from fastapi.responses import JSONResponse
from http.cookies import SimpleCookie
import json

logger = logging.getLogger("socketio.monitoring")
# TL SID -> extensions he supervises
TL_SID_TO_EXTENSIONS: dict[str, set[str]] = {}
# Extension -> ALL TL SIDs supervising it
EXTENSION_TO_TL_SIDS: dict[str, set[str]] = {}

class monitoring(socketio.AsyncNamespace):
    async def on_connect(self, sid, environ):
        cookie_header = environ.get("HTTP_COOKIE", "")
        
        cookies = SimpleCookie(cookie_header)
        accessToken = cookies.get("accessToken")
        if not accessToken:
            logger.warning(f"[CONNECT REJECTED] No accessToken cookie present for SID: {sid}")
            return False
        
        tokenvalue = accessToken.value
        try:
            data = decode(tokenvalue)
            logger.debug(data)
            if not data or isinstance(data, JSONResponse):
                logger.warning(f"[DECODE FAILED] SID: {sid}")
                return False
        except Exception as e:
            logger.error(f"[JWT Decode Error] {e}")
            return False

        if not hasattr(data, "m_accountId"):
            logger.warning(f"[CONNECT REJECTED] Token does not contain m_accountId for SID: {sid}")
            return False
        # Handle TL connections seperately
        if data.m_memberRole  == "TL":
            if hasattr(data, "t_teamMemberExtensionNo"):
                extensions = data.t_teamMemberExtensionNo or []
                ext_set = set(map(str, extensions))
                TL_SID_TO_EXTENSIONS[sid] = ext_set
                for ext in ext_set:
                    EXTENSION_TO_TL_SIDS.setdefault(ext, set()).add(sid)
                    
                logger.info(f"[CONNECT] TL SID={sid} connected. Supervising extensions: {list(ext_set)}")
        else:
            # For other roles, just log the connection
            await self.enter_room(sid, str(data.m_accountId))
    
    async def on_message(self, sid, data):
        try:
            logger.debug(f"[RAW DATA] SID: {sid} | Type: {type(data)} | Value: {data}")

            if isinstance(data, str):
                payload = json.loads(data)
            elif isinstance(data, dict):
                payload = data
            else:
                logger.warning(f"[UNSUPPORTED TYPE] Data is of type {type(data)}")
                return

            # Extract values
            roomNO = str(payload.get("id"))
            
            # To Send to TLs supervising this extension
            exten = str(payload.get("extension"))
            tl_sids = EXTENSION_TO_TL_SIDS.get(exten, set())
            if tl_sids:
                logger.info(f"[MESSAGE] Sending update for extension {exten} to TL SIDs: {list(tl_sids)}")
            else:
                logger.info(f"[MESSAGE] No TLs supervising extension {exten}")
            for sid in tl_sids:
                await self.emit("response", payload, to=sid)
                
            data = payload.get("data")
            logger.debug(f"[PARSED] roomNO: {roomNO} | data: {data}")
            print(f"📦 Received record: roomNO={roomNO}, data={data} ")
            # Send response to that room
            await self.emit("response", payload, room=str(roomNO))

        except Exception as e:
            logger.error(f"[ERROR] on_message failed: {e}")

    async def on_disconnect(self, sid):
        logger.info(f"[DISCONNECT] SID: {sid} disconnected.")
        extensions = TL_SID_TO_EXTENSIONS.pop(sid, set())
        if not extensions:
            logger.debug(f"[DISCONNECT] SID={sid} had no extensions mapped.")
            return
        logger.debug(f"[DISCONNECT] SID={sid} was supervising extensions: {list(extensions)}")

        for ext in extensions:
            sids = EXTENSION_TO_TL_SIDS.get(ext)
            if sids:
                sids.discard(sid)
                logger.debug(f"[DISCONNECT] Removed SID={sid} from EXTENSION_TO_TL_SIDS[{ext}]. Remaining SIDs: {list(sids)}")

                if not sids:
                    EXTENSION_TO_TL_SIDS.pop(ext)
                    logger.debug(f"[DISCONNECT] No more TLs supervising extension {ext}. Key removed.")
            else:
                logger.debug(f"[DISCONNECT] No TLs found for extension {ext}, nothing to remove.")