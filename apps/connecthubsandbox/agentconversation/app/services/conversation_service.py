from fastapi import status
from fastapi.responses import JSONResponse
from config import settings
from models.dto import TokenModel
from repos import conversation_repo
from utils.scheduler import scheduler, scheduleCallbackEvent

from datetime import datetime
import jwt, asyncio, pytz

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

async def end(request: dict, accountid: int, accountno: str, database: str):
    asyncio.create_task(conversation_repo.end(request.conversationid, request.callid, request.callendtime, request.followup, accountid, accountno, database))

async def list(request: dict, accountid: int, accountno: str, database: str):
    return await conversation_repo.list(request.memberextensionno, request.offset, request.limit, accountid, accountno, database)

async def followupFetch(request: dict, accountid: int, accountno: str, database: str):
    phonenumber = request.phonenumber[-10:] if len(request.phonenumber) > 10 else request.phonenumber
    return await conversation_repo.followupFetch(phonenumber, request.leadid, request.campaignid, request.clinumberid, request.calldirection, accountid, accountno, database)

async def getCallFollowUp(request: dict, accountid: int, accountno: str, database: str):
    return await conversation_repo.getCallFollowUp(request.callid, accountid, accountno, database)

async def createCallback(request: dict, memberid: int, memberextensionno: int, accountid: int, accountno: str, database: str):
    try:
        callbacktime = datetime.fromisoformat(request.timestamp).strftime("%Y-%m-%d %H:%M:%S")
        await conversation_repo.createCallback(request.phonenumber, callbacktime, memberid, memberextensionno, accountid, accountno, database)
        localTimezone = pytz.timezone("Asia/Kolkata")
        localTime = datetime.fromisoformat(request.timestamp)
        IST_Time = localTimezone.localize(localTime)
        UTC_Time = IST_Time.astimezone(pytz.utc)
        scheduler.add_job(
            scheduleCallbackEvent,
            "date",
            run_date=UTC_Time,
            args=[request.phonenumber, callbacktime, memberid, memberextensionno, accountid, accountno, database],
            id=f"callback-{accountno}-{memberextensionno}-{request.phonenumber}",
            replace_existing=True
        )
        print(f"[SCHEDULER JOB] TriggerTime({callbacktime}) Payload({memberextensionno}, {request.phonenumber}, {callbacktime})")
    except Exception as e:
        print(f"[ERROR] Scheduler Failed: {e}")

async def fetchCallbackReminder(request: dict, accountid: int, accountno: str, memberrole: str, memberextensionno: str, database: str):
    return await conversation_repo.fetchCallbackReminder(
        request.sortOrder,
        request.sortField,
        request.searchString,
        request.offset,
        request.limit,
        accountid,
        accountno,
        database,
        request.calldatestart,
        request.calldateend,
        memberrole,
        str(memberextensionno)
    )

async def getContact(request: dict, accountid: int, accountno: str, memberextensionno: int, database: str):
    return await conversation_repo.getContact(request.phonenumber, accountid, accountno, memberextensionno, database)

async def followuppredictiveFetch(request: dict, accountid: int, accountno: str, database: str):
    return await conversation_repo.followuppredictiveFetch(request.leadid, request.campaignid, accountid, accountno, database)