from db.context import get_async_engine, asyncClientFactory, get_async_engineO
from sqlalchemy import select, insert, update, delete, desc, func, case
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from models.db import EmergencyCampaign, EmergencyGroup, EmergencyGroupContact, EmergencyIVRLog, SmsReport, EmergencySmsTemplate, CallFlows
from models.dto import EmergencyCampaignCreateRequest, EmergencyGroupCreateRequest, EmergencyResponseMembersRequest, EmergencyDashboardResponse
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timedelta
import asyncio
import re
import json
from sqlalchemy import and_, or_

class EmergencyRepo:
    def __init__(self, database: str):
        self.database = database
        self.async_engine = get_async_engine(database)
        self.async_session_maker = sessionmaker(self.async_engine, expire_on_commit=False, class_=AsyncSession)
        
        # Engine for SMS reports database
        self.sms_engine = get_async_engineO("connecthub_sms_db")
        self.sms_session_maker = sessionmaker(self.sms_engine, expire_on_commit=False, class_=AsyncSession)
        
        # primary mongo for orchestrations
        self.mongo_client, self.mongo_db = asyncClientFactory("emergency_orchestration")
        # mongo for activity tracking (logs)
        self.onedb_client, self.onedb = asyncClientFactory("onedb")

    async def _resolve_ivr_mappings(self, account_id, today_start, db):
        """Builds a map of { campaign_id: { digit: label } } for today's campaigns"""
        from models.db import CallFlows, EmergencyCampaign
        from bson import ObjectId
        mappings = {}
        
        # Handle string input for today_start
        if isinstance(today_start, str):
            try:
                today_start = datetime.fromisoformat(today_start.replace(' ', 'T'))
            except:
                today_start = datetime.utcnow()
                
        # Look back 90 days to catch older campaigns for reports
        lookback_start = today_start - timedelta(days=90)
        async with self.async_session_maker() as s_session:
            # Fetch all campaigns from recent window for this account
            stmt = select(EmergencyCampaign).where(
                and_(
                    EmergencyCampaign.e_accountId == account_id,
                    EmergencyCampaign.e_createdOn >= lookback_start
                )
            )
            res = await s_session.execute(stmt)
            campaigns = res.scalars().all()
            
            for camp in campaigns:
                if camp.e_orchestrationId:
                    try:
                        orch_id = camp.e_orchestrationId if isinstance(camp.e_orchestrationId, ObjectId) else ObjectId(camp.e_orchestrationId)
                        orch = await self.mongo_db.orchestrations.find_one({"_id": orch_id})
                    except: orch = None
                        
                    if orch:
                        # Extract flowId from blocks in orchestration
                        # Orchestration formats vary: { data: { stages: [...] } } or { stages: [...] }
                        orch_data = orch.get("data", orch)
                        if isinstance(orch_data, str): 
                            try: orch_data = json.loads(orch_data)
                            except: pass
                            
                        stages = []
                        if isinstance(orch_data, list):
                            stages = orch_data
                        elif isinstance(orch_data, dict):
                            stages = orch_data.get("stages", orch_data.get("strategyFlow", []))
                            
                        flow_id = None
                        for stage in stages:
                            # Try common paths for flowId
                            config = stage.get("config", {})
                            fid = config.get("ivr", {}).get("flowId") or config.get("flowId") or stage.get("flowId")
                            if fid:
                                flow_id = fid
                                break
                        
                        # Pre-initialize campaign's mapping dict
                        mappings[camp.e_campaignId] = {}
                        
                        # 1. First priority: Direct labels in orchestration triggers (IVR and WhatsApp)
                        for stage in stages:
                            trig_data = stage.get("triggers", {})
                            # Try multiple possible keys for trigger mappings
                            triggers = trig_data.get("IVR", trig_data.get("buttons", trig_data.get("whatsapp", {})))
                            if not triggers and stage.get("type") == "Wait for Response":
                                triggers = stage.get("config", {}).get("buttons", {})
                            
                            for k, v in triggers.items():
                                if isinstance(v, str) and not v.strip().lower().startswith("press"):
                                    lbl = v.strip()
                                    # Map strictly, and also in normalized Uppercase
                                    mappings[camp.e_campaignId][str(k)] = lbl
                                    mappings[camp.e_campaignId][str(lbl).upper()] = lbl
                        
                        # Added: Look for any string value in triggers as potential labels
                        for stage in stages:
                            trigs = stage.get("triggers", {})
                            if isinstance(trigs, dict):
                                for vk, vv in trigs.items():
                                    if isinstance(vv, dict): # Nested triggers
                                        for subk, subv in vv.items():
                                            if isinstance(subv, str) and len(subv) < 50:
                                                mappings[camp.e_campaignId][subv.strip().upper()] = subv.strip()
                            # Fallback config button catch
                            btns = stage.get("config", {}).get("buttons", {})
                            if isinstance(btns, dict):
                                for bk, bv in btns.items():
                                    if isinstance(bv, str):
                                        mappings[camp.e_campaignId][bv.strip().upper()] = bv.strip()
                        
                        # 2. Second priority (Fallback): Resolve from CallFlow nodes
                        if not mappings[camp.e_campaignId] and flow_id:
                            try:
                                flow_stmt = select(CallFlows).where(CallFlows.c_callflowId == int(flow_id))
                                flow_res = await s_session.execute(flow_stmt)
                                f_obj = flow_res.scalar_one_or_none()
                                if f_obj and f_obj.c_callflowData:
                                    cf_data = f_obj.c_callflowData
                                    if isinstance(cf_data, str): cf_data = json.loads(cf_data)
                                    nodes = {str(n.get("id")): n for n in cf_data.get("nodes", [])}
                                    
                                    for node_id, node in nodes.items():
                                        # Handle 'buttons' (often in custom node data)
                                        btns = node.get("data", {}).get("buttons") or node.get("buttons", [])
                                        # Handle 'dtmf_output' (often in 'Play and Get Input' nodes)
                                        dtmfs = node.get("data", {}).get("dtmf_output") or node.get("dtmf_output", {})
                                        
                                        if isinstance(btns, list):
                                            for btn in btns:
                                                key = str(btn.get("key"))
                                                title = btn.get("label") or btn.get("text") or btn.get("title")
                                                target_node_id = str(btn.get("nodeId") or btn.get("id"))
                                                # Look for target node label if current label generic
                                                if title and title.strip().lower().startswith("press") and target_node_id in nodes:
                                                    tnode = nodes[target_node_id]
                                                    title = tnode.get("label") or tnode.get("data", {}).get("title") or tnode.get("name") or title
                                                if key and title:
                                                    mappings[camp.e_campaignId][key] = title.strip()
                                                    mappings[camp.e_campaignId][title.strip().upper()] = title.strip()
                                                    
                                        if isinstance(dtmfs, dict):
                                            for key, target in dtmfs.items():
                                                tid = str(target.get("id") if isinstance(target, dict) else target)
                                                if tid in nodes:
                                                    tnode = nodes[tid]
                                                    title = tnode.get("label") or tnode.get("data", {}).get("title") or tnode.get("name")
                                                    if key and title:
                                                        mappings[camp.e_campaignId][str(key)] = title.strip()
                                                        mappings[camp.e_campaignId][title.strip().upper()] = title.strip()
                            except: pass
        return mappings

    def _parse_dt(self, dt_val):
        """Helper to parse timestamp from ISO string or datetime object"""
        if isinstance(dt_val, datetime):
            return dt_val.replace(tzinfo=None) if dt_val.tzinfo else dt_val
        if isinstance(dt_val, str):
            try:
                dt = datetime.fromisoformat(dt_val.replace('Z', '+00:00'))
                return dt.replace(tzinfo=None)
            except:
                return datetime.utcnow()
        return datetime.utcnow()
    
    def _normalize_sms_disposition(self, status: str) -> str:
        """Normalizes short codes from Pinnacle to full words"""
        if not status:
            return "SENT"
        status_upper = status.upper()
        mapping = {
            "REJECTD": "REJECTED",
            "DELIVRD": "DELIVERED",
            "UNDELIV": "UNDELIVERED"
        }
        return mapping.get(status_upper, status_upper)

    async def create_campaign(self, request: EmergencyCampaignCreateRequest, account_id: int, account_no: str) -> int:
        async with self.async_session_maker() as session:
            # 1. Store orchestration data in MongoDB if provided
            orchestration_id = None
            if request.e_orchestrationData:
                result = await self.mongo_db.orchestrations.insert_one({
                    "account_id": account_id,
                    "account_no": account_no,
                    "campaign_name": request.e_campaignName,
                    "data": request.e_orchestrationData,
                    "created_at": datetime.utcnow()
                })
                orchestration_id = str(result.inserted_id)

            # Calculate total leads if a group is selected
            total_leads = 0
            if request.e_orchestrationData:
                audience = request.e_orchestrationData.get("audience", {})
                group_id = audience.get("groupId")
                if group_id:
                    count_stmt = select(func.count(EmergencyGroupContact.egc_recordId)).where(EmergencyGroupContact.egc_groupId == int(group_id))
                    count_result = await session.execute(count_stmt)
                    total_leads = count_result.scalar() or 0

            # 2. Store metadata in MySQL
            campaign = EmergencyCampaign(
                e_accountId=account_id,
                e_accountNo=account_no,
                e_campaignName=request.e_campaignName,
                e_priority=request.e_priority.value,
                e_category=request.e_category,
                e_primaryLanguage=request.e_primaryLanguage,
                e_interactionMode=request.e_interactionMode,
                e_status='SCHEDULED' if request.e_scheduleType.value == 'SCHEDULED' else 'DRAFT',
                e_scheduleType=request.e_scheduleType.value,
                e_scheduleTime=request.e_scheduleTime,
                e_orchestrationId=orchestration_id,
                e_totalLeads=total_leads,
                e_proxyId=request.e_proxyId,
                e_proxyDomainName=request.e_proxyDomainName,
                e_proxyDirectoryName=request.e_proxyDirectoryName
            )
            session.add(campaign)
            await session.commit()
            await session.refresh(campaign)
            return campaign.e_campaignId

    async def fetch_campaigns(self, account_id: int, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        async with self.async_session_maker() as session:
            stmt = select(EmergencyCampaign).where(EmergencyCampaign.e_accountId == account_id).order_by(desc(EmergencyCampaign.e_createdOn)).offset(offset).limit(limit)
            result = await session.execute(stmt)
            campaigns = result.scalars().all()
            
            results = []
            from bson import ObjectId
            for c in campaigns:
                channels = []
                if c.e_orchestrationId:
                    orchestration = await self.mongo_db.orchestrations.find_one({"_id": ObjectId(c.e_orchestrationId)})
                    if orchestration and "data" in orchestration:
                        # Extract unique channels from all blocks in orchestration
                        unique_channels = set()
                        orchestration_data = orchestration["data"]
                        
                        # Fix: If orchestration_data is a string, try to parse it as JSON
                        if isinstance(orchestration_data, str):
                            import json
                            try:
                                orchestration_data = json.loads(orchestration_data)
                            except:
                                pass

                        # Handle both direct list or dict with strategyFlow
                        flow = []
                        if isinstance(orchestration_data, list):
                            flow = orchestration_data
                        elif isinstance(orchestration_data, dict):
                            flow = orchestration_data.get("stages", [])
                            
                        if isinstance(flow, list):
                            for block in flow:
                                if isinstance(block, dict):
                                    for ch in block.get("channels", []):
                                        unique_channels.add(ch)
                        channels = list(unique_channels)

                results.append({
                    "e_campaignId": c.e_campaignId,
                    "e_campaignName": c.e_campaignName,
                    "e_priority": c.e_priority,
                    "e_category": c.e_category,
                    "e_status": c.e_status,
                    "e_proxyDomainName": c.e_proxyDomainName,
                    "e_totalLeads": c.e_totalLeads,
                    "e_reachedLeads": c.e_reachedLeads,
                    "e_createdOn": c.e_createdOn,
                    "e_orchestrationId": c.e_orchestrationId,
                    "channels": channels
                })
            return results

    async def get_campaign_names_batch(self, campaign_ids: List[int]) -> Dict[int, str]:
        if not campaign_ids:
            return {}
        async with self.async_session_maker() as session:
            stmt = select(EmergencyCampaign.e_campaignId, EmergencyCampaign.e_campaignName).where(EmergencyCampaign.e_campaignId.in_(campaign_ids))
            result = await session.execute(stmt)
            return {row.e_campaignId: row.e_campaignName for row in result.all()}

    async def get_campaign_details(self, campaign_id: int) -> Optional[Dict[str, Any]]:
        async with self.async_session_maker() as session:
            stmt = select(EmergencyCampaign).where(EmergencyCampaign.e_campaignId == campaign_id)
            result = await session.execute(stmt)
            campaign = result.scalar_one_or_none()
            if not campaign:
                return None
            
            details = {
                "metadata": {
                    "e_campaignId": campaign.e_campaignId,
                    "e_campaignName": campaign.e_campaignName,
                    "e_priority": campaign.e_priority,
                    "e_category": campaign.e_category,
                    "e_primaryLanguage": campaign.e_primaryLanguage,
                    "e_interactionMode": campaign.e_interactionMode,
                    "e_status": campaign.e_status,
                    "e_scheduleType": campaign.e_scheduleType,
                    "e_scheduleTime": campaign.e_scheduleTime,
                    "e_proxyId": campaign.e_proxyId,
                    "e_proxyDomainName": campaign.e_proxyDomainName,
                    "e_proxyDirectoryName": campaign.e_proxyDirectoryName
                }
            }

            if campaign.e_orchestrationId:
                from bson import ObjectId
                orchestration = await self.mongo_db.orchestrations.find_one({"_id": ObjectId(campaign.e_orchestrationId)})
                if orchestration:
                    details["orchestration"] = orchestration["data"]
            
            return details

    async def recalculate_reach_count(self, campaign_id: int):
        """Calculates unique reached leads across all channels and updates the campaign table"""
        async with self.async_session_maker() as session:
            # 1. Get reached from IVR (SQL)
            ivr_stmt = select(EmergencyIVRLog.c_customerPhoneno).where(
                EmergencyIVRLog.c_campaignId == campaign_id,
                EmergencyIVRLog.c_disposition == "ANSWER"
            )
            ivr_result = await session.execute(ivr_stmt)
            ivr_reached = {r[0][-10:] if len(r[0]) >= 10 else r[0] for r in ivr_result.all()}

            # 2. Get reached from WhatsApp (MongoDB)
            # We count 'read' status or any 'Inbound' activity for this campaign
            reached_leads = set(ivr_reached)
            
            try:
                wa_read_cursor = self.onedb.activities.find({
                    "campaignId": campaign_id,
                    "channel": "Whatsapp",
                    "direction": "Outbound",
                    "updatedStatus.status": {"$in": ["read", "delivered"]}
                }, {"details.m_dst": 1})
                
                async for doc in wa_read_cursor:
                    dst = doc.get("details", {}).get("m_dst")
                    if dst:
                        lead = dst[-10:] if len(dst) >= 10 else dst
                        reached_leads.add(lead)

                # 2b. Check outbound SMS messages
                sms_delivered_cursor = self.onedb.activities.find({
                    "campaignId": campaign_id,
                    "channel": "SMS",
                    "direction": "Outbound",
                    "updatedStatus.status": {"$in": ["sent", "delivered", "success", "accepted", "SENT", "DELIVERED"]}
                }, {"details.m_dst": 1})

                async for doc in sms_delivered_cursor:
                    dst = doc.get("details", {}).get("m_dst")
                    if dst:
                        lead = dst[-10:] if len(dst) >= 10 else dst
                        reached_leads.add(lead)

                # 2c. Check inbound activities from leads after campaign started
                # (Assuming any inbound reply to an emergency campaign is a success)
                # First, find when the campaign was created/launched
                camp_stmt = select(EmergencyCampaign.e_createdOn).where(EmergencyCampaign.e_campaignId == campaign_id)
                camp_res = await session.execute(camp_stmt)
                start_time = camp_res.scalar()
                
                if start_time:
                    # Look for ANY inbound from recipients in this campaign 
                    inbound_cursor = self.onedb.activities.find({
                        "channel": "Whatsapp",
                        "direction": "Inbound",
                        "activityTimestamp": {"$gte": start_time.isoformat()}
                    }, {"details.m_src": 1})
                    
                    async for doc in inbound_cursor:
                        src = doc.get("details", {}).get("m_src")
                        if src:
                            lead = src[-10:] if len(src) >= 10 else src
                            reached_leads.add(lead)
            except Exception as e:
                import logging
                logging.getLogger("emergency-repo").error(f"Error calculating WhatsApp reach: {e}")

            # 3. Update the Campaign table
            final_count = len(reached_leads)
            update_stmt = update(EmergencyCampaign).where(EmergencyCampaign.e_campaignId == campaign_id).values(e_reachedLeads=final_count)
            await session.execute(update_stmt)
            await session.commit()
            return final_count

    async def update_status(self, campaign_id: int, status: str):
        async with self.async_session_maker() as session:
            stmt = update(EmergencyCampaign).where(EmergencyCampaign.e_campaignId == campaign_id).values(e_status=status)
            await session.execute(stmt)
            await session.commit()

    async def clear_campaign_logs(self, campaign_id: int):
        """Removes all previous logs for a campaign to allow a fresh restart"""
        # 1. Clear IVR Logs (SQL)
        from models.db import EmergencyIVRLog
        from sqlalchemy import delete
        async with self.async_session_maker() as session:
            stmt = delete(EmergencyIVRLog).where(EmergencyIVRLog.c_campaignId == campaign_id)
            await session.execute(stmt)
            # Reset reachedLeads count
            reset_stmt = update(EmergencyCampaign).where(EmergencyCampaign.e_campaignId == campaign_id).values(e_reachedLeads=0)
            await session.execute(reset_stmt)
            await session.commit()
        
        # 2. Clear Activity Logs (MongoDB)
        try:
            await self.onedb.activities.delete_many({"campaignId": campaign_id})
        except Exception as e:
            import logging
            logging.getLogger("emergency-repo").error(f"Error clearing Mongo logs for {campaign_id}: {e}")

    async def create_group(self, request: EmergencyGroupCreateRequest, account_id: int, account_no: str) -> int:
        async with self.async_session_maker() as session:
            group = EmergencyGroup(
                eg_accountId=account_id,
                eg_accountNo=account_no,
                eg_groupName=request.name
            )
            session.add(group)
            await session.flush()

            contacts = [
                EmergencyGroupContact(
                    egc_groupId=group.eg_groupId,
                    egc_contactName=c.name,
                    egc_contactPhone=c.phone
                ) for c in request.contacts
            ]
            session.add_all(contacts)
            await session.commit()
            return group.eg_groupId

    async def fetch_groups(self, account_id: int, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        async with self.async_session_maker() as session:
            # Subquery to count contacts per group
            count_stmt = (
                select(EmergencyGroupContact.egc_groupId, func.count(EmergencyGroupContact.egc_recordId).label("contact_count"))
                .group_by(EmergencyGroupContact.egc_groupId)
                .subquery()
            )

            stmt = (
                select(EmergencyGroup, count_stmt.c.contact_count)
                .outerjoin(count_stmt, count_stmt.c.egc_groupId == EmergencyGroup.eg_groupId)
                .where(EmergencyGroup.eg_accountId == account_id)
                .order_by(desc(EmergencyGroup.eg_createdOn))
                .offset(offset)
                .limit(limit)
            )
            result = await session.execute(stmt)
            groups = result.all()
            return [
                {
                    "id": g.EmergencyGroup.eg_groupId,
                    "name": g.EmergencyGroup.eg_groupName,
                    "contactCount": g.contact_count or 0,
                    "created_at": g.EmergencyGroup.eg_createdOn
                } for g in groups
            ]

    async def get_group_contacts(self, group_id: int) -> List[Dict[str, str]]:
        async with self.async_session_maker() as session:
            stmt = select(EmergencyGroupContact).where(EmergencyGroupContact.egc_groupId == group_id)
            result = await session.execute(stmt)
            contacts = result.scalars().all()
            return [
                {
                    "name": c.egc_contactName,
                    "phone": c.egc_contactPhone
                } for c in contacts
            ]

    async def delete_group(self, group_id: int, account_id: int):
        async with self.async_session_maker() as session:
            stmt = delete(EmergencyGroup).where(
                EmergencyGroup.eg_groupId == group_id,
                EmergencyGroup.eg_accountId == account_id
            )
            await session.execute(stmt)
            await session.commit()

    async def update_group(self, group_id: int, name: str, contacts: List[Dict[str, str]], account_id: int):
        async with self.async_session_maker() as session:
            # 1. Update Group Name
            stmt = update(EmergencyGroup).where(
                EmergencyGroup.eg_groupId == group_id,
                EmergencyGroup.eg_accountId == account_id
            ).values(eg_groupName=name)
            await session.execute(stmt)

            # 2. Delete existing contacts
            del_stmt = delete(EmergencyGroupContact).where(EmergencyGroupContact.egc_groupId == group_id)
            await session.execute(del_stmt)

            # 3. Add new contacts
            new_contacts = [
                EmergencyGroupContact(
                    egc_groupId=group_id,
                    egc_contactName=c.get("name"),
                    egc_contactPhone=c.get("phone")
                ) for c in contacts
            ]
            session.add_all(new_contacts)
            await session.commit()

    async def fetch_due_campaigns(self) -> List[Dict[str, Any]]:
        async with self.async_session_maker() as session:
            now = datetime.utcnow()
            stmt = select(EmergencyCampaign).where(
                EmergencyCampaign.e_status == 'SCHEDULED',
                EmergencyCampaign.e_scheduleTime <= now
            )
            result = await session.execute(stmt)
            campaigns = result.scalars().all()
            return [
                {
                    "e_campaignId": c.e_campaignId,
                    "e_accountId": c.e_accountId,
                    "e_accountNo": c.e_accountNo,
                    "e_status": c.e_status,
                    "database": self.database
                } for c in campaigns
            ]
    async def store_ivr_log(self, data: Dict[str, Any]):
        async with self.async_session_maker() as session:
            log = EmergencyIVRLog(
                c_accountId=data.get("account_id"),
                c_accountNo=data.get("account_no"),
                c_callId=data.get("call_id"),
                c_customerPhoneno=data.get("lead_number"),
                c_disposition=data.get("disposition"),
                c_startTime=str(data.get("start_time")),
                c_endTime=str(data.get("end_time")),
                c_answerTime=str(data.get("answer_time")),
                c_duration=int(data.get("duration", 0)),
                c_ivrResponse=data.get("ivr_response"),
                c_campaignId=data.get("campaign_id")
            )
            session.add(log)
            
            # Increment and update reachedLeads if successfully Answered
            if data.get("disposition") == "ANSWER":
                reached_stmt = (
                    update(EmergencyCampaign)
                    .where(EmergencyCampaign.e_campaignId == data.get("campaign_id"))
                    .values(e_reachedLeads = EmergencyCampaign.e_reachedLeads + 1)
                )
                await session.execute(reached_stmt)

            await session.commit()

    async def get_ivr_logs(self, campaign_id: int) -> List[Dict[str, Any]]:
        async with self.async_session_maker() as session:
            # 1. Fetch Logs
            stmt = (
                select(EmergencyIVRLog, EmergencyCampaign.e_campaignName, EmergencyCampaign.e_accountId, EmergencyCampaign.e_createdOn)
                .outerjoin(EmergencyCampaign, EmergencyIVRLog.c_campaignId == EmergencyCampaign.e_campaignId)
                .where(EmergencyIVRLog.c_campaignId == campaign_id)
                .order_by(desc(EmergencyIVRLog.c_createdOn))
            )
            result = await session.execute(stmt)
            
            # Resolve mappings (only if we have results)
            rows = result.all()
            if not rows:
                return []
            
            # Use the first row's account info to resolve labels
            account_id = rows[0][2]
            created_on = rows[0][3] or datetime.utcnow()
            mappings = await self._resolve_ivr_mappings(account_id, created_on, self.onedb)
            my_map = mappings.get(campaign_id, {})

            logs = []
            for log, name, acc_id, c_on in rows:
                log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
                log_dict["c_campaignName"] = name or "Deleted Campaign"
                log_dict["c_messageContent"] = "IVR Prompt/Flow"
                
                # Transform Response digit to Label
                raw_res = str(log.c_ivrResponse or "").strip()
                if raw_res:
                    log_dict["c_ivrResponse"] = my_map.get(raw_res, f"Wrong Input ({raw_res})")
                else:
                    log_dict["c_ivrResponse"] = "-"

                logs.append(log_dict)
            return logs

    async def get_whatsapp_logs(self, campaign_id: int) -> List[Dict[str, Any]]:
        """Fetch WhatsApp logs from onedb.activities for a campaign"""
        pipeline = [
            {
                "$match": {
                    "campaignId": campaign_id,
                    "channel": "Whatsapp",
                    "direction": "Outbound"
                }
            },
            {
                "$lookup": {
                    "from": "activities",
                    "let": { "lead": "$details.m_dst", "outTime": "$activityTimestamp" },
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        { "$eq": ["$channel", "Whatsapp"] },
                                        { "$eq": ["$direction", "Inbound"] },
                                        { "$eq": ["$details.m_src", "$$lead"] },
                                        { "$gt": ["$activityTimestamp", "$$outTime"] }
                                    ]
                                }
                            }
                        },
                        { "$sort": { "activityTimestamp": 1 } },
                        { "$limit": 1 }
                    ],
                    "as": "replies"
                }
            },
            {"$sort": {"activityTimestamp": -1}}
        ]
        
        cursor = self.onedb.activities.aggregate(pipeline)
        logs = []
        
        async for doc in cursor:
            # Manual projection to ensure Pydantic compliance
            out_ts = doc.get("activityTimestamp") or doc.get("createdOn")
            
            mapped = {
                "c_logId": str(doc.get("_id")),
                "c_callId": doc.get("msgId") or "N/A",
                "c_customerPhoneno": doc.get("details", {}).get("m_dst") or doc.get("details", {}).get("m_src") or "",
                "c_disposition": "PENDING",
                "c_channel": "WA",
                "c_campaignId": doc.get("campaignId") or 0,
                "c_ivrResponse": "",
                "c_messageContent": doc.get("details", {}).get("m_receiveMsg") or "",
                "c_createdOn": self._parse_dt(out_ts)
            }

            # Extract disposition
            statuses = doc.get("updatedStatus")
            if statuses and isinstance(statuses, list):
                mapped["c_disposition"] = statuses[-1].get("status", "PENDING").upper()
            
            # Extract reply
            replies = doc.get("replies", [])
            if replies:
                mapped["c_ivrResponse"] = replies[0].get("details", {}).get("m_receiveMsg") or ""
            
            logs.append(mapped)
            
        return logs

    async def get_sms_logs(self, campaign_id: int) -> List[Dict[str, Any]]:
        """Fetch SMS logs by joining MongoDB activity tracking with connecthub_sms_db.sms_reports"""
        # 1. Fetch SMS activities from MongoDB for this campaign
        pipeline = [
            {"$match": {"campaignId": campaign_id, "channel": "SMS", "direction": "Outbound"}},
            {"$project": {"phone": "$details.m_dst", "uniqueId": "$details.m_uniqueId", "activityTimestamp": 1}}
        ]
        cursor = self.onedb.activities.aggregate(pipeline)
        
        # Phone -> Activity mapping
        sms_activities = []
        async for doc in cursor:
            sms_activities.append(doc)
            
        if not sms_activities:
            return []
            
        unique_ids = [doc.get("uniqueId") for doc in sms_activities if doc.get("uniqueId")]
        
        # 2. Query MySQL connecthub_sms_db.sms_reports for delivery status
        report_map = {}
        if unique_ids:
            async with self.sms_session_maker() as session:
                stmt = select(SmsReport).where(SmsReport.unique_id.in_(unique_ids))
                result = await session.execute(stmt)
                for row in result.scalars().all():
                    report_map[row.unique_id] = row

        # 3. Combine results
        logs = []
        for activity in sms_activities:
            uid = activity.get("uniqueId")
            report = report_map.get(uid)
            
            logs.append({
                "c_logId": str(activity.get("_id")),
                "c_callId": uid or "N/A",
                "c_customerPhoneno": activity.get("phone", ""),
                "c_disposition": self._normalize_sms_disposition(report.delivery_status if report else "SENT"),
                "c_channel": "SMS",
                "c_campaignId": campaign_id,
                "c_ivrResponse": report.message_content if report else "",
                "c_createdOn": self._parse_dt(activity.get("activityTimestamp"))
            })
            
        return logs

    async def get_all_sms_logs(self, account_id: int, limit: int = 100, offset: int = 0, campaign_id: Optional[int] = None, disposition: Optional[str] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        acc_id_filter = [account_id, str(account_id)]
        if str(account_id).isdigit():
            acc_id_filter.append(int(account_id))

        query = {
            "accountId": {"$in": acc_id_filter},
            "channel": "SMS",
            "direction": "Outbound",
            "type": "Message"
        }
        
        if campaign_id:
            query["campaignId"] = campaign_id

        if start_date or end_date:
            query["activityTimestamp"] = {}
            if start_date:
                query["activityTimestamp"]["$gte"] = start_date.isoformat()
            if end_date:
                query["activityTimestamp"]["$lte"] = end_date.isoformat()

        # Fetch activities
        if disposition:
            # If filtering by disposition, we cannot use MongoDB skip/limit directly 
            # because "SENT" is a synthetic status determined after joining with MySQL.
            # We fetch a larger batch to ensure we can fill the page.
            LIMIT_GUARD = 5000
            cursor = self.onedb.activities.find(query).sort([("activityTimestamp", -1)]).limit(LIMIT_GUARD)
            activities = await cursor.to_list(length=LIMIT_GUARD)
        else:
            cursor = self.onedb.activities.find(query).sort([("activityTimestamp", -1)]).skip(offset).limit(limit)
            activities = await cursor.to_list(length=limit)
        
        if not activities:
            return []

        unique_ids = [doc.get("details", {}).get("m_uniqueId") for doc in activities if doc.get("details", {}).get("m_uniqueId")]
        # Fallback for records missing uniqueId: look up by mobile number
        missing_ids_numbers = [doc.get("details", {}).get("m_dst") for doc in activities if not doc.get("details", {}).get("m_uniqueId")]
        
        # Query MySQL connecthub_sms_db.sms_reports
        report_map = {}
        number_report_map = {} # Normalize: last 10 digits -> list of reports
        
        async with self.sms_session_maker() as session:
            # 1. Primary lookup by unique_id
            if unique_ids:
                stmt = select(SmsReport).where(SmsReport.unique_id.in_(unique_ids))
                # Only filter by status in SQL if it's NOT "SENT", 
                # because "SENT" items don't have reports in this table yet.
                if disposition and disposition.upper() != "SENT":
                    stmt = stmt.where(SmsReport.delivery_status == disposition.upper())
                result = await session.execute(stmt)
                for row in result.scalars().all():
                    report_map[row.unique_id] = row
            
            # 2. Fallback lookup by normalized phone number for recent reports (today)
            if missing_ids_numbers:
                normalized_missing = [n[-10:] for n in missing_ids_numbers if len(n) >= 10]
                if normalized_missing:
                    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                    fallback_stmt = select(SmsReport).where(
                        func.right(SmsReport.mobile_number, 10).in_(normalized_missing),
                        SmsReport.internal_created_at >= today_start
                    )
                    fallback_result = await session.execute(fallback_stmt)
                    for row in fallback_result.scalars().all():
                        num_10 = row.mobile_number[-10:]
                        if num_10 not in number_report_map:
                            number_report_map[num_10] = []
                        number_report_map[num_10].append(row)

        # Combine
        logs = []
        for activity in activities:
            uid = activity.get("details", {}).get("m_uniqueId")
            report = report_map.get(uid) if uid else None
            
            # Fallback by number if UID match failed
            if not report:
                dst = activity.get("details", {}).get("m_dst")
                if dst:
                    num_10 = dst[-10:]
                    potential_reports = number_report_map.get(num_10, [])
                    # Find the closest report by time (within 1 hour)
                    act_time = self._parse_dt(activity.get("activityTimestamp"))
                    best_match = None
                    min_diff = timedelta(hours=1)
                    
                    for r in potential_reports:
                        r_time = r.internal_created_at
                        if r_time:
                            # Normalize internal_created_at to naive for comparison
                            r_time_naive = r_time.replace(tzinfo=None) if r_time.tzinfo else r_time
                            diff = abs(r_time_naive - act_time)
                            if diff < min_diff:
                                min_diff = diff
                                best_match = r
                    report = best_match

            # If disposition filter is applied, we must check if this record matches
            current_status = report.delivery_status if report else "SENT"
            if disposition and current_status.upper() != disposition.upper():
                continue

            logs.append({
                "c_logId": str(activity.get("_id")),
                "c_callId": uid or "N/A",
                "c_customerPhoneno": activity.get("details", {}).get("m_dst", ""),
                "c_disposition": self._normalize_sms_disposition(report.delivery_status if report else "SENT"),
                "c_channel": "SMS",
                "c_campaignId": activity.get("campaignId") or 0,
                "c_ivrResponse": "",
                "c_messageContent": report.message_content if report else "",
                "c_createdOn": self._parse_dt(activity.get("activityTimestamp"))
            })

        # Apply limit and offset in memory ONLY if we fetched the large batch
        if disposition:
            return logs[offset : offset + limit]
            
        return logs

    async def get_all_sms_logs_count(self, account_id: int, campaign_id: Optional[int] = None, disposition: Optional[str] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> int:
        acc_id_filter = [account_id, str(account_id)]
        if str(account_id).isdigit():
            acc_id_filter.append(int(account_id))
            
        query = {
            "accountId": {"$in": acc_id_filter},
            "channel": "SMS",
            "direction": "Outbound",
            "type": "Message"
        }
        if campaign_id: query["campaignId"] = campaign_id
        
        # Consistent with get_all_sms_logs
        query["type"] = "Message"

        # For count, we only need to filter MongoDB activities.
        if start_date or end_date:
            query["activityTimestamp"] = {}
            if start_date:
                query["activityTimestamp"]["$gte"] = start_date.isoformat()
            if end_date:
                query["activityTimestamp"]["$lte"] = end_date.isoformat()

        # If no disposition filter, just return MongoDB count
        if not disposition:
            return await self.onedb.activities.count_documents(query)

        # If disposition is provided, we need to simulate the logic of get_all_sms_logs
        # to see which ones actually match the disposition after the join.
        # We fetch all relevant records (limited to a reasonable safety threshold)
        LIMIT_GUARD = 5000 
        cursor = self.onedb.activities.find(query).limit(LIMIT_GUARD)
        activities = await cursor.to_list(length=LIMIT_GUARD)
        if not activities:
            return 0
            
        # Perform the join logic similar to get_all_sms_logs
        unique_ids = [doc.get("details", {}).get("m_uniqueId") for doc in activities if doc.get("details", {}).get("m_uniqueId")]
        missing_ids_numbers = [doc.get("details", {}).get("m_dst") for doc in activities if not doc.get("details", {}).get("m_uniqueId")]
        
        report_map = {}
        number_report_map = {}
        
        async with self.sms_session_maker() as session:
            if unique_ids:
                stmt = select(SmsReport).where(SmsReport.unique_id.in_(unique_ids))
                res = await session.execute(stmt)
                for row in res.scalars().all():
                    report_map[row.unique_id] = row
            
            if missing_ids_numbers:
                normalized_missing = [n[-10:] for n in missing_ids_numbers if len(n) >= 10]
                if normalized_missing:
                    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                    fallback_stmt = select(SmsReport).where(
                        func.right(SmsReport.mobile_number, 10).in_(normalized_missing),
                        SmsReport.internal_created_at >= today_start
                    )
                    fallback_res = await session.execute(fallback_stmt)
                    for row in fallback_res.scalars().all():
                        num_10 = row.mobile_number[-10:]
                        if num_10 not in number_report_map:
                            number_report_map[num_10] = []
                        number_report_map[num_10].append(row)

        match_count = 0
        for activity in activities:
            uid = activity.get("details", {}).get("m_uniqueId")
            report = report_map.get(uid) if uid else None
            
            if not report:
                dst = activity.get("details", {}).get("m_dst")
                if dst:
                    num_10 = dst[-10:]
                    potential_reports = number_report_map.get(num_10, [])
                    act_time = self._parse_dt(activity.get("activityTimestamp"))
                    best_match = None
                    min_diff = timedelta(hours=1)
                    for r in potential_reports:
                        r_time = r.internal_created_at
                        if r_time:
                            r_time_naive = r_time.replace(tzinfo=None) if r_time.tzinfo else r_time
                            diff = abs(r_time_naive - act_time)
                            if diff < min_diff:
                                min_diff = diff
                                best_match = r
                    report = best_match

            current_status = self._normalize_sms_disposition(report.delivery_status if report else "SENT")
            if current_status.upper() == disposition.upper():
                match_count += 1
                
        return match_count

    async def get_all_ivr_logs(self, account_id: int, limit: int = 100, offset: int = 0, campaign_id: Optional[int] = None, disposition: Optional[str] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, response_label: Optional[str] = None) -> List[Dict[str, Any]]:
        async with self.async_session_maker() as session:
            # 🧩 1. Resolve mappings first if filtering/mapping labels
            mappings = await self._resolve_ivr_mappings(account_id, start_date or datetime.utcnow(), self.onedb)
            
            target_results = []
            if response_label:
                # Find all (CampaignId, Digit) pairs that match this label
                rl_lower = response_label.lower()
                for cid, camp_map in mappings.items():
                    if campaign_id and cid != campaign_id: continue
                    for digit, label in camp_map.items():
                        if label.lower() == rl_lower or str(digit).lower() == rl_lower:
                            target_results.append((cid, digit))
                
                # Handling "Wrong Input (X)" cases
                if "wrong input" in rl_lower:
                    digit_match = re.search(r'\((\d+)\)', rl_lower)
                    if digit_match:
                        # Specific wrong input: "Wrong Input (3)"
                        d = digit_match.group(1)
                        # We don't filter by cid here easily in SQL, but we'll try digit
                        target_results.append((None, d))
                
                if not target_results:
                    # Fallback If no mapping found and is numeric
                    if rl_lower.isdigit():
                        target_results.append((None, rl_lower))
                    else:
                        return [] # No mapping found

            stmt = (
                select(EmergencyIVRLog, EmergencyCampaign.e_campaignName)
                .outerjoin(EmergencyCampaign, EmergencyIVRLog.c_campaignId == EmergencyCampaign.e_campaignId)
                .where(EmergencyIVRLog.c_accountId == account_id)
            )
            
            if response_label:
                if not target_results: return [] # No mapping found for this label
                
                filters = []
                for cid, digit in target_results:
                    if cid: filters.append(and_(EmergencyIVRLog.c_campaignId == cid, EmergencyIVRLog.c_ivrResponse == digit))
                    else: filters.append(EmergencyIVRLog.c_ivrResponse == digit)
                stmt = stmt.where(or_(*filters))

            if campaign_id:
                stmt = stmt.where(EmergencyIVRLog.c_campaignId == campaign_id)
            if disposition:
                stmt = stmt.where(EmergencyIVRLog.c_disposition == disposition.upper())
            if start_date:
                stmt = stmt.where(EmergencyIVRLog.c_createdOn >= start_date)
            if end_date:
                stmt = stmt.where(EmergencyIVRLog.c_createdOn <= end_date)
            stmt = stmt.order_by(desc(EmergencyIVRLog.c_createdOn)).offset(offset).limit(limit)
            result = await session.execute(stmt)
            res_list = result.all()
            all_phones = [log.c_customerPhoneno for log, _ in res_list if log.c_customerPhoneno]
            phone_name_map = {}
            if all_phones:
                c_stmt = select(EmergencyGroupContact.egc_contactPhone, EmergencyGroupContact.egc_contactName).where(
                    or_(*[EmergencyGroupContact.egc_contactPhone.like(f"%{p[-10:]}") for p in all_phones if len(str(p)) >= 10])
                )
                c_res = await session.execute(c_stmt)
                for ph, nm in c_res.all():
                    p_norm = ph[-10:] if len(ph) >= 10 else ph
                    phone_name_map[p_norm] = nm

            logs = []
            for log, name in res_list:
                log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
                log_dict["c_campaignName"] = name or "Manual Alert"
                p_raw = log.c_customerPhoneno or ""
                p_lookup = p_raw[-10:] if len(p_raw) >= 10 else p_raw
                log_dict["c_memberName"] = phone_name_map.get(p_lookup, "Unknown")
                log_dict["c_messageContent"] = "IVR Prompt/Flow"
                
                # 🏷️ Apply Label Mapping to the output
                cid = log.c_campaignId
                raw_res = str(log.c_ivrResponse or "").strip()
                if raw_res:
                    camp_map = mappings.get(cid, {})
                    log_dict["c_ivrResponse"] = camp_map.get(raw_res, f"Wrong Input ({raw_res})")
                else:
                    log_dict["c_ivrResponse"] = "-"
                    
                logs.append(log_dict)
            return logs

    async def get_all_whatsapp_logs(self, account_id: int, limit: int = 100, offset: int = 0, campaign_id: Optional[int] = None, disposition: Optional[str] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, response_label: Optional[str] = None) -> List[Dict[str, Any]]:
        
        # Handle account_id type inconsistency (as seen in dlr_report)
        acc_id_filter = [account_id]
        if str(account_id).isdigit():
            acc_id_filter.append(int(account_id))
            acc_id_filter.append(str(account_id))

        # This ensures we only return data for campaigns that actually exist in p_emergency_campaigns
        valid_campaign_ids = []
        async with self.async_session_maker() as session:
            stmt = select(EmergencyCampaign.e_campaignId).where(EmergencyCampaign.e_accountId == account_id)
            res = await session.execute(stmt)
            valid_campaign_ids = [r[0] for r in res.all()]

        if not valid_campaign_ids and not campaign_id:
            return []

        query = {
            "accountId": {"$in": acc_id_filter},
            "channel": "Whatsapp",
            "direction": "Outbound",
            "type": "Message"
        }
        
        if campaign_id:
            query["campaignId"] = campaign_id
        else:
            query["campaignId"] = {"$in": valid_campaign_ids}

        if disposition:
            query["updatedStatus.status"] = disposition.lower()
        
        if start_date or end_date:
            query["activityTimestamp"] = {}
            if start_date: query["activityTimestamp"]["$gte"] = start_date.isoformat()
            if end_date: query["activityTimestamp"]["$lte"] = end_date.isoformat()
            
        # Step 1: Fetch outbound messages (we fetch all for now because of dynamic reply matching)
        # Note: If no response_label, we can skip and limit at DB level.
        # But if response_label provided, we MUST fetch and match replies first.
        # For simplicity and pagination consistency, we fetch a larger buffer if filtering by label
        db_limit = limit if not response_label else 2000
        cursor = self.onedb.activities.find(query).sort([("activityTimestamp", -1), ("createdOn", -1)]).skip(offset).limit(db_limit)
        
        outbound_logs = [doc async for doc in cursor]
        if not outbound_logs: return []

        # Step 2: Fetch corresponding Inbound replies for these specific contacts
        list_dests = list({doc.get("details", {}).get("m_dst") for doc in outbound_logs if doc.get("details", {}).get("m_dst")})
        earliest_out = min([doc.get("activityTimestamp") or doc.get("createdOn") for doc in outbound_logs])
        
        replies_by_dest = {}
        if list_dests:
            reply_query = {
                "accountId": {"$in": acc_id_filter},
                "channel": {"$in": ["Whatsapp", "WhatsApp"]},
                "direction": "Inbound",
                "details.m_src": {"$in": list_dests},
                "activityTimestamp": {"$gt": earliest_out}
            }
            # Fetch all matching replies sorted by time ASC
            reply_cursor = self.onedb.activities.find(reply_query).sort("activityTimestamp", 1)
            async for reply in reply_cursor:
                src_raw = reply.get("details", {}).get("m_src")
                src_clean = re.sub(r'[^0-9]', '', str(src_raw))[-10:] if src_raw else None
                if src_clean:
                    if src_clean not in replies_by_dest: replies_by_dest[src_clean] = []
                    replies_by_dest[src_clean].append(reply)

        # Project and Filter by Label
        logs = []
        rl_lower = response_label.lower() if response_label else None
        
        # 🧩 3. Resolve all relevant mappings at once outside the loop
        # Use the earliest outbound timestamp for the lookback window
        mappings = await self._resolve_ivr_mappings(account_id, earliest_out if outbound_logs else datetime.utcnow(), self.onedb)
        global_mappings = mappings.get(0, {})

        for log in outbound_logs:
            lead_raw = log.get("details", {}).get("m_dst")
            lead_clean = re.sub(r'[^0-9]', '', str(lead_raw))[-10:] if lead_raw else None
            out_ts = log.get("activityTimestamp") or log.get("createdOn")
            out_dt = self._parse_dt(out_ts)
            
            reply = None
            if lead_clean:
                dest_replies = replies_by_dest.get(lead_clean, [])
                for r in dest_replies:
                    r_dt = self._parse_dt(r.get("activityTimestamp"))
                    if r_dt > out_dt:
                        reply = r
                        break
            
            # 🧩 4. Map the reply message to a human-readable label
            cid = log.get("campaignId") or 0
            camp_map = mappings.get(cid, global_mappings)
            
            msg = str(reply.get("details", {}).get("m_receiveMsg") or "").strip() if reply else ""
            label = camp_map.get(msg, msg) # Translate '1' -> 'I am safe'
            
            # Apply Filter
            if rl_lower and rl_lower != "all":
                 if not reply: continue
                 if str(label).strip().lower() != rl_lower: continue

            doc = {
                "c_logId": str(log.get("_id")),
                "c_callId": log.get("msgId") or "N/A",
                "c_customerPhoneno": log.get("details", {}).get("m_dst") or log.get("details", {}).get("m_src") or "",
                "c_disposition": "SENT",
                "c_channel": "WA",
                "c_campaignId": cid,
                "c_ivrResponse": label if label else "-",
                "c_messageContent": log.get("details", {}).get("m_receiveMsg") or "",
                "c_createdOn": out_dt
            }
            
            statuses = log.get("updatedStatus")
            if statuses and isinstance(statuses, list):
                st_map = {s.get("status", "").lower(): True for s in statuses}
                if "read" in st_map: doc["c_disposition"] = "READ"
                elif "delivered" in st_map: doc["c_disposition"] = "DELIVERED"
                else: doc["c_disposition"] = statuses[-1].get("status", "SENT").upper()
            
            logs.append(doc)
            if not response_label and len(logs) >= limit: break # Local limit reached
            
        # 🧩 5. Resolve Member Names in Batch
        final_phones = [doc["c_customerPhoneno"] for doc in logs]
        phone_name_map = {}
        if final_phones:
            async with self.async_session_maker() as session:
                c_stmt = select(EmergencyGroupContact.egc_contactPhone, EmergencyGroupContact.egc_contactName).where(
                    or_(*[EmergencyGroupContact.egc_contactPhone.like(f"%{p[-10:]}") for p in final_phones if len(str(p)) >= 10])
                )
                c_res = await session.execute(c_stmt)
                for ph, nm in c_res.all():
                    p_norm = ph[-10:] if len(ph) >= 10 else ph
                    phone_name_map[p_norm] = nm
        
        for doc in logs:
            p_raw = doc.get("c_customerPhoneno", "")
            p_lookup = p_raw[-10:] if len(p_raw) >= 10 else p_raw
            doc["c_memberName"] = phone_name_map.get(p_lookup, "Unknown")
            
        return logs

    async def get_all_ivr_logs_count(self, account_id: int, campaign_id: Optional[int] = None, disposition: Optional[str] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, response_label: Optional[str] = None) -> int:
        async with self.async_session_maker() as session:
            # Handle Response Label filtering by resolving digits
            target_results = []
            if response_label:
                mappings = await self._resolve_ivr_mappings(account_id, start_date or datetime.utcnow(), self.onedb)
                rl_lower = response_label.lower()
                for cid, camp_map in mappings.items():
                    if campaign_id and cid != campaign_id: continue
                    for digit, label in camp_map.items():
                        if label.lower() == rl_lower or str(digit).lower() == rl_lower:
                            target_results.append((cid, digit))
                
                # Handling "Wrong Input (X)" cases
                if "wrong input" in rl_lower:
                    digit_match = re.search(r'\((\d+)\)', rl_lower)
                    if digit_match:
                        target_results.append((None, digit_match.group(1)))
                
                if not target_results:
                    if rl_lower.isdigit():
                        target_results.append((None, rl_lower))
                    else:
                        return 0

            stmt = select(func.count(EmergencyIVRLog.c_logId)).where(EmergencyIVRLog.c_accountId == account_id)
            
            if response_label:
                filters = []
                for cid, digit in target_results:
                    if cid: filters.append(and_(EmergencyIVRLog.c_campaignId == cid, EmergencyIVRLog.c_ivrResponse == digit))
                    else: filters.append(EmergencyIVRLog.c_ivrResponse == digit)
                stmt = stmt.where(or_(*filters))

            if campaign_id:
                stmt = stmt.where(EmergencyIVRLog.c_campaignId == campaign_id)
            if disposition:
                stmt = stmt.where(EmergencyIVRLog.c_disposition == disposition.upper())
            if start_date:
                stmt = stmt.where(EmergencyIVRLog.c_createdOn >= start_date)
            if end_date:
                stmt = stmt.where(EmergencyIVRLog.c_createdOn <= end_date)
            result = await session.execute(stmt)
            return result.scalar() or 0

    async def get_all_whatsapp_logs_count(self, account_id: int, campaign_id: Optional[int] = None, disposition: Optional[str] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, response_label: Optional[str] = None) -> int:
        
        acc_id_filter = [account_id]
        if str(account_id).isdigit():
            acc_id_filter.append(int(account_id))
            acc_id_filter.append(str(account_id))

        # Get valid campaign IDs from SQL for consistent filtering
        valid_campaign_ids = []
        async with self.async_session_maker() as session:
            stmt = select(EmergencyCampaign.e_campaignId).where(EmergencyCampaign.e_accountId == account_id)
            res = await session.execute(stmt)
            valid_campaign_ids = [r[0] for r in res.all()]

        if not valid_campaign_ids and not campaign_id:
            return 0

        query = {
            "accountId": {"$in": acc_id_filter},
            "channel": "Whatsapp",
            "direction": "Outbound",
            "type": "Message"
        }
        
        if campaign_id:
            query["campaignId"] = campaign_id
        else:
            query["campaignId"] = {"$in": valid_campaign_ids}

        if disposition:
            query["updatedStatus.status"] = disposition.lower()
        
        if start_date or end_date:
            query["activityTimestamp"] = {}
            if start_date: query["activityTimestamp"]["$gte"] = start_date.isoformat()
            if end_date: query["activityTimestamp"]["$lte"] = end_date.isoformat()
            
        # Count is tricky with dynamic reply matching for response_label.
        # If no response_label, we can use count_documents.
        if not response_label:
            return await self.onedb.activities.count_documents(query)
        
        # If response_label provided, we must fetch and count manually (simplified for now)
        logs = await self.get_all_whatsapp_logs(account_id, 10000, 0, campaign_id, disposition, start_date, end_date, response_label)
        return len(logs)

    async def get_dashboard_stats_kpis(self, account_id: int, campaign_id: Optional[int] = None) -> Dict[str, Any]:
        """Fast KPIs: Active counts and basic totals"""
        async with self.async_session_maker() as session:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # --- Available campaigns for filter dropdown ---
            filter_camps_stmt = select(EmergencyCampaign.e_campaignId, EmergencyCampaign.e_campaignName).where(
                EmergencyCampaign.e_accountId == account_id
            ).order_by(EmergencyCampaign.e_createdOn.desc())
            f_res = await session.execute(filter_camps_stmt)
            available_campaigns = [{"id": r[0], "name": r[1]} for r in f_res.all()]

            # 1. Base KPIs from SQL
            kpi_stmt = select(
                func.sum(case((EmergencyCampaign.e_status == 'EXECUTING', 1), else_=0)), 
                func.sum(EmergencyCampaign.e_totalLeads), 
                func.sum(EmergencyCampaign.e_reachedLeads)
            ).where(
                EmergencyCampaign.e_accountId == account_id,
                EmergencyCampaign.e_createdOn >= today_start
            )
            if campaign_id: kpi_stmt = kpi_stmt.where(EmergencyCampaign.e_campaignId == campaign_id)
            
            res = await session.execute(kpi_stmt)
            res_row = res.fetchone()
            active_alerts = res_row[0] or 0
            total_contacts = int(res_row[1] or 0)
            total_reached = int(res_row[2] or 0)
            success_rate = round((total_reached / (total_contacts or 1) * 100), 1)
            
            return {
                "activeAlerts": int(active_alerts),
                "totalContacts": total_contacts,
                "successRate": success_rate,
                "totalReached": total_reached,
                "availableCampaigns": available_campaigns
            }

    async def get_dashboard_stats_missions(self, account_id: int, campaign_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Recent Missions with their individual progress and response counts"""
        async with self.async_session_maker() as session:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            mission_stmt = select(EmergencyCampaign).where(EmergencyCampaign.e_accountId == account_id)
            if campaign_id: mission_stmt = mission_stmt.where(EmergencyCampaign.e_campaignId == campaign_id)
            else: mission_stmt = mission_stmt.where(EmergencyCampaign.e_createdOn >= today_start)
            
            mission_stmt = mission_stmt.order_by(desc(EmergencyCampaign.e_createdOn)).limit(15)
            mission_res = await session.execute(mission_stmt)
            missions = mission_res.scalars().all()
            
            mission_ids = [m.e_campaignId for m in missions]
            ivr_resp_counts = {}
            wa_resp_counts = {}
            if mission_ids:
                # SQL Batch
                ivr_r_res = await session.execute(select(EmergencyIVRLog.c_campaignId, func.count(EmergencyIVRLog.c_logId)).where(
                    EmergencyIVRLog.c_campaignId.in_(mission_ids), EmergencyIVRLog.c_ivrResponse != None, EmergencyIVRLog.c_ivrResponse != ''
                ).group_by(EmergencyIVRLog.c_campaignId))
                ivr_resp_counts = {r[0]: r[1] for r in ivr_r_res.all()}

                # Mongo Batch
                wa_r_cursor = self.onedb.activities.aggregate([
                    {"$match": {"accountId": account_id, "details.m_campaignId": {"$in": [str(mid) for mid in mission_ids]}, "direction": "Inbound", "channel": {"$in": ["Whatsapp", "WhatsApp"]}}},
                    {"$group": {"_id": "$details.m_campaignId", "count": {"$sum": 1}}}
                ])
                async for row in wa_r_cursor: wa_resp_counts[int(row["_id"])] = row["count"]

            recent_missions = []
            for m in missions:
                total_resp = ivr_resp_counts.get(m.e_campaignId, 0) + wa_resp_counts.get(m.e_campaignId, 0)
                prog = round((m.e_reachedLeads / (m.e_totalLeads or 1) * 100), 0)
                recent_missions.append({
                    "id": m.e_campaignId, "name": m.e_campaignName, "status": m.e_status, "type": m.e_priority,
                    "progress": int(min(100, prog)), "totalAudience": m.e_totalLeads, "responded": total_resp,
                    "pending": max(0, m.e_totalLeads - total_resp), "startTime": m.e_createdOn.strftime("%H:%M:%S")
                })
            return recent_missions

    async def get_dashboard_stats_charts(self, account_id: int, campaign_id: Optional[int] = None) -> Dict[str, Any]:
        """Aggregate data for charts: Disposition, Trends, Performance"""
        async with self.async_session_maker() as session:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            now = datetime.utcnow()
            
            # --- 1. IVR Stats ---
            ivr_stmt = select(
                func.sum(case((EmergencyIVRLog.c_disposition == 'ANSWER', 1), else_=0)),
                func.sum(case((EmergencyIVRLog.c_disposition == 'NO ANSWER', 1), else_=0)),
                func.sum(case((EmergencyIVRLog.c_disposition == 'BUSY', 1), else_=0)),
                func.sum(case((EmergencyIVRLog.c_disposition == 'FAILED', 1), else_=0)),
                func.avg(EmergencyIVRLog.c_duration)
            ).where(EmergencyIVRLog.c_accountId == account_id, EmergencyIVRLog.c_createdOn >= today_start)
            if campaign_id: ivr_stmt = ivr_stmt.where(EmergencyIVRLog.c_campaignId == campaign_id)
            ivr_res = (await session.execute(ivr_stmt)).fetchone() or (0,0,0,0,0)
            
            # --- 2. WA Stats ---
            wa_q = {"accountId": account_id, "direction": "Outbound", "channel": {"$in": ["Whatsapp", "WhatsApp"]}, "activityTimestamp": {"$gte": today_start.isoformat()}}
            if campaign_id: wa_q["details.m_campaignId"] = str(campaign_id)
            wa_res = await self.onedb.activities.aggregate([{"$match": wa_q}, {"$group": {"_id": None, "read": {"$sum": {"$cond": [{"$in": ["read", {"$ifNull": ["$updatedStatus.status", []]}]}, 1, 0]}}, "delivered": {"$sum": {"$cond": [{"$in": ["delivered", {"$ifNull": ["$updatedStatus.status", []]}]}, 1, 0]}}, "failed": {"$sum": {"$cond": [{"$in": ["failed", {"$ifNull": ["$updatedStatus.status", []]}]}, 1, 0]}}}}]).to_list(1)
            wa_data = wa_res[0] if wa_res else {"read": 0, "delivered": 0, "failed": 0}

            # --- 3. SMS Stats ---
            sms_q = {"accountId": account_id, "channel": "SMS", "direction": "Outbound", "activityTimestamp": {"$gte": today_start.isoformat()}}
            if campaign_id: sms_q["details.m_campaignId"] = str(campaign_id)
            sms_res = await self.onedb.activities.aggregate([{"$match": sms_q}, {"$group": {"_id": None, "delivered": {"$sum": {"$cond": [{"$gt": [{"$size": {"$setIntersection": [{"$ifNull": ["$updatedStatus.status", []]}, ["delivered", "sent"]]}}, 0]}, 1, 0]}}, "failed": {"$sum": {"$cond": [{"$in": ["failed", {"$ifNull": ["$updatedStatus.status", []]}]}, 1, 0]}}}}]).to_list(1)
            sms_data = sms_res[0] if sms_res else {"delivered": 0, "failed": 0}

            # Breakdown formatting
            disposition_breakdown = [
                {"name": "Answered", "value": int(ivr_res[0] or 0) + int(wa_data["read"]), "color": "#10b981"},
                {"name": "No Answer", "value": int(ivr_res[1] or 0) + int(wa_data["delivered"]), "color": "#3b82f6"},
                {"name": "Busy", "value": int(ivr_res[2] or 0), "color": "#f59e0b"},
                {"name": "Failed", "value": int(ivr_res[3] or 0) + int(wa_data["failed"]) + int(sms_data["failed"]), "color": "#ef4444"}
            ]

            # Trends (Simplified for split API)
            trend_start = (now - timedelta(hours=6)).replace(minute=0, second=0, microsecond=0)
            mongo_trend_q = {"accountId": account_id, "activityTimestamp": {"$gte": trend_start.isoformat()}}
            if campaign_id: mongo_trend_q["details.m_campaignId"] = str(campaign_id)
            cursor = self.onedb.activities.aggregate([{"$match": mongo_trend_q}, {"$project": {"h": {"$hour": {"$dateFromString": {"dateString": "$activityTimestamp"}}}}}, {"$group": {"_id": "$h", "count": {"$sum": 1}}}])
            trend_map = {row["_id"]: row["count"] async for row in cursor}
            
            hourly_trends = []
            for i in range(5, -1, -1):
                ts = (now - timedelta(hours=i)).replace(minute=0, second=0, microsecond=0)
                hourly_trends.append({"time": ts.strftime("%H:00"), "calls": trend_map.get(ts.hour, 0)})

            return {
                "dispositionBreakdown": disposition_breakdown,
                "hourlyTrends": hourly_trends,
                "latency": 1.2, # Simplified
                "concurrency": {"voice": 0, "wa": 0} # Simplified
            }

    async def get_dashboard_stats_responses(self, account_id: int, campaign_id: Optional[int] = None) -> Dict[str, Any]:
        """Heaviest part: Full response breakdown and Personnel table"""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        camp_mappings = await self._resolve_ivr_mappings(account_id, today_start, self.onedb)
        global_mappings = {}
        for cm in camp_mappings.values(): global_mappings.update(cm)

        unique_responders = {}
        async with self.async_session_maker() as session:
            # SQL IVR Responses
            ivr_q = select(EmergencyIVRLog.c_customerPhoneno, EmergencyIVRLog.c_ivrResponse, EmergencyIVRLog.c_campaignId, EmergencyIVRLog.c_createdOn).where(EmergencyIVRLog.c_accountId == account_id, EmergencyIVRLog.c_createdOn >= today_start, EmergencyIVRLog.c_ivrResponse != None, EmergencyIVRLog.c_ivrResponse != '')
            if campaign_id: ivr_q = ivr_q.where(EmergencyIVRLog.c_campaignId == campaign_id)
            res = await session.execute(ivr_q)
            for phone, raw, cid, dt in res.all():
                p_norm = phone[-10:] if len(phone) >= 10 else phone
                label = camp_mappings.get(cid, global_mappings).get(str(raw), f"Wrong Input ({raw})")
                if p_norm not in unique_responders or dt > unique_responders[p_norm]['time']:
                    unique_responders[p_norm] = {'time': dt, 'label': label, 'channel': 'Voice', 'cid': cid}

        # Mongo WA Responses
        acc_id_filter = [account_id]
        if str(account_id).isdigit():
            acc_id_filter.extend([str(account_id), int(account_id)])

        wa_q = {"accountId": {"$in": acc_id_filter}, "channel": {"$in": ["Whatsapp", "WhatsApp"]}, "direction": "Inbound", "activityTimestamp": {"$gte": today_start.isoformat()}}
        if campaign_id: 
            wa_q["details.m_campaignId"] = {"$in": [str(campaign_id), campaign_id]}
            
        cursor = self.onedb.activities.find(wa_q)
        async for doc in cursor:
            phone = str(doc.get("details", {}).get("m_src") or "0")
            p_norm = phone[-10:] if len(phone) >= 10 else phone
            cid_raw = doc.get("details", {}).get("m_campaignId") or doc.get("campaignId") or 0
            cid = int(cid_raw) if str(cid_raw).isdigit() else 0
            msg = str(doc.get("details", {}).get("m_receiveMsg") or "").strip()
            label = camp_mappings.get(cid, global_mappings).get(msg, msg)
            try: t_val = datetime.fromisoformat(doc["activityTimestamp"].replace('Z', '+00:00')).replace(tzinfo=None)
            except: t_val = today_start
            if p_norm not in unique_responders or t_val > unique_responders[p_norm]['time']:
                unique_responders[p_norm] = {'time': t_val, 'label': label, 'channel': 'WA', 'cid': cid}

        # Personnel Table Data
        from bson import ObjectId
        group_ids = set()
        intended_personnel = {}
        reached_phones = {}
        
        async with self.async_session_maker() as session:
            # 1. Resolve group populations
            discovery_stmt = select(EmergencyCampaign.e_orchestrationId).where(EmergencyCampaign.e_accountId == account_id, EmergencyCampaign.e_createdOn >= (today_start - timedelta(hours=24)))
            if campaign_id: discovery_stmt = discovery_stmt.where(EmergencyCampaign.e_campaignId == int(campaign_id))
            res = await session.execute(discovery_stmt)
            for orch_id in res.scalars().all():
                if orch_id:
                    try:
                        orch = await self.mongo_db.orchestrations.find_one({"_id": ObjectId(orch_id)})
                        gid = orch.get("data", {}).get("audience", {}).get("groupId")
                        if gid: group_ids.add(int(gid))
                    except: pass
            
            if group_ids:
                contacts_res = await session.execute(select(EmergencyGroupContact).where(EmergencyGroupContact.egc_groupId.in_(list(group_ids))))
                for c in contacts_res.scalars().all():
                    p_norm = c.egc_contactPhone[-10:] if c.egc_contactPhone and len(c.egc_contactPhone) >= 10 else str(c.egc_contactPhone)
                    intended_personnel[p_norm] = {"name": c.egc_contactName, "phone": c.egc_contactPhone}

            # 2. IVR Reached Stats
            ivr_reached_stmt = select(EmergencyIVRLog.c_customerPhoneno, EmergencyIVRLog.c_createdOn).where(
                EmergencyIVRLog.c_accountId == account_id,
                EmergencyIVRLog.c_createdOn >= today_start
            )
            if campaign_id: ivr_reached_stmt = ivr_reached_stmt.where(EmergencyIVRLog.c_campaignId == int(campaign_id))
            ivr_r_res = await session.execute(ivr_reached_stmt)
            for r_phone, r_time in ivr_r_res.all():
                if not r_phone: continue
                p_n = str(r_phone)[-10:] if len(str(r_phone)) >= 10 else str(r_phone)
                reached_phones[p_n] = {"time": r_time.strftime("%H:%M:%S"), "channel": "Voice"}
                
            # 3. WA / SMS Reached Stats
            mongo_q_reached = {
                "accountId": {"$in": acc_id_filter}, 
                "activityTimestamp": {"$gte": today_start.isoformat()}, 
                "updatedStatus.status": {"$in": ["read", "delivered", "sent", "SENT", "success", "accepted", "DELIVERED"]},
                "channel": {"$in": ["Whatsapp", "WhatsApp", "SMS"]},
                "direction": "Outbound"
            }
            if campaign_id: 
                mongo_q_reached["campaignId"] = {"$in": [campaign_id, str(campaign_id), int(campaign_id)]}
                
            mongo_cursor_reached = self.onedb.activities.find(mongo_q_reached, {"details": 1, "activityTimestamp": 1, "channel": 1})
            async for doc in mongo_cursor_reached:
                det = doc.get("details", {})
                dst = det.get("m_dst") or det.get("dst") or det.get("m_src") or det.get("src")
                if dst:
                    p_n = str(dst)[-10:] if len(str(dst)) >= 10 else str(dst)
                    ch = doc.get("channel", "WA")
                    if p_n not in reached_phones:
                        reached_phones[p_n] = {"time": doc.get("activityTimestamp")[-13:-5] if doc.get("activityTimestamp") else "--:--", "channel": ch}

            # construct lists
            p_responded_list = []
            p_not_responded_list = []
            p_failed_list = []

            for p_norm, resp in unique_responders.items():
                p_data = intended_personnel.get(p_norm, {"name": "---", "phone": p_norm})
                p_responded_list.append({
                    "name": p_data["name"], "phone": p_data["phone"],
                    "response": resp["label"], "channel": resp["channel"],
                    "time": resp["time"].strftime("%H:%M:%S")
                })
            
            for p_norm, p_data in intended_personnel.items():
                if p_norm in unique_responders: continue
                person = {"name": p_data["name"] or "Unknown", "phone": p_data["phone"]}
                if p_norm in reached_phones:
                    reach = reached_phones[p_norm]
                    person.update({"channel": reach["channel"], "time": reach["time"]})
                    p_not_responded_list.append(person)
                else:
                    p_failed_list.append(person)

            # 3. Response Breakdown (Aggregated Labels)
            counts = {}
            for res in unique_responders.values():
                lbl = res['label']
                counts[lbl] = counts.get(lbl, 0) + 1
            
            response_breakdown = []
            palette = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"]
            for i, (name, val) in enumerate(counts.items()):
                response_breakdown.append({
                    "name": name,
                    "value": val,
                    "color": palette[i % len(palette)]
                })

            return {
                "totalResponded": len(p_responded_list),
                "responseBreakdown": response_breakdown,
                "personnelStatusTable": {
                    "responded": p_responded_list[:200],
                    "notResponded": p_not_responded_list[:200],
                    "failed": p_failed_list[:200]
                }
            }

    async def get_response_members(self, account_id: int, request: EmergencyResponseMembersRequest) -> List[Dict[str, Any]]:
        """Fetches the list of contacts who provided a specific response across all channels"""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 0. Get mappings to handle translated labels (e.g., 'Acknowledge' -> '1')
        from models.db import EmergencyIVRLog
        camp_mappings = await self._resolve_ivr_mappings(account_id, today_start, self.onedb)
        
        # 1. Fetch from IVR (SQL)
        ivr_members = []
        async with self.async_session_maker() as session:
            # We search for the label directly or the raw digit that maps to it
            ivr_base_stmt = select(EmergencyIVRLog).where(
                EmergencyIVRLog.c_accountId == account_id,
                EmergencyIVRLog.c_createdOn >= today_start
            )
            if request.campaign_id:
                ivr_base_stmt = ivr_base_stmt.where(EmergencyIVRLog.c_campaignId == request.campaign_id)
            
            result = await session.execute(ivr_base_stmt)
            for row in result.scalars().all():
                # Translate this row's response and check if it matches the requested label
                label = camp_mappings.get(row.c_campaignId, {}).get(row.c_ivrResponse, row.c_ivrResponse)
                if label == request.response_text:
                    ivr_members.append({
                        "phone": row.c_customerPhoneno,
                        "channel": "Voice",
                        "time": row.c_createdOn,
                        "campaignId": row.c_campaignId
                    })

        # 2. Fetch from WhatsApp (Mongo)
        wa_members = []
        wa_q = {
            "accountId": account_id,
            "channel": {"$in": ["Whatsapp", "WhatsApp"]},
            "direction": "Inbound",
            "activityTimestamp": {"$gte": today_start.isoformat()},
            "details.m_campaignId": {"$exists": True}
        }
        if request.campaign_id:
            wa_q["details.m_campaignId"] = str(request.campaign_id)

        wa_cursor = self.onedb.activities.find(wa_q).sort("activityTimestamp", -1)
        async for doc in wa_cursor:
            cid_raw = doc.get("details", {}).get("m_campaignId")
            cid = int(cid_raw) if cid_raw and str(cid_raw).isdigit() else 0
            msg = doc.get("details", {}).get("m_receiveMsg") or ""
            
            # Use mappings to translate if needed
            label = camp_mappings.get(cid, {}).get(str(msg), str(msg))
            if label == request.response_text:
                wa_members.append({
                    "phone": doc.get("details", {}).get("m_src"),
                    "channel": "WhatsApp",
                    "time": self._parse_dt(doc.get("activityTimestamp")),
                    "campaignId": cid
                })

        # Combine
        combined_raw = ivr_members + wa_members
        
        # Fetch names for all unique campaign IDs
        needed_ids = list({m["campaignId"] for m in combined_raw if m["campaignId"]})
        names_map = await self.get_campaign_names_batch(needed_ids) if needed_ids else {}
        
        for m in combined_raw:
            m["campaignName"] = names_map.get(m["campaignId"], "Unknown")

        # Sort and Slice
        combined = sorted(combined_raw, key=lambda x: x["time"], reverse=True)
        return combined[request.offset : request.offset + request.limit]
    async def fetch_sms_templates(self) -> List[Dict[str, Any]]:
        async with self.async_session_maker() as session:
            stmt = select(EmergencySmsTemplate).where(EmergencySmsTemplate.est_status == 1).order_by(EmergencySmsTemplate.est_templateName)
            result = await session.execute(stmt)
            templates = result.scalars().all()
            return [
                {
                    "templateId": t.est_templateId,
                    "sender": t.est_sender,
                    "templateName": t.est_templateName,
                    "dltTemplateId": t.est_dltTemplateId,
                    "templateMessage": t.est_templateMessage,
                    "dltEntityId": t.est_dltEntityId
                } for t in templates
            ]
