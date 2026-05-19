from fastapi import status
from fastapi.responses import JSONResponse
from utils.socket_manager import socket_manager
from config import settings
from models.dto import TokenModel
from repos import notification_repo
from datetime import datetime
from zoneinfo import ZoneInfo
import jwt


def decode(token: str):
    try:
        token_data = jwt.decode(token, settings.AUTH_TOKEN_SECRET_KEY, algorithms=[settings.AUTH_TOKEN_ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Invalid"
            }
        )

async def triggerNotification(request: dict, accountid: int, accountno: str, database: str):
    if request.memberextensionno == "":
        memberextensionnos = await notification_repo.listMembers(accountid, accountno, database)

    notificationtime = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
    notificationId = await notification_repo.createNotification(request.notificationtype, request.notificationdata, notificationtime, None, request.memberextensionno, accountid, accountno, database)

    for memberextensionno in memberextensionnos:
        payload = {
            "extention": memberextensionno,
            "data": {
                "notificationId": notificationId,
                "action": request.notificationtype,
                "notificationData": request.notificationdata,
                "notificationTime": notificationtime,
                "notificationStatus": "UNREAD"
            }
        }
        socket_manager.emit("message", payload)

async def createNotification(request: dict, accountid: int, accountno: str, database: str):
    notificationId = await notification_repo.createNotification(request.notificationtype, request.notificationdata, request.notificationtime, request.memberid, request.memberextensionno, accountid, accountno, database)
    payload = {
        "extention": request.memberextensionno,
        "data": {
            "notificationId": notificationId,
            "action": request.notificationtype,
            "notificationData": request.notificationdata,
            "notificationTime": request.notificationtime,
            "notificationStatus": "UNREAD"
        }
    }
    socket_manager.emit("message", payload)

async def listNotification(request: dict, accountid: int, accountno: str, database: str):
    notificationtype = request.notificationtype
    # Normalize to list for consistent handling in repo
    if isinstance(notificationtype, str):
        notificationtype = [notificationtype]
    return await notification_repo.listNotification(request.memberextensionno, notificationtype, request.offset, request.limit, accountid, accountno, database)

async def statusupdateNotification(request: dict, accountid: int, accountno: str, database: str):
    return await notification_repo.statusupdateNotification(request.notificationids, request.notificationstatus, accountid, accountno, database)