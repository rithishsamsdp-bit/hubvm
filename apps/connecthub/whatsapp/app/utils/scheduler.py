import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from datetime import datetime, timedelta
import pytz
from sqlalchemy import select, or_
from models.db import CampaignWhatsApp
from db.context import asyncSessionFactory
from services.whatsapp_template_service import execute_task

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

async def load_whatsapp_campaigns():
    """Load scheduled campaigns from DB and add to scheduler."""
    database = "onedb"  # Assuming 'onedb' is the target database name
    session_maker = asyncSessionFactory(database)
    
    MAX_RETRIES = 3
    retry_delay = 1  # Start with 1 second delay

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with session_maker() as session:
                # Fetch campaigns scheduled in the last 24 hours (to catch missed ones) or in the future
                # AND status is not COMPLETED (handle NULL as well for backward compatibility)
                lookback_time = datetime.now() - timedelta(hours=24)
                stmt = select(CampaignWhatsApp).where(
                    CampaignWhatsApp.cw_schedule_time > lookback_time,
                    or_(CampaignWhatsApp.cw_status != 'COMPLETED', CampaignWhatsApp.cw_status == None)
                )
                result = await session.execute(stmt)
                campaigns = result.scalars().all()
                print(f"Found {len(campaigns)} campaigns to schedule.")
                
                for campaign in campaigns:
                    job_id = f"whatsapp_campaign_{campaign.cw_id}"
                    
                    # Check if job already exists to avoid duplication
                    # if scheduler.get_job(job_id):
                    #     continue

                    # Ensure schedule_time is timezone aware
                    schedule_time = campaign.cw_schedule_time
                    if schedule_time.tzinfo is None:
                         ist = pytz.timezone("Asia/Kolkata")
                         schedule_time = ist.localize(schedule_time)

                    print(f"Scheduling job for {schedule_time} (Current time: {datetime.now(pytz.timezone('Asia/Kolkata'))})")

                    scheduler.add_job(
                        execute_task,
                        trigger=DateTrigger(run_date=schedule_time),
                        args=[
                            campaign.cw_id,
                            campaign.cw_account_id,
                            campaign.cw_account_no
                        ],
                        id=job_id,
                        replace_existing=True,
                        misfire_grace_time=3600  # Allow job to run even if missed by 1 hour
                    )
                    # Debug: print jobs to see what's scheduled
                    # scheduler.print_jobs()
                    print(f"✅ Scheduled campaign {campaign.cw_campaign_name} (ID: {campaign.cw_id}) for {campaign.cw_schedule_time} (Job ID: {job_id})")
            
            # If successful, break the retry loop
            break

        except asyncio.CancelledError as e:
            if attempt < MAX_RETRIES:
                print(f"⚠️ load_whatsapp_campaigns cancelled (attempt {attempt}/{MAX_RETRIES}). Retrying in {retry_delay}s...")
                try:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                except asyncio.CancelledError:
                    print("⚠️ Retry sleep cancelled. Task execution stopped.")
                    # If the task is cancelled during sleep, we should stop trying.
                    # We return cleanly to prevent APScheduler from logging a scary error,
                    # assuming this is a valid cancellation (e.g. shutdown or job overlap resolution).
                    return
            else:
                print(f"❌ load_whatsapp_campaigns failed after {MAX_RETRIES} attempts due to CancelledError: {e}")
                
        except Exception as e:
             # Regular exceptions might not benefit from immediate retry if it's a code error, 
             # but connection errors would. For now, we log and stop to avoid spamming if it's a logic bug.
            print(f"Error loading campaigns: {e}")
            break

from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR, EVENT_JOB_MISSED

def job_listener(event):
    if event.exception:
        print(f"❌ Job {event.job_id} failed with error: {event.exception}")
    elif event.code == EVENT_JOB_MISSED:
        print(f"⚠️ Job {event.job_id} was missed")
    else:
        print(f"✅ Job {event.job_id} executed successfully")

def start_scheduler():
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR | EVENT_JOB_MISSED)
    # Add a periodic job to reload campaigns every minute
    scheduler.add_job(load_whatsapp_campaigns, 'interval', minutes=1, id="campaign_loader", replace_existing=True)
    
    scheduler.start()
    
    # Ideally, this should be called as a startup event loop task
    asyncio.get_event_loop().create_task(load_whatsapp_campaigns())
