from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor
from utils.socket_manager import socket_manager
from repos import notification_repo
from datetime import datetime, timedelta
import requests

executors = {
    'default': AsyncIOExecutor(),
}

scheduler = AsyncIOScheduler(executors=executors)

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        print("[APP] Started APScheduler")

async def shutdown():
    if scheduler.running:
        scheduler.shutdown()
        print("[APP] Stopped APScheduler")

async def scheduleCallbackEvent(phonenumber, callbacktime, memberid, memberextensionno, accountid, accountno, database):
    print(f"[SCHEDULER JOB] Triggered TriggerTime({callbacktime}) Payload({memberextensionno}, {phonenumber}, {callbacktime})")
    notificationtype = "CALLBACK"
    notificationdata = {"phonenumber":phonenumber}
    notificationtime = callbacktime
    notificationId = await notification_repo.createNotification(notificationtype, notificationdata, notificationtime, memberid, memberextensionno, accountid, accountno, database)
    payload = {
        "extention": memberextensionno,
        "data": {
            "notificationId": notificationId,
            "action": notificationtype,
            "notificationData": notificationdata,
            "notificationTime": notificationtime,
            "notificationStatus": "UNREAD"
        }
    }
    socket_manager.emit("message", payload)