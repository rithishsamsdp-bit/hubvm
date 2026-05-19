from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from models.dto import MailAutomationResponse
from utils import mailer
from sqlalchemy import select
from models.db import MailAutomation
from db.context import get_async_reader_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import pytz
import json
from apscheduler.schedulers.background import BackgroundScheduler
from services.s3_onedrive_service import upload_s3_daily_files

# Ensure logging is configured to see output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = None
IST = pytz.timezone('Asia/Kolkata')

async def check_mail_automations():
    """
    Checks for due mail automations and sends emails.
    """
    # Get current time in IST
    now = datetime.now(IST)
    logger.info(f"Checking mail automations at {now}")
    
    # Use your default database alias here. Adjust if needed.
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session_maker() as session:
        try:
            query = select(MailAutomation)
            result_scalars = (await session.execute(query)).scalars().all()
            automations = [MailAutomationResponse.from_orm(record) for record in result_scalars]
            
            # Format time and day based on IST now
            current_time_str = now.strftime("%H:%M")
            current_day_str = now.strftime("%A") # e.g., 'Monday'
            
            for automation in automations:
                if automation.ma_status == "INACTIVE":
                    continue
                
                # Use automation timezone if provided, otherwise IST
                try:
                    auto_tz = pytz.timezone(automation.ma_timezoneFilter) if automation.ma_timezoneFilter else IST
                except Exception:
                    auto_tz = IST
                
                now_auto = datetime.now(auto_tz)
                
                # Format time and day based on automation TZ
                current_time_str = now_auto.strftime("%H:%M")
                current_day_str = now_auto.strftime("%A")
                
                # Basic Time Check
                if automation.ma_time != current_time_str:
                    continue
                
                should_run = False
                date_range_start = None
                date_range_end = None
                
                # Determine Date Range
                today_date = now_auto.date()
                
                if automation.ma_schedule == "Daily":
                    should_run = True
                    data_range = getattr(automation, 'ma_dataRange', 'previous_day') or 'previous_day'
                    
                    if data_range == "month_to_date":
                        # Month to Date: 1st of current month to yesterday
                        yesterday = today_date - timedelta(days=1)
                        first_day_of_month = today_date.replace(day=1)
                        date_range_start = f"{first_day_of_month} 00:00:00"
                        date_range_end = f"{yesterday} 23:59:59"
                    else:
                        # Default: Previous day only
                        yesterday = today_date - timedelta(days=1)
                        date_range_start = f"{yesterday} 00:00:00"
                        date_range_end = f"{yesterday} 23:59:59"
                    
                elif automation.ma_schedule == "Weekly":
                    if automation.ma_day and automation.ma_day.lower() == current_day_str.lower():
                        should_run = True
                        # Last 7 days including yesterday, ending yesterday?
                        end_date = today_date - timedelta(days=1)
                        start_date = end_date - timedelta(days=6)
                        date_range_start = f"{start_date} 00:00:00"
                        date_range_end = f"{end_date} 23:59:59"

                elif automation.ma_schedule == "Monthly":
                    # Run on the 1st of every month
                    if now.day == 1:
                        should_run = True
                        # Previous Month Calculation
                        last_day_prev_month = today_date - timedelta(days=1)
                        first_day_prev_month = last_day_prev_month.replace(day=1)
                        
                        date_range_start = f"{first_day_prev_month} 00:00:00"
                        date_range_end = f"{last_day_prev_month} 23:59:59"
                
                if should_run:
                    logger.info(f"Running automation: {automation.ma_name} ({automation.ma_reportName})")
                    
                    # GENERATE REPORT CONTENT AND SEND AS ATTACHMENT
                    try:
                        if automation.ma_reportName == "CDR Report":
                            from services import report_service
                            
                            # 1. FETCH DATA
                            response_stream = await report_service.mail_cdr_fetch(
                                limit=1000000, # Large limit for full export
                                offset=0,
                                sortorder='DESC',
                                sortfield='CallDateTime',
                                searchstring='',
                                campaignid=0,
                                calldisposition='',
                                calldirection='',
                                callmode='',
                                calldatestartrange=date_range_start,
                                calldateendrange=date_range_end,
                                type='export',
                                accountid=automation.ma_accountId,
                                accountno=automation.ma_accountNo,
                                memberId=0,
                                memberrole='ADMIN',
                                database='onedb',
                                include_followups=False,
                                extensionFilter=automation.ma_extensionFilter,
                                timezoneFilter=automation.ma_timezoneFilter,
                                fieldsFilter=automation.ma_fieldsFilter
                            )

                            # 2. CONSUME STREAMING RESPONSE
                            csv_content_bytes = b""
                            async for chunk in response_stream.body_iterator:
                                if isinstance(chunk, str):
                                    csv_content_bytes += chunk.encode('utf-8')
                                else:
                                    csv_content_bytes += chunk
                            
                            safe_start = date_range_start[:10]
                            filename = f"CDR_Report_{automation.ma_accountNo}_{safe_start}.csv"
                            
                            subject = f"Scheduled Report: {automation.ma_reportName} - {safe_start}"
                            
                            filter_details = (
                                f"Filter Details:\n"
                                f"- Extensions: {', '.join(map(str, automation.ma_extensionFilter)) if automation.ma_extensionFilter else 'All'}\n"
                                f"- Timezone: {automation.ma_timezoneFilter or 'Asia/Kolkata (IST)'}\n"
                                f"- Fields Included: {', '.join(automation.ma_fieldsFilter) if automation.ma_fieldsFilter else 'Default Columns'}\n"
                            )
                            
                            body = (
                                f"Hello,\n\n"
                                f"Please find the attached scheduled report '{automation.ma_reportName}'.\n"
                                f"Period: {date_range_start} to {date_range_end}\n\n"
                                f"{filter_details}\n"
                                f"Regards,\nConnectHub Automation"
                            )
                        
                        else:
                            logger.warning(f"Unknown Report Name: {automation.ma_reportName}")
                            continue
                            
                    except Exception as e:
                        logger.error(f"Failed to generate report or email: {e}")
                        continue
                    
                    cc_list = automation.ma_ccEmail
                    
                    if isinstance(cc_list, str):
                        try:
                            cc_list = json.loads(cc_list)
                        except json.JSONDecodeError:
                            try:
                                fixed_json = cc_list.replace("'", '"')
                                cc_list = json.loads(fixed_json)
                            except Exception:
                                cc_list = []
                    
                    if not isinstance(cc_list, list):
                         cc_list = []
                            
                    await run_in_executor(
                        mailer.send_email_with_attachment,
                        to_emails=[automation.ma_toEmail],
                        subject=subject,
                        body=body,
                        cc_emails=cc_list,
                        attachment_content=csv_content_bytes,
                        attachment_filename=filename
                    )
                    
        except Exception as e:
            logger.error(f"Error in check_mail_automations: {e}")
        finally:
            await session.close()
            await async_engine.dispose()


async def run_s3_onedrive_job():
    logger.info("Running S3 → OneDrive daily upload")
    await upload_s3_daily_files()

import functools

async def run_in_executor(func, *args, **kwargs):
    import asyncio
    loop = asyncio.get_running_loop()
    # Use functools.partial to wrap func with its args and kwargs
    pfunc = functools.partial(func, *args, **kwargs)
    result = await loop.run_in_executor(None, pfunc)
    logger.info(f"Background process completed with result: {result}")
    return result

def start():
    """
    Starts the AsyncIOScheduler.
    """
    global scheduler
    if scheduler:
        return  # Already started

    scheduler = AsyncIOScheduler()

    # ✅ MAIL AUTOMATION - Run every minute to check for scheduled reports
    scheduler.add_job(
        check_mail_automations,
        CronTrigger(minute='*', timezone=IST),
        id="mail_automation_job",
        replace_existing=True,
        misfire_grace_time=300
    )

    # ✅ S3 → OneDrive JOB
    scheduler.add_job(
        run_s3_onedrive_job,
        CronTrigger(day='*/1', hour=2, minute=30, timezone=IST),
        id="s3_onedrive_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300
    )

    scheduler.start()
    logger.info("Main Scheduler started (Mail + OneDrive)")

def shutdown():
    global scheduler
    if scheduler:
        scheduler.shutdown()
