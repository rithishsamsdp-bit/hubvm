from repos.emergency_repo import EmergencyRepo
from models.dto import (
    EmergencyCampaignCreateRequest, 
    EmergencyGroupCreateRequest, 
    TokenModel, 
    EmergencyReportResponse, 
    EmergencyIVRLogResponse,
    EmergencyAllReportsResponse,
    EmergencyDashboardResponse,
    EmergencyResponseMembersRequest
)
from typing import List, Dict, Any, Optional
from fastapi import status, Request
from fastapi.responses import JSONResponse
from producer.kafkaproducer import send_message
import jwt
from datetime import datetime, timezone
import json

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token_or_request):
    token = None
    if isinstance(token_or_request, str):
        token = token_or_request
    elif isinstance(token_or_request, Request):
        token = token_or_request.cookies.get('accessToken')
        if not token:
            auth_header = token_or_request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
    
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Authentication token missing"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Token Expired"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Token Invalid"},
            headers={"WWW-Authenticate": "Bearer"},
        )

class EmergencyService:
    def __init__(self, database: str):
        self.repo = EmergencyRepo(database)
        self._campaign_name_cache = {} # id -> name

    async def create_and_orchestrate(self, request: EmergencyCampaignCreateRequest, account_id: int, account_no: str) -> Dict[str, Any]:
        # 1. Save to Repo
        campaign_id = await self.repo.create_campaign(request, account_id, account_no)
        
        # 2. If schedule is IMMEDIATE, trigger orchestration via Kafka
        if request.e_scheduleType.value == 'IMMEDIATE':
            await self.launch_campaign(campaign_id, account_id, account_no)
        
        return {"campaign_id": campaign_id, "status": "CREATED"}

    async def launch_campaign(self, campaign_id: int, account_id: int, account_no: str) -> Dict[str, Any]:
        print(f"[EmergencyService] 🚀 Launching campaign {campaign_id} for account {account_no}")
        # 1. Get Details
        campaign = await self.repo.get_campaign_details(campaign_id)
        if not campaign:
            print(f"[EmergencyService] ❌ Campaign {campaign_id} NOT FOUND")
            return {"status": "ERROR", "message": "Campaign not found"}
            
        metadata = campaign["metadata"]
        print(f"[EmergencyService] 📋 Metadata found: {metadata.get('e_campaignName')}")
        
        # 2. Check for restart (if status is COMPLETED or FAILED, clear previous logs)
        current_status = metadata.get("e_status")
        if current_status in ["COMPLETED", "FAILED"]:
            print(f"[EmergencyService] 🔄 Restart detected for {campaign_id}. Clearing old logs...")
            await self.repo.clear_campaign_logs(campaign_id)

        # 3. Update status to EXECUTING
        await self.repo.update_status(campaign_id, "EXECUTING")
        print(f"[EmergencyService] ✅ Status updated to EXECUTING for {campaign_id}")
        
        # 3. Construct trigger message
        orchestration_msg = {
            "campaign_id": campaign_id,
            "account_id": account_id,
            "account_no": account_no,
            "priority": metadata["e_priority"],
            "category": metadata["e_category"],
            "data": campaign.get("orchestration"),
            "proxy_domain": metadata["e_proxyDomainName"],
            "proxy_id": metadata["e_proxyId"],
            "database": self.repo.database
        }
        
        print(f"[EmergencyService] 📤 Sending trigger message to Kafka topic 'emergency-trigger' for {campaign_id}")
        await send_message("emergency-trigger", str(campaign_id), orchestration_msg)
        print(f"[EmergencyService] ✅ Message sent successfully for {campaign_id}")
        return {"status": "SUCCESS", "message": "Campaign triggered successfully", "campaign_id": campaign_id}

    async def stop_campaign(self, campaign_id: int, account_id: int, account_no: str) -> Dict[str, Any]:
        # 1. Get Details
        campaign = await self.repo.get_campaign_details(campaign_id)
        if not campaign:
            return {"status": "ERROR", "message": "Campaign not found"}
            
        metadata = campaign["metadata"]
        
        # 2. Update status to COMPLETED (as a stop state)
        await self.repo.update_status(campaign_id, "COMPLETED")
        
        # 3. Construct stop message
        stop_msg = {
            "campaign_id": campaign_id,
            "account_no": account_no,
            "action": "STOP",
            "priority": metadata["e_priority"],
            "category": metadata["e_category"],
            "proxy_domain": metadata["e_proxyDomainName"],
            "proxy_id": metadata["e_proxyId"]
        }
        
        await send_message("emergency-trigger", str(campaign_id), stop_msg)
        return {"status": "SUCCESS", "message": "Campaign stop command sent", "campaign_id": campaign_id}

    async def get_all_campaigns(self, account_id: int, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        return await self.repo.fetch_campaigns(account_id, limit, offset)

    async def get_campaign(self, campaign_id: int) -> Optional[Dict[str, Any]]:
        return await self.repo.get_campaign_details(campaign_id)

    async def create_group(self, request: EmergencyGroupCreateRequest, account_id: int, account_no: str) -> int:
        return await self.repo.create_group(request, account_id, account_no)

    async def get_all_groups(self, account_id: int, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        return await self.repo.fetch_groups(account_id, limit, offset)

    async def get_contacts(self, group_id: int) -> List[Dict[str, str]]:
        return await self.repo.get_group_contacts(group_id)

    async def delete_group(self, group_id: int, account_id: int):
        await self.repo.delete_group(group_id, account_id)

    async def update_group(self, group_id: int, request: EmergencyGroupCreateRequest, account_id: int):
        await self.repo.update_group(group_id, request.name, [c.model_dump() for c in request.contacts], account_id)

    async def store_ivr_cdr(self, data: Dict[str, Any]):
        await self.repo.store_ivr_log(data)

    async def get_campaign_report(self, campaign_id: int) -> EmergencyReportResponse:
        ivr_logs = await self.repo.get_ivr_logs(campaign_id)
        wa_logs = await self.repo.get_whatsapp_logs(campaign_id)
        sms_logs = await self.repo.get_sms_logs(campaign_id)
        
        # Get campaign name
        campaign_details = await self.repo.get_campaign_details(campaign_id)
        campaign_name = getattr(campaign_details, "e_campaignName", "Unknown") if campaign_details else "Unknown"

        summary = {
            "Total": len(ivr_logs) + len(wa_logs) + len(sms_logs),
            "Answered/Read": 0,
            "No Answer/Delivered": 0,
            "Busy": 0,
            "Failed": 0,
            "Other": 0
        }
        
        report_logs = []
        
        # Process IVR logs
        for log in ivr_logs:
            disp = log.get("c_disposition")
            if disp == "ANSWER":
                summary["Answered/Read"] += 1
            elif disp == "NO_ANSWER":
                summary["No Answer/Delivered"] += 1
            elif disp == "BUSY":
                summary["Busy"] += 1
            elif disp in ["FAILED", "REJECTED"]:
                summary["Failed"] += 1
            else:
                summary["Other"] += 1
            
            resp = EmergencyIVRLogResponse.model_validate(log)
            resp.c_channel = "IVR"
            if not resp.c_campaignName:
                resp.c_campaignName = campaign_name
            report_logs.append(resp)
            
        # Process WA logs
        for log in wa_logs:
            disp = log.get("c_disposition", "PENDING")
            if disp == "READ":
                summary["Answered/Read"] += 1
            elif disp == "DELIVERED":
                summary["No Answer/Delivered"] += 1
            elif disp == "FAILED":
                summary["Failed"] += 1
            else:
                summary["Other"] += 1
            
            # WA logs already have c_channel="WA" from repo
            resp = EmergencyIVRLogResponse.model_validate(log)
            if not resp.c_campaignName:
                resp.c_campaignName = campaign_name
            report_logs.append(resp)

        # Process SMS logs
        for log in sms_logs:
            disp = log.get("c_disposition", "SENT")
            # Pinnacle statuses: DELIVRD, EXPIRED, UNDELIV, REJECTD, etc.
            if disp in ["DELIVRD", "delivered", "SUCCESS"]:
                summary["Answered/Read"] += 1
            elif disp in ["SENT", "sent", "SUBMITTED"]:
                summary["No Answer/Delivered"] += 1
            elif disp in ["UNDELIV", "failed", "REJECTD", "REJECTED"]:
                summary["Failed"] += 1
            else:
                summary["Other"] += 1
            
            resp = EmergencyIVRLogResponse.model_validate(log)
            if not resp.c_campaignName:
                resp.c_campaignName = campaign_name
            report_logs.append(resp)
            
        # Sort combined logs by time
        report_logs.sort(key=lambda x: x.c_createdOn, reverse=True)
            
        return EmergencyReportResponse(summary=summary, logs=report_logs)

    async def get_all_reports(self, account_id: int, limit: int = 100, offset: int = 0, campaign_id: Optional[int] = None, channel: Optional[str] = None, disposition: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, response_label: Optional[str] = None) -> EmergencyAllReportsResponse:
        report_logs = []
        total_counts = {}

        # 1. Fetch data from repositories in parallel
        # To handle unified pagination correctly, if channel is None, we fetch a larger pool
        fetch_limit = limit + offset if not channel else limit
        fetch_offset = 0 if not channel else offset
        
        # Parse dates
        start_dt = None
        if start_date:
            try: start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00')).replace(tzinfo=None)
            except: pass
        end_dt = None
        if end_date:
            try: end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00')).replace(tzinfo=None)
            except: pass

        import asyncio
        
        # Define helper to fetch IVR data if needed
        async def fetch_ivr():
            if not channel or channel == "IVR":
                logs = await self.repo.get_all_ivr_logs(account_id, fetch_limit, fetch_offset, campaign_id, disposition, start_dt, end_dt, response_label)
                count = await self.repo.get_all_ivr_logs_count(account_id, campaign_id, disposition, start_dt, end_dt, response_label)
                return logs, count
            return [], 0

        # Define helper to fetch WA data if needed
        async def fetch_wa():
            if not channel or channel == "WA":
                logs = await self.repo.get_all_whatsapp_logs(account_id, fetch_limit, fetch_offset, campaign_id, disposition, start_dt, end_dt, response_label)
                count = await self.repo.get_all_whatsapp_logs_count(account_id, campaign_id, disposition, start_dt, end_dt, response_label)
                return logs, count
            return [], 0

        # Define helper to fetch SMS data if needed
        async def fetch_sms():
            if not channel or channel == "SMS":
                # SMS doesn't have interactive response labels in same way yet
                logs = await self.repo.get_all_sms_logs(account_id, fetch_limit, fetch_offset, campaign_id, disposition, start_dt, end_dt)
                count = await self.repo.get_all_sms_logs_count(account_id, campaign_id, disposition, start_dt, end_dt)
                return logs, count
            return [], 0

        (ivr_logs_raw, ivr_count), (wa_logs_raw, wa_count), (sms_logs_raw, sms_count) = await asyncio.gather(fetch_ivr(), fetch_wa(), fetch_sms())
        total_counts["IVR"] = ivr_count
        total_counts["WA"] = wa_count
        total_counts["SMS"] = sms_count

        # 2. Collect unique campaign IDs for name lookup
        all_logs = ivr_logs_raw + wa_logs_raw + sms_logs_raw
        needed_ids = list({log.get("c_campaignId") for log in all_logs if log.get("c_campaignId") and log.get("c_campaignId") not in self._campaign_name_cache})

        # Batch lookup names for only missing IDs
        if needed_ids:
            new_names = await self.repo.get_campaign_names_batch(needed_ids)
            self._campaign_name_cache.update(new_names)

        # 3. Process and convert to DTOs
        for log in ivr_logs_raw:
            resp = EmergencyIVRLogResponse.model_validate(log)
            resp.c_channel = "IVR"
            if not resp.c_campaignName:
                resp.c_campaignName = self._campaign_name_cache.get(resp.c_campaignId, "Unknown")
            report_logs.append(resp)

        for log in wa_logs_raw:
            resp = EmergencyIVRLogResponse.model_validate(log)
            if not resp.c_campaignName:
                resp.c_campaignName = self._campaign_name_cache.get(resp.c_campaignId, "Unknown")
            report_logs.append(resp)

        for log in sms_logs_raw:
            resp = EmergencyIVRLogResponse.model_validate(log)
            if not resp.c_campaignName:
                resp.c_campaignName = self._campaign_name_cache.get(resp.c_campaignId, "Unknown")
            report_logs.append(resp)

        # 4. Sort and Slice for global pagination
        def normalize_dt(dt: datetime):
            if not dt: return datetime.min
            # If naive, assume it's UTC (common for SQL logs)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            # If aware, convert to UTC
            return dt.astimezone(timezone.utc)

        report_logs.sort(key=lambda x: normalize_dt(x.c_createdOn), reverse=True)
        
        if not channel:
            # Apply global offset/limit to the combined pool
            report_logs = report_logs[offset : offset + limit]
            total = sum(total_counts.values())
        else:
            # If specifically one channel, list is already limited/offset from repo
            total = total_counts.get(channel, 0)

        return EmergencyAllReportsResponse(total=total, logs=report_logs)

    async def get_dashboard_data_kpis(self, account_id: int, campaign_id: Optional[int] = None):
        return await self.repo.get_dashboard_stats_kpis(account_id, campaign_id)

    async def get_dashboard_data_missions(self, account_id: int, campaign_id: Optional[int] = None):
        return await self.repo.get_dashboard_stats_missions(account_id, campaign_id)

    async def get_dashboard_data_charts(self, account_id: int, campaign_id: Optional[int] = None):
        return await self.repo.get_dashboard_stats_charts(account_id, campaign_id)

    async def get_dashboard_data_responses(self, account_id: int, campaign_id: Optional[int] = None):
        return await self.repo.get_dashboard_stats_responses(account_id, campaign_id)

    async def get_dashboard_data(self, account_id: int, campaign_id: Optional[int] = None) -> EmergencyDashboardResponse:
        stats = await self.repo.get_dashboard_stats(account_id, campaign_id)
        # Using model_validate with partial data if needed, or ensuring full shape
        return EmergencyDashboardResponse.model_validate(stats)

    async def get_response_members(self, account_id: int, request: EmergencyResponseMembersRequest) -> List[Dict[str, Any]]:
        return await self.repo.get_response_members(account_id, request)

    async def get_sms_templates(self) -> List[Dict[str, Any]]:
        return await self.repo.fetch_sms_templates()
    async def get_all_reports_export(self, account_id, campaign_id=None, channel=None, disposition=None, start_date=None, end_date=None, response_label=None):
        """Fetches all logs without limit for CSV export"""
        import io
        import csv
        from datetime import datetime
        
        # 1. Reuse logic from get_all_reports but without limit/offset
        # Fetching everything (limit 1000000 as "infinity" for export)
        result = await self.get_all_reports(
            account_id, 
            limit=1000000, 
            offset=0, 
            campaign_id=campaign_id, 
            channel=channel, 
            disposition=disposition, 
            start_date=start_date, 
            end_date=end_date,
            response_label=response_label
        )
        logs = result.logs

        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "Timestamp", "Campaign Name", "Lead Number", "Channel", 
            "Disposition", "Duration (s)", "Message Content", "Capture Response"
        ])
        
        for log in logs:
            # Explicitly format date to avoid Excel's auto-formatting issues
            formatted_date = log.c_createdOn.strftime('%Y-%m-%d %H:%M:%S') if isinstance(log.c_createdOn, datetime) else str(log.c_createdOn)
            
            writer.writerow([
                formatted_date,
                log.c_campaignName,
                str(log.c_customerPhoneno), # Ensure phone is treated as string
                log.c_channel,
                log.c_disposition,
                log.c_duration,
                log.c_messageContent if log.c_channel != 'WA' else "WhatsApp Template",
                log.c_ivrResponse
            ])

        output.seek(0)
        return output.getvalue().encode('utf-8')
