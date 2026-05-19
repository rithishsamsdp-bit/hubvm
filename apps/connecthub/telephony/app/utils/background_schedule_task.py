from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.emergency_service import EmergencyService
from config import settings
import logging

logger = logging.getLogger("emergency-scheduler")

scheduler = AsyncIOScheduler()

async def check_scheduled_campaigns():
    """
    Checks for campaigns that are scheduled and due for execution.
    """
    try:
        service = EmergencyService(settings.ASYNC_CODEX_NAME)
        due_campaigns = await service.repo.fetch_due_campaigns()
        
        if due_campaigns:
            logger.info(f"⏰ Found {len(due_campaigns)} due campaigns")
            for camp in due_campaigns:
                campaign_id = camp["e_campaignId"]
                account_id = camp["e_accountId"]
                account_no = camp["e_accountNo"]
                
                logger.info(f"🚀 Triggering scheduled campaign {campaign_id}")
                await service.launch_campaign(campaign_id, account_id, account_no)
    except Exception as e:
        logger.error(f"❌ Error in check_scheduled_campaigns: {e}", exc_info=True)

def start():
    """
    Starts the background scheduler and schedules the periodic check.
    """
    if not scheduler.running:
        scheduler.add_job(check_scheduled_campaigns, 'interval', minutes=1)
        scheduler.start()
        logger.info("[SCHEDULER] Started Emergency Campaign Scheduler")

async def shutdown():
    """
    Stops the background scheduler.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[SCHEDULER] Stopped Emergency Campaign Scheduler")