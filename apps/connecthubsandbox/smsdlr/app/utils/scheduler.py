from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor
from utils.socket_manager import manager
from datetime import datetime, timedelta
import asyncio

executors = {
    'default': AsyncIOExecutor(),
}

scheduler = AsyncIOScheduler(executors=executors)

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        print("[SCHEDULER] Started APScheduler")

async def shutdown():
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Stopped APScheduler")

def add_test_job():
    scheduler.add_job(print_message, "date", run_date=datetime.now() + timedelta(seconds=10))

async def print_message():
    print(f"[JOB] Executed test job at {datetime.now()}")

# async def trigger_callback_event(extension, phonenumber, callback_time):
#     print(f"[CALLBACK] Reminder triggered for Agent {extension} to call {phonenumber} at {callback_time}")
async def trigger_callback_event(memberextensionno, phonenumber, timestamp):
    agent_id = str(memberextensionno)
    message = f"📞 Callback Reminder: Call {phonenumber} scheduled for {timestamp}"
    print(f"[JOB] Triggering reminder for agent {agent_id}")
    await manager.send_to_agent(agent_id, message)