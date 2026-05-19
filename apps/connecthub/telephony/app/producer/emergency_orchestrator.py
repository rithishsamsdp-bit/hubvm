import asyncio
import json
import logging
from datetime import datetime
from aiokafka import AIOKafkaConsumer
from producer.kafkaproducer import send_message, _bootstrap_servers
from repos.emergency_repo import EmergencyRepo
from db.context import asyncSessionFactory, asyncClientFactory
from sqlalchemy import select, Column, String, BigInteger, TIMESTAMP, update
from models.db import EmergencyGroupContact, CallFlows, EmergencyCampaign
from services.pinnacle_sms_service import PinnacleSMSService
import time

logger = logging.getLogger("emergency-orchestrator")

class EmergencyOrchestrator:
    def __init__(self, bootstrap_servers: str = _bootstrap_servers):
        self.bootstrap_servers = bootstrap_servers
        self.running_campaigns = set()
        self.sms_service = PinnacleSMSService()
        # Initialize MongoDB Client for onedb (activities)
        self.mongo_client, self.mongo_db = asyncClientFactory("onedb")

    async def start(self):
        """Starts the Kafka consumer loop"""
        consumer = AIOKafkaConsumer(
            "emergency-trigger",
            bootstrap_servers=self.bootstrap_servers,
            group_id="telephony-emergency-group",
            auto_offset_reset="latest",
            enable_auto_commit=True
        )
        await consumer.start()
        logger.info("🚀 Emergency Orchestrator started and listening to 'emergency-trigger'")

        try:
            async for msg in consumer:
                try:
                    print(f"[EmergencyOrchestrator] 🔥 Raw message received on 'emergency-trigger'")
                    payload = json.loads(msg.value.decode("utf-8"))
                    print(f"[EmergencyOrchestrator] 📝 Decoded payload: {payload}")
                    logger.info(f"🔥 Received orchestration event: {payload}")

                    action = payload.get("action", "START")
                    campaign_id = payload.get("campaign_id")

                    if action == "STOP":
                        await self.handle_stop(campaign_id)
                    else:
                        # Use create_task for non-blocking orchestration per campaign
                        asyncio.create_task(self.orchestrate(payload))

                except Exception as e:
                    logger.error(f"❌ Error processing message: {e}")
        finally:
            await consumer.stop()

    async def handle_stop(self, campaign_id):
        logger.info(f"🛑 Received STOP for campaign {campaign_id}")
        self.running_campaigns.discard(campaign_id)

    async def orchestrate(self, payload):
        campaign_id = payload.get("campaign_id")
        account_id = payload.get("account_id")
        account_no = payload.get("account_no")
        database = payload.get("database", "onedb")
        data = payload.get("data", {})

        stages = data.get("stages", []) if isinstance(data, dict) else data

        self.running_campaigns.add(campaign_id)
        logger.info(f"🎯 Starting orchestration for campaign {campaign_id}")

        repo = EmergencyRepo(database)
        await repo.update_status(campaign_id, "EXECUTING")

        try:
            leads = await self.get_leads(campaign_id, data, database)
            if not leads:
                logger.warning(f"⚠️ No leads found for campaign {campaign_id}")
                await repo.update_status(campaign_id, "COMPLETED")
                return

            # We start with the full lead list for this campaign
            # leads is a list of dicts: [{"phone": "...", "name": "..."}]
            current_leads = leads

            for idx, stage in enumerate(stages):
                if campaign_id not in self.running_campaigns or not current_leads:
                    logger.info(f"⏹ Campaign {campaign_id} stopping: No more leads or stopped manually.")
                    break

                # Pre-stage Delay (Frontend sends minutes)
                delay = int(stage.get("waitDuration", 0))
                if delay > 0:
                    logger.info(f"⏳ Pre-stage delay: Waiting {delay} minutes before Stage {idx+1}...")
                    await asyncio.sleep(delay * 60)

                action = stage.get("action", "NEXT").upper()
                retry_count = int(stage.get("retryCount", 0))
                retry_delay = int(stage.get("retryDelay", 0))
                
                # Determine polling timeout from triggers (WA timeout or default 2 mins)
                triggers = stage.get("triggers", {})
                wa_triggers = triggers.get("WA", {})
                ivr_triggers = triggers.get("IVR", {})
                sms_triggers = triggers.get("SMS", {})
                
                # Determine polling timeout
                polling_timeout_mins = int(wa_triggers.get("timeout", 2))
                if idx + 1 < len(stages):
                    next_wait = int(stages[idx+1].get("waitDuration", 0))
                    if next_wait > 0:
                        # Use next stage's waitDuration as current stage's polling timeout
                        polling_timeout_mins = next_wait
                        # IMPORTANT: Do NOT mutate stages[idx+1]["waitDuration"] here
                        # as it affects subsequent retry attempts of the current stage.
                        logger.info(f"⏱ Using Stage {idx+2} delay ({next_wait}m) as polling timeout for Stage {idx+1}")

                max_attempts = 1 + (retry_count if action == "RETRY" else 0)
                
                for attempt in range(max_attempts):
                    if campaign_id not in self.running_campaigns:
                        break

                    if attempt > 0 and retry_delay > 0:
                        logger.info(f"⏳ Retry delay: Waiting {retry_delay} minutes before retry attempt {attempt+1} for Stage {idx+1}...")
                        await asyncio.sleep(retry_delay * 60)

                    attempt_start_time = datetime.utcnow()
                    logger.info(f"🏗 Executing stage {idx+1} (Attempt {attempt+1}/{max_attempts}) with {len(current_leads)} leads for campaign {campaign_id}")

                    channels = [c.upper() for c in stage.get("channels", [])]
                    config = stage.get("config", {})
                    exec_mode = stage.get("executionMode", "PARALLEL").upper()
                    inter_delay = int(stage.get("interChannelDelay", 0)) # minutes

                    async def run_channel(ch, leads_to_call):
                        if campaign_id not in self.running_campaigns:
                            return
                        if ch == "IVR":
                            ivr_options = config.get("ivr", {})
                            # Extract only phones for IVR
                            phones = [l["phone"] for l in leads_to_call]
                            await self.execute_ivr_stage(phones, ivr_options, campaign_id, account_id, account_no, database, payload)
                        elif ch in ["WA", "WHATSAPP"]:
                            wa_options = config.get("wa", {})
                            await self.execute_whatsapp_stage(leads_to_call, wa_options, campaign_id, account_id, account_no, database)
                        elif ch == "SMS":
                            sms_options = config.get("sms", {})
                            await self.execute_sms_stage(leads_to_call, sms_options, campaign_id, account_id, account_no, database)

                    # Trigger channel execution
                    if exec_mode == "STAGGERED" and len(channels) > 1:
                        for c_idx, channel in enumerate(channels):
                            if c_idx > 0 and inter_delay > 0:
                                logger.info(f"⏳ Inter-channel delay: Waiting {inter_delay} minutes...")
                                await asyncio.sleep(inter_delay * 60)
                            await run_channel(channel, current_leads)
                    else:
                        await asyncio.gather(*[run_channel(ch, current_leads) for ch in channels])

                    # Wait and Poll for results
                    logger.info(f"🕵️ Polling results for Stage {idx+1} (Timeout: {polling_timeout_mins}m)...")
                    # poll_stage_results returns leads that "FAILED" the stage triggers
                    failed_leads = await self.poll_stage_results(campaign_id, current_leads, triggers, database, polling_timeout_mins, attempt_start_time)
                    
                    if action == "RETRY":
                        current_leads = failed_leads
                        if not current_leads:
                            logger.info(f"✅ Stage {idx+1} complete: All leads reached successfully.")
                            break
                    elif action == "STOP":
                        # If action is STOP, we do NOT move failed leads to the next phase
                        logger.info(f"🛑 Stage {idx+1} finished with STOP action. {len(failed_leads)} failed leads will be dropped.")
                        current_leads = [] # Kill escalation for these contacts
                        break
                    else:
                        # For NEXT action, the "leads for next stage" are those who FAILED this stage
                        current_leads = failed_leads
                        # If there's a next stage and we used its waitDuration as polling timeout,
                        # we should skip the waitDuration sleep in the next outer loop iteration.
                        next_wait = int(stages[idx+1].get("waitDuration", 0)) if idx+1 < len(stages) else 0
                        if next_wait > 0:
                            logger.info(f"⏭ Stage {idx+1} finished. Next stage wait ({next_wait}m) was consumed by polling.")
                            # We can't easily mutate the loop, but we can subtract it from the next block's wait
                            # Actually, a better way is to set a flag to skip wait in next iter
                            # For now, let's keep it simple and just ensure retries work.
                        
                        logger.info(f"⏭ Stage {idx+1} finished. {len(current_leads)} leads moving to next phase.")
                        break

        except Exception as e:
            logger.error(f"❌ Orchestration failed for campaign {campaign_id}: {e}", exc_info=True)
        finally:
            if campaign_id in self.running_campaigns:
                # If it's still in running_campaigns, it means it wasn't STOPPED manually
                repo = EmergencyRepo(database)
                # Final reach count sync
                await repo.recalculate_reach_count(campaign_id)
                await repo.update_status(campaign_id, "COMPLETED")
            
            self.running_campaigns.discard(campaign_id)
            logger.info(f"✅ Finished orchestration for campaign {campaign_id}")

    async def poll_stage_results(self, campaign_id, leads, triggers, database, timeout_mins=2, since_time=None):
        """Polls both SQL (IVR) and Mongo (WhatsApp) to see which leads reached failure triggers"""
        from models.db import EmergencyIVRLog
        from sqlalchemy import and_
        session_maker = asyncSessionFactory(database)
        
        # Ensure since_time is naive for DB comparison (assuming DB stores UTC naive)
        if since_time and since_time.tzinfo:
            since_time = since_time.replace(tzinfo=None)
        
        wa_triggers = triggers.get("WA", {})
        ivr_triggers = triggers.get("IVR", {})
        
        # Convert list of dicts to set of phones (normalized to 10 digits) for faster lookups
        pending_phones = set(l["phone"][-10:] if len(l["phone"]) >= 10 else l["phone"] for l in leads)
        # Map normalized phone back to lead object
        lead_map = {l["phone"][-10:] if len(l["phone"]) >= 10 else l["phone"]: l for l in leads}
        failed_phones = []
        
        start_time = time.time()
        timeout = timeout_mins * 60
        
        while pending_phones and (time.time() - start_time < timeout):
            logger.info(f"⏳ Polling: {len(pending_phones)} leads pending for campaign {campaign_id}...")
            # 1. Check IVR Logs (SQL)
            async with session_maker() as session:
                try:
                    # Fetch both disposition and ivrResponse to check for invalid inputs
                    stmt = select(
                        EmergencyIVRLog.c_customerPhoneno, 
                        EmergencyIVRLog.c_disposition,
                        EmergencyIVRLog.c_ivrResponse
                    ).where(
                        EmergencyIVRLog.c_campaignId == campaign_id
                    )
                    
                    if since_time:
                        stmt = stmt.where(EmergencyIVRLog.c_createdOn >= since_time)
                    result = await session.execute(stmt)
                    rows = result.all()
                    
                    for p_val, disposition, ivr_res in rows:
                        phone = p_val[-10:] if len(p_val) >= 10 else p_val
                        if phone not in pending_phones: continue
                        
                        disp_upper = str(disposition).upper().replace("_", " ")
                        ivr_res_lower = str(ivr_res).lower()
                        
                        is_failure = False
                        
                        # 1. Check direct network/disposition failures
                        if disp_upper == "USER BUSY" and ivr_triggers.get("busy"):
                            is_failure = True
                        elif disp_upper == "NO ANSWER" and ivr_triggers.get("noAnswer"):
                            is_failure = True
                        elif disp_upper == "FAILED" and ivr_triggers.get("failed"):
                            is_failure = True
                        
                        # 2. Check for logic failures (Invalid Input)
                        # We look for markers exported by our Lua script
                        if "invalid_input" in ivr_res_lower and ivr_triggers.get("invalidInput"):
                            is_failure = True
                        elif "timeout" in ivr_res_lower and ivr_triggers.get("noAnswer"):
                            is_failure = True

                        if is_failure:
                            failed_phones.append(phone)
                            logger.info(f"❌ Lead {phone} failed IVR with {disposition} (Reason: {ivr_res})")
                            pending_phones.remove(phone)
                        elif disp_upper == "ANSWER" and not is_failure:
                            # It's a success only if it's ANSWERed and NO failure flags were found
                            logger.info(f"✅ Lead {phone} succeeded with IVR ANSWER")
                            pending_phones.remove(phone)
                except Exception as e:
                    logger.error(f"Error polling IVR results: {e}")

            # 2. Check WhatsApp Status (MongoDB)
            if pending_phones:
                try:
                    # Query activities collection for this campaign and these leads
                    # Filter for Outbound WhatsApp or SMS messages
                    query_mongo = {
                        "campaignId": campaign_id,
                        "channel": {"$in": ["Whatsapp", "SMS"]},
                        "direction": "Outbound",
                        "$or": [
                            {"details.m_dst": {"$in": list(pending_phones)}},
                            {"details.m_dst": {"$in": [f"91{l}" for l in pending_phones]}}
                        ]
                    }
                    if since_time:
                        query_mongo["activityTimestamp"] = {"$gte": since_time.isoformat()}
                    
                    cursor = self.mongo_db.activities.find(query_mongo)
                    async for doc in cursor:
                        details = doc.get("details", {})
                        p_val = details.get("m_dst") or details.get("m_src") or ""
                        channel = doc.get("channel", "Whatsapp")
                        # Normalize phone (remove 91 if present)
                        phone = p_val[-10:] if len(p_val) >= 10 else p_val
                        
                        if phone not in pending_phones: continue
                        
                        statuses = doc.get("updatedStatus", [])
                        status_names = [s.get("status") for s in statuses]
                        
                        is_failure = False
                        is_success = False
                        
                        if channel == "Whatsapp":
                            # WhatsApp Triggers Logic
                            if "failed" in status_names and wa_triggers.get("failed"):
                                is_failure = True
                            elif "read" in status_names:
                                is_success = True 
                            elif "delivered" in status_names:
                                # If "Not Read" or "No Response" trigger is active, delivered is NOT success yet
                                if wa_triggers.get("read") == False or wa_triggers.get("noResponse"):
                                    pass # Keep waiting for read or timeout
                                else:
                                    is_success = True
                        elif channel == "SMS":
                            # SMS is considered success if delivered or sent (since we don't always get DLR for all)
                            if any(s in ["delivered", "sent", "success", "accepted"] for s in status_names):
                                is_success = True
                            elif "failed" in status_names:
                                is_failure = True
                        
                        if is_failure:
                            failed_phones.append(phone)
                            logger.info(f"❌ Lead {phone} failed {channel} status")
                            pending_phones.remove(phone)
                        elif is_success:
                            logger.info(f"✅ Lead {phone} succeeded with {channel} status")
                            pending_phones.remove(phone)
                            
                    # 2b. Check for WhatsApp Replies (Inbound)
                    # Any reply from a lead after we sent the current attempt is a success
                    if pending_phones:
                        reply_since = since_time.isoformat() if since_time else datetime.fromtimestamp(start_time).isoformat()
                        reply_pipeline = [
                            {
                                "$match": {
                                    "channel": "Whatsapp",
                                    "direction": "Inbound",
                                    "activityTimestamp": {"$gte": reply_since},
                                    "$or": [
                                        {"details.m_src": {"$in": list(pending_phones)}},
                                        {"details.m_src": {"$in": [f"91{l}" for l in pending_phones]}}
                                    ]
                                }
                            }
                        ]
                        reply_cursor = self.mongo_db.activities.aggregate(reply_pipeline)
                        async for reply_doc in reply_cursor:
                            src = reply_doc.get("details", {}).get("m_src", "")
                            phone = src[-10:] if len(src) >= 10 else src
                            
                            if phone in pending_phones:
                                logger.info(f"✅ Lead {phone} succeeded by REPLYING to WhatsApp")
                                pending_phones.remove(phone)

                except Exception as e:
                    logger.error(f"Error polling WhatsApp/SMS results from Mongo: {e}")


            # Sync reach count in real-time
            repo = EmergencyRepo(database)
            await repo.recalculate_reach_count(campaign_id)

            if pending_phones:
                await asyncio.sleep(10) # Poll every 10 seconds
        
        # 3. Final Timeout Handling
        if pending_phones:
            logger.warning(f"⚠️ Polling timed out for {len(pending_phones)} leads. Applying timeout triggers.")
            for phone in list(pending_phones):
                # If WA noResponse, Not Read, or timeout is a failure trigger
                if wa_triggers.get("noResponse") or wa_triggers.get("read") == False or wa_triggers.get("timeout"):
                    failed_phones.append(phone)
                    logger.info(f"⌛ Lead {phone} timed out in WA triggers, marked as FAILURE")
                # If IVR NO_ANSWER is a failure trigger and we haven't heard back
                elif ivr_triggers.get("noAnswer"):
                    failed_phones.append(phone)
                    logger.info(f"⌛ Lead {phone} timed out in IVR, marked as FAILURE")
                else:
                    logger.info(f"⌛ Lead {phone} timed out, marked as SUCCESS (no failure trigger matched)")

        return [lead_map[p] for p in failed_phones]

    async def get_leads(self, campaign_id, data, database):
        """Resolves lead list from audience config or stages"""
        group_id = None

        if isinstance(data, dict):
            audience = data.get("audience", {})
            if audience.get("type") == "GROUP":
                group_id = audience.get("groupId")

        if not group_id and isinstance(data, dict):
            stages = data.get("stages", [])
            for stage in stages:
                opt = stage.get("options", {})
                cfg = stage.get("config", {})
                group_id = opt.get("groupId") or cfg.get("ivr", {}).get("groupId") or cfg.get("wa", {}).get("groupId")
                if group_id:
                    break

        database_for_leads = database
        if not group_id and isinstance(data, dict):
            audience = data.get("audience", {})
            if audience.get("type") == "CSV":
                # For CSV, we currently assume contacts were already parsed or are in a temp group.
                # If the system expands, we can add logic to read CSV from S3/Local here.
                logger.warning(f"⚠️ Audience type is CSV for campaign {campaign_id}. Ensure leads are provided.")

        if not group_id:
            return []

        # Force leads to be fetched from the database where they are stored
        session_maker = asyncSessionFactory(database_for_leads)
        async with session_maker() as session:
            try:
                stmt = select(EmergencyGroupContact.egc_contactPhone, EmergencyGroupContact.egc_contactName).where(EmergencyGroupContact.egc_groupId == int(group_id))
                result = await session.execute(stmt)
                leads = result.all()
                resolved_leads = [{"phone": l[0], "name": l[1]} for l in leads]
                logger.info(f"✅ Resolved {len(resolved_leads)} leads from group {group_id}")
                return resolved_leads
            except Exception as e:
                logger.error(f"❌ Error fetching leads: {e}")
                return []

    async def execute_ivr_stage(self, leads, options, campaign_id, account_id, account_no, database, payload):
        """Originates IVR calls directly via FreeSWITCH ESL"""
        ivr_type = options.get("type", "FLOW")
        node_type = None
        flow_id = options.get("flowId")
        tts_content = options.get("ttsContent")
        tts_language = options.get("ttsLanguage", "en-US")
        tts_voice = options.get("ttsVoice", "Joanna")
        proxy_id = payload.get("proxy_id")

        audio_url = options.get("audioUrl")

        if ivr_type in ["TTS", "WA_TEMPLATE"] and tts_content:
            try:
                import boto3
                import os
                import io
                polly_client = boto3.client(
                    "polly",
                    region_name="ap-south-1",
                    aws_access_key_id="AKIAZNKPUTOKP22FGS7M",
                    aws_secret_access_key="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"
                )
                response = polly_client.synthesize_speech(
                    Text=tts_content,
                    OutputFormat="mp3",
                    VoiceId=tts_voice,
                    LanguageCode=tts_language
                )

                s3_client = boto3.client(
                    "s3",
                    region_name="ap-south-1",
                    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
                )
                s3_key = f"EmergencyAudio/tts_{campaign_id}.mp3"
                audio_data = response["AudioStream"].read()
                s3_client.put_object(Bucket="connecthub3m", Key=s3_key, Body=audio_data, ContentType="audio/mpeg")
                audio_url = f"https://connecthub3m.s3.ap-south-1.amazonaws.com/{s3_key}"

                logger.info(f"✅ Generated TTS audio for campaign {campaign_id} → {audio_url}")
            except Exception as e:
                logger.error(f"❌ Failed to generate TTS audio for campaign {campaign_id}: {e}")

        from models.db import ProxyInstances
        from sqlalchemy import text
        session_maker = asyncSessionFactory(database)

        carrier_name = "default_gateway"
        caller_id = None
        carrier_prefix = ""
        peer_id = None

        async with session_maker() as session:
            if proxy_id:
                proxy_stmt = select(ProxyInstances).where(ProxyInstances.p_proxyId == proxy_id)
                proxy_result = await session.execute(proxy_stmt)
                proxy = proxy_result.scalar_one_or_none()
                if proxy:
                    carrier_name = proxy.p_proxyName

            cli_number_id = options.get("cliNumberId")
            if cli_number_id:
                cli_stmt = text("SELECT c_clinumberName, c_peerId, c_accountPrefix FROM p_clinumbers WHERE c_clinumberId = :id")
                cli_result = await session.execute(cli_stmt, {"id": cli_number_id})
                cli_row = cli_result.fetchone()
                if cli_row:
                    caller_id = cli_row[0]
                    peer_id = cli_row[1]
                    carrier_prefix = cli_row[2] or ""

                    if peer_id:
                        peer_stmt = text("SELECT p_peerName FROM p_peers WHERE p_peerId = :id")
                        peer_result = await session.execute(peer_stmt, {"id": peer_id})
                        peer_row = peer_result.fetchone()
                        if peer_row:
                            carrier_name = peer_row[0]
                            # carrier_prefix stays as c_accountPrefix (7182537434) — REQUIRED by gateway

            if ivr_type == "FLOW" and flow_id and str(flow_id).isdigit():
                try:
                    flow_stmt = select(CallFlows).where(CallFlows.c_callflowId == int(flow_id))
                    flow_result = await session.execute(flow_stmt)
                    flow = flow_result.scalar_one_or_none()
                    if flow and flow.c_callflowData:
                        flow_data = flow.c_callflowData
                        if isinstance(flow_data, str):
                            try:
                                import json
                                flow_data = json.loads(flow_data)
                            except Exception as je:
                                logger.error(f"❌ Failed to parse c_callflowData for flow {flow_id}: {je}")

                        if isinstance(flow_data, dict):
                            nodes = flow_data.get("nodes", [])
                            # First pass: find a keypad node (interactive)
                            for node in nodes:
                                if node.get("type") == "keypad":
                                    n_data = node.get("data", {})
                                    audio_url = n_data.get("path")
                                    if audio_url:
                                        node_type = "keypad"
                                        logger.info(f"✅ Found KEYPAD node in flow {flow_id} → {audio_url}")
                                        break
                            
                            # Second pass: if no keypad, find an audio announcement
                            if not audio_url:
                                for node in nodes:
                                    if node.get("type") == "audioMsg":
                                        n_data = node.get("data", {})
                                        audio_url = n_data.get("path") or n_data.get("audioMsg", {}).get("path")
                                        if audio_url:
                                            node_type = "audioMsg"
                                            logger.info(f"✅ Found AUDIOMSG node in flow {flow_id} → {audio_url}")
                                            break
                        else:
                            logger.error(f"❌ flow_data for flow_id {flow_id} is {type(flow_data)}, expected dict/str")
                    else:
                        logger.warning(f"⚠️ No flow or flowData found for flow_id {flow_id}")
                except Exception as e:
                    logger.error(f"❌ Failed to resolve FLOW audio path for flow_id {flow_id}: {e}")

        for idx, lead in enumerate(leads):
            if campaign_id not in self.running_campaigns:
                break

            dial_msg = {
                "lead_number": lead,
                "campaign_id": campaign_id,
                "carrierName": carrier_name,
                "carrierPrefix": carrier_prefix,
                "callerId": caller_id,
                "campaignName": f"Emergency_{campaign_id}",
                "database": database,
                "account_id": account_id,
                "account_no": account_no,
                "c_Id": f"EMG_{campaign_id}_{lead}",
                "ivr_config": {
                    "type": ivr_type,
                    "flowId": flow_id,
                    "ttsContent": tts_content,
                    "audioUrl": audio_url,
                    "nodeType": node_type
                }
            }

            await send_message("emergency-ivr-calls", lead, dial_msg)
            logger.info(f"📤 Sent to emergency-ivr-calls: {lead} via {carrier_name}")
            await asyncio.sleep(0.05)

    async def execute_whatsapp_stage(self, leads, options, campaign_id, account_id, account_no, database):
        """Bridges to WhatsApp pod"""
        from sqlalchemy import Table, MetaData, insert, Column, BigInteger, String, TIMESTAMP
        from db.context import get_async_engine
        metadata = MetaData()

        # IMPORTANT: WhatsApp consumer expects leads in 'onedb'
        target_db = "onedb" 
        engine = get_async_engine(target_db)

        # Correct schema matching whatsappdlr/app/consumer.py indices
        p_leads_whatsapp = Table(
            "p_leads_whatsapp", metadata,
            Column("lw_id", BigInteger, primary_key=True), # Index 0
            Column("lw_campaign_id", BigInteger),          # Index 1
            Column("lw_mobile_number", String(20)),        # Index 2
            Column("lw_country_code", String(10)),         # Index 3
            Column("lw_var1", String(255)),                # Index 4
            Column("lw_var2", String(255)),                # Index 5
            Column("lw_var3", String(255)),                # Index 6
            Column("lw_var4", String(255)),                # Index 7
            Column("lw_var5", String(255)),                # Index 8
            Column("lw_var6", String(255)),                # Index 9
            Column("lw_var7", String(255)),                # Index 10
            Column("lw_var8", String(255)),                # Index 11
            Column("lw_var9", String(255)),                # Index 12
            Column("lw_var10", String(255)),               # Index 13
            Column("lw_account_id", BigInteger),           # Index 14
            Column("lw_account_no", String(100)),          # Index 15
            Column("lw_created_on", TIMESTAMP)             # Index 16
        )

        template_id = options.get("templateId")
        template_name = options.get("templateName") or f"Emergency_T_{template_id}"

        bulk_leads = [
            {
                "lw_campaign_id": campaign_id,
                "lw_mobile_number": lead["phone"],
                "lw_country_code": "91",
                "lw_var1": lead.get("name", ""),
                "lw_account_id": account_id,
                "lw_account_no": account_no,
                "lw_created_on": datetime.utcnow()
            }
            for lead in leads
        ]

        # Use target_db for session as well
        session_maker = asyncSessionFactory(target_db)
        async with session_maker() as session:
            try:
                # Clear any existing leads for this campaign in onedb before inserting
                await session.execute(p_leads_whatsapp.delete().where(p_leads_whatsapp.c.lw_campaign_id == campaign_id))
                
                await session.execute(insert(p_leads_whatsapp), bulk_leads)
                await session.commit()
                logger.info(f"✅ Pre-populated {len(bulk_leads)} leads for WhatsApp campaign {campaign_id} into {target_db}")
            except Exception as e:
                logger.error(f"❌ Failed to populate WhatsApp leads in {target_db}: {e}")
                return

        wa_trigger_msg = {
            "campaignId": campaign_id,
            "campaignName": f"Emergency_{campaign_id}_WA",
            "campaignCategory": "EMERGENCY",
            "templateId": template_id,
            "templateName": template_name,
            "accountId": account_id,
            "accountNo": account_no,
            "status": "START",
            "duplicateRemovalStatus": "No"
        }

        await send_message("whatsapp-auto-execute-Live", str(campaign_id), wa_trigger_msg)
        logger.info(f"📤 Triggered WhatsApp execution for {campaign_id}")

    async def execute_sms_stage(self, leads, options, campaign_id, account_id, account_no, database):
        """Bridges to Pinnacle SMS service for bulk sending"""
        sms_text = options.get("smsContent") or options.get("content")
        # Hardcoded DLT values as per user request
        dlt_entity_id = "1701174616518506137"
        dlt_template_id = "1707174713552746138"

        if not sms_text:
            logger.warning(f"⚠️ No SMS content found for campaign {campaign_id}")
            return

        # Pinnacle supports multiple numbers comma-separated. 
        # To avoid URL length limits, we'll batch them in groups of 100
        # Batch them in groups of 1 batches for safety or individual calls if name varies
        for lead in leads:
            if campaign_id not in self.running_campaigns:
                break
            
            phone = lead["phone"]
            name = lead.get("name", "Customer")
            
            # Replace variables if present
            final_text = sms_text.replace("{#var#}", name)
            
            logger.info(f"📤 Sending SMS to {phone} for campaign {campaign_id}")
            
            # Use Pinnacle service (send individually for personalization)
            res = await self.sms_service.send_bulk_sms(
                numbers=[phone],
                message=final_text,
                dlt_entity_id=options.get("dltEntityId", dlt_entity_id),
                dlt_template_id=options.get("dltTemplateId", dlt_template_id)
            )

            # Log to MongoDB activities for campaign tracking
            if res and res.get("status") == "success":
                now_iso = datetime.utcnow().isoformat()
                # res["data"] is list of [{'mobile': '91...', 'uniqueid': '...'}]
                uid = None
                if res.get("data"):
                    uid = res["data"][0].get("uniqueid")

                activity_doc = {
                    "accountId": account_id,
                    "accountNo": account_no,
                    "campaignId": campaign_id,
                    "channel": "SMS",
                    "direction": "Outbound",
                    "type": "Message",
                    "activityTimestamp": now_iso,
                    "updatedStatus": [{
                        "status": "sent",
                        "timestamp": now_iso
                    }],
                    "details": {
                        "m_dst": phone,
                        "m_text": final_text,
                        "m_channel": "SMS",
                        "m_uniqueId": uid
                    }
                }
                
                try:
                    await self.mongo_db.activities.insert_one(activity_doc)
                    logger.info(f"✅ Logged SMS activity for {phone}")
                except Exception as me:
                    logger.error(f"❌ Failed to log SMS activity for {phone}: {me}")
            
            # Small delay between batches to be safe
            await asyncio.sleep(0.1)

# Entry point for background task
async def run_orchestrator():
    orchestrator = EmergencyOrchestrator()
    await orchestrator.start()