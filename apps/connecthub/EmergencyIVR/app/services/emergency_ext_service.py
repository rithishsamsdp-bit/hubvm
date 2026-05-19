
import json
import asyncio
import uuid
import logging
import threading
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

import httpx
import aiohttp
from sqlalchemy import text

from config import settings
from db.context import get_async_session, get_mongo_db

logger = logging.getLogger("emergency-ext-service")


class EmergencyExtService:

    async def trigger_ivr_call(
        self,
        phone_number: str,
        account_id: int,
        account_no: str,
        proxy_id: Optional[int] = None,
        call_flow_id: Optional[int] = None,
        audio_url: Optional[str] = None,
        prompt: Any = None,
        tts_language: str = "en-IN",
        tts_voice: str = "vidya",
        cli_number_id: Optional[int] = None,
        carrier_name: str = "Tata-UL-CHN",
        only_generate: bool = False,
    ) -> Dict[str, Any]:

        caller_id = "4445847499"
        carrier_prefix = "7182537434"
        ivr_type = "AUDIO"
        node_type = None
        resolved_audio_url = audio_url
        tts_text = None
        tts_provider = "SARVAM"

        lead_language = None
        is_new_lead = False
        
        # 1. Lead tracking & Language lookup via MongoDB
        try:
            db = get_mongo_db("onedb")
            pref_col = db["emergency_customer_preferences"]
            
            # Skip DB tracking for internal resolution calls
            if phone_number != "RESOLVE":
                customer_pref = pref_col.find_one({"phone_number": phone_number})
                
                if customer_pref:
                    lead_language = customer_pref.get("language")
                    logger.info(f"🔍 Found existing customer language preference: {lead_language}")
                else:
                    is_new_lead = True
                    # Store phone number as new lead in MongoDB
                    pref_col.update_one(
                        {"phone_number": phone_number},
                        {"$set": {
                            "phone_number": phone_number,
                            "account_id": account_id,
                            "account_no": account_no,
                            "created_at": datetime.now(timezone.utc)
                        }},
                        upsert=True
                    )
                    logger.info(f"🆕 New customer detected: {phone_number}")
        except Exception as mongo_e:
            logger.warning(f"⚠️ MongoDB preference lookup failed: {mongo_e}")

        session_factory = get_async_session()
        if session_factory:
            async with session_factory() as session:
                # 2. Resolve carrier... (existing logic continues)
                if not cli_number_id and not proxy_id and account_id:
                    result = await session.execute(
                        text("SELECT c_clinumberId FROM p_clinumbers WHERE c_accountId = :aid AND c_status = 'active' LIMIT 1"),
                        {"aid": account_id}
                    )
                    first_cli = result.fetchone()
                    if first_cli:
                        cli_number_id = first_cli[0]


                if call_flow_id and not resolved_audio_url:
                    ivr_type = "FLOW"
                    result = await session.execute(
                        text("SELECT c_callflowData FROM p_callflows WHERE c_callflowId = :id"),
                        {"id": call_flow_id}
                    )
                    flow_row = result.fetchone()
                    if flow_row and flow_row[0]:
                        flow_data = flow_row[0]
                        if isinstance(flow_data, str):
                            flow_data = json.loads(flow_data)
                        if isinstance(flow_data, dict):
                            for node in flow_data.get("nodes", []):
                                if node.get("type") == "keypad":
                                    resolved_audio_url = node.get("data", {}).get("path")
                                    if resolved_audio_url:
                                        node_type = "keypad"
                                        break
                            if not resolved_audio_url:
                                for node in flow_data.get("nodes", []):
                                    if node.get("type") == "audioMsg":
                                        n_data = node.get("data", {})
                                        resolved_audio_url = n_data.get("path") or n_data.get("audioMsg", {}).get("path")
                                        if resolved_audio_url:
                                            node_type = "audioMsg"
                                            break

        event_extra = {}
        # Handle Multilingual Prompt Logic
        if prompt and not resolved_audio_url:
            # Convert prompt to dict if it's an object
            prompt_dict = prompt.dict() if hasattr(prompt, "dict") else prompt
            
            if (is_new_lead or not lead_language) and not only_generate:
                ivr_type = "MULTILINGUAL"
                
                # PRE-GENERATE ALL LANGUAGES in parallel to avoid delay
                lang_map = {
                    "English": {"code": "en-IN", "voice": "vidya", "provider": "SARVAM"},
                    "Hindi": {"code": "hi-IN", "voice": "vidya", "provider": "SARVAM"},
                    "Gujarati": {"code": "gu-IN", "voice": "vidya", "provider": "SARVAM"},
                    "Marathi": {"code": "mr-IN", "voice": "vidya", "provider": "SARVAM"},
                }
                
                tasks = []
                langs_to_process = []
                for lang_name, lang_text in prompt_dict.items():
                    if not lang_text or lang_name == "Default": continue
                    config = lang_map.get(lang_name)
                    if config:
                        langs_to_process.append(lang_name)
                        tasks.append(self._resolve_tts(lang_text, config, force_refresh=True))
                
                # Execute all TTS lookups/generations in parallel
                urls = await asyncio.gather(*tasks)
                
                resolved_prompts = {}
                for i, lang_name in enumerate(langs_to_process):
                    resolved_prompts[lang_name] = {
                        "text": prompt_dict[lang_name],
                        "url": urls[i]
                    }
                
                # Store prompt JSON with URLs for the Lua script
                try:
                    db = get_mongo_db("onedb")
                    db["emergency_active_prompts"].update_one(
                        {"phone_number": phone_number},
                        {"$set": {
                            "prompts": prompt_dict,
                            "resolved_prompts": resolved_prompts, # New field with URLs
                            "updated_at": datetime.now(timezone.utc)
                        }},
                        upsert=True
                    )
                    logger.info(f"💾 Persisted pre-generated prompts for {phone_number}")
                except Exception as e:
                    logger.error(f"❌ Failed to persist prompts: {e}")
                
                event_extra = {"prompt_json": json.dumps(prompt_dict)}
            else:
                # Use existing language preference OR force first available for only_generate
                target_lang = lead_language or list(prompt_dict.keys())[0]
                if only_generate and list(prompt_dict.keys()):
                    target_lang = list(prompt_dict.keys())[0]
                    
                logger.info(f"🎯 Resolving audio for language: {target_lang}")
                
                tts_text = prompt_dict.get(target_lang) or prompt_dict.get("Default") or prompt_dict.get("English")
                if tts_text:
                    ivr_type = "TTS"
                    # Map language names to TTS codes/voices
                    lang_map = {
                        "English": {"code": "en-IN", "voice": "vidya", "provider": "SARVAM"},
                        "Hindi": {"code": "hi-IN", "voice": "vidya", "provider": "SARVAM"},
                        "Gujarati": {"code": "gu-IN", "voice": "vidya", "provider": "SARVAM"},
                        "Marathi": {"code": "mr-IN", "voice": "vidya", "provider": "SARVAM"},
                    }
                    lang_config = lang_map.get(target_lang)
                    if not lang_config:
                        # Try case-insensitive or partial match
                        for k, v in lang_map.items():
                            if k.lower() == str(target_lang).lower():
                                lang_config = v
                                break
                    
                    if not lang_config:
                        lang_config = {"code": "en-IN", "voice": "vidya", "provider": "SARVAM"}
                        
                    tts_language = lang_config["code"]
                    tts_voice = lang_config["voice"]
                    tts_provider = lang_config["provider"]
                else:
                    ivr_type = "AUDIO" # Fallback if no text for that language

        # Use the extracted generation logic
        if tts_text and not resolved_audio_url and ivr_type == "TTS":
            lang_config = {
                "code": tts_language,
                "voice": tts_voice,
                "provider": tts_provider
            }
            resolved_audio_url = await self._resolve_tts(tts_text, lang_config, force_refresh=only_generate)

        if not resolved_audio_url and not call_flow_id and ivr_type != "MULTILINGUAL":
            return {"status": "ERROR", "message": "No audio source provided. Pass prompt, audio_url, or call_flow_id."}

        # Originate call directly via ESL (same pod)
        call_id = f"EXT_{uuid.uuid4().hex[:12]}"
        formatted_phone = f"91{phone_number}" if not phone_number.startswith("91") else phone_number

        event = {
            "lead_number": formatted_phone,
            "campaign_id": 0,
            "carrierName": carrier_name,
            "carrierPrefix": carrier_prefix,
            "callerId": caller_id,
            "campaignName": "ExternalEmergency",
            "database": "onedb",
            "account_id": account_id,
            "account_no": account_no,
            "c_Id": call_id,
            "ivr_config": {
                "type": ivr_type,
                "flowId": call_flow_id,
                "ttsContent": tts_text,
                "audioUrl": resolved_audio_url,
                "nodeType": node_type,
                **event_extra
            },
        }

        if only_generate:
            return {"status": "SUCCESS", "audio_url": resolved_audio_url}

        # Original call logic...

        from emergency_consumer import originate_call
        thread = threading.Thread(target=originate_call, args=(event,), daemon=True)
        thread.start()

        logger.info(f"📤 IVR call originated for {phone_number} via {carrier_name}")
        return {
            "status": "SUCCESS", "message": "IVR call triggered",
            "call_id": call_id, "phone_number": phone_number
        }


    async def send_whatsapp(
        self,
        phone_number: str,
        template_id: str,
        account_id: int,
        account_no: str,
    ) -> Dict[str, Any]:

        account_id_str = str(account_id)
        account_no_str = str(account_no)

        session_factory = get_async_session()
        if not session_factory:
            return {"status": "ERROR", "message": "Database not configured"}

        async with session_factory() as session:
            result = await session.execute(
                text("SELECT w_phNumberId, w_apiKey FROM p_whatsappaccounts WHERE w_accountId = :aid LIMIT 1"),
                {"aid": account_id_str}
            )
            wa_row = result.fetchone()

        if not wa_row:
            return {"status": "ERROR", "message": f"No WhatsApp account found for accountId {account_id}"}

        ph_number_id = wa_row[0]
        api_key = wa_row[1]

        if not ph_number_id or not api_key:
            return {"status": "ERROR", "message": "Missing WhatsApp account credentials"}

        wa_db = get_mongo_db("whatsappConnecthub")
        template_doc = wa_db["templeteDetails"].find_one(
            {"templateStatus.id": template_id, "accountId": {"$in": [account_id, account_id_str]}, "accountNo": account_no_str}
        )

        if not template_doc:
            return {"status": "ERROR", "message": f"Template ID '{template_id}' not found"}

        template_payload = template_doc.get("template_payload")
        if not template_payload:
            return {"status": "ERROR", "message": "template_payload missing"}

        if isinstance(template_payload, str):
            template_payload = json.loads(template_payload)

        # Simply replace MSISDN in the payload
        def replace_msisdn(data):
            if isinstance(data, dict):
                return {k: replace_msisdn(v) for k, v in data.items()}
            elif isinstance(data, list):
                return [replace_msisdn(i) for i in data]
            elif isinstance(data, str):
                return data.replace("${MSISDN}", str(phone_number))
            return data

        payload_with_dst = replace_msisdn(template_payload)

        # 4. Send via Pinbot API
        url = f"https://partnersv1.pinbot.ai/v3/{ph_number_id}/messages"
        headers = {"Content-Type": "application/json", "apikey": api_key}

        message_id = None
        resp_json = None
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as http_session:
            async with http_session.post(url, headers=headers, json=payload_with_dst) as resp:
                resp_text = await resp.text()
                if resp.status != 200:
                    logger.error(f"❌ WhatsApp API error {resp.status}: {resp_text}")
                    return {"status": "ERROR", "message": f"WhatsApp API error: {resp_text}"}

                try:
                    resp_json = json.loads(resp_text)
                    messages = resp_json.get("messages", [])
                    if messages:
                        message_id = messages[0].get("id")
                except json.JSONDecodeError:
                    resp_json = resp_text

        # 5. Log to MongoDB activities
        if message_id:
            try:
                ist = timezone(timedelta(hours=5, minutes=30))
                iso_string = datetime.now(ist).isoformat()

                activity_doc = {
                    "accountId": account_id_str,
                    "accountNo": account_no_str,
                    "campaignId": 0,
                    "channel": "Whatsapp",
                    "direction": "Outbound",
                    "type": "Message",
                    "activityTimestamp": iso_string,
                    "source": "external_emergency_api",
                    "updatedStatus": [{"status": "sent", "timestamp": iso_string}],
                    "details": {
                        "m_id": message_id,
                        "m_dst": phone_number,
                        "m_type": "Template",
                        "m_msgType": "Outbound",
                        "m_createdOn": iso_string,
                    },
                }
                get_mongo_db("onedb").activities.insert_one(activity_doc)
                logger.info(f"✅ WhatsApp sent to {phone_number}, id={message_id}")
            except Exception as e:
                logger.error(f"❌ Failed to log WA activity: {e}")

        return {
            "status": "SUCCESS", "message": "WhatsApp message sent",
            "message_id": message_id, "phone_number": phone_number
        }


    async def send_sms(
        self,
        phone_number: str,
        message: str,
        account_id: int,
        account_no: str,
        dlt_entity_id: Optional[str] = None,
        dlt_template_id: Optional[str] = None,
    ) -> Dict[str, Any]:

        entity_id = dlt_entity_id or settings.SMS_DLT_ENTITY_ID
        template_id = dlt_template_id or settings.SMS_DLT_TEMPLATE_ID

        # Call Pinnacle SMS API
        params = {
            "apikey": settings.SMS_API_KEY,
            "sender": settings.SMS_SENDER,
            "numbers": phone_number,
            "message": message,
            "messagetype": "TXT",
            "dltentityid": entity_id,
            "dlttempid": template_id,
            "response": "Y",
        }

        sms_result = None
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get("https://api.pinnacle.in/index.php/sms/urlsms", params=params)
            if resp.status_code == 200:
                sms_result = resp.json()
                logger.info(f"✅ SMS sent to {phone_number}")
            else:
                logger.error(f"❌ Pinnacle error: {resp.status_code} - {resp.text}")
                return {"status": "ERROR", "message": f"SMS API error: {resp.text}"}

        # Log to MongoDB activities
        try:
            now_iso = datetime.utcnow().isoformat()
            uid = None
            if sms_result and sms_result.get("data"):
                uid = sms_result["data"][0].get("uniqueid") if sms_result["data"] else None

            activity_doc = {
                "accountId": str(account_id),
                "accountNo": str(account_no),
                "campaignId": 0,
                "channel": "SMS",
                "direction": "Outbound",
                "type": "Message",
                "activityTimestamp": now_iso,
                "source": "external_emergency_api",
                "updatedStatus": [{"status": "sent", "timestamp": now_iso}],
                "details": {
                    "m_dst": phone_number,
                    "m_text": message,
                    "m_channel": "SMS",
                    "m_uniqueId": uid,
                },
            }
            get_mongo_db("onedb").activities.insert_one(activity_doc)
        except Exception as e:
            logger.error(f"❌ Failed to log SMS activity: {e}")

        return {
            "status": "SUCCESS", "message": "SMS sent",
            "phone_number": phone_number
        }

    async def update_lead_preference(self, phone_number: str, language: str) -> Dict[str, Any]:
        """Updates or inserts customer language preference in MongoDB"""
        try:
            db = get_mongo_db("onedb")
            col = db["emergency_customer_preferences"]
            
            # Normalize phone number (remove leading 91 for storage/lookup)
            clean_phone = phone_number
            if phone_number.startswith("91") and len(phone_number) > 10:
                clean_phone = phone_number[2:]
            elif phone_number.startswith("0") and len(phone_number) > 10:
                clean_phone = phone_number[1:]

            col.update_one(
                {"phone_number": clean_phone},
                {"$set": {
                    "language": language,
                    "updated_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            logger.info(f"✅ Updated language preference for {clean_phone} to {language}")
            return {"status": "SUCCESS", "message": f"Preference updated to {language}"}
        except Exception as e:
            logger.error(f"❌ Failed to update preference: {e}")
            return {"status": "ERROR", "message": str(e)}


    async def _resolve_tts(self, tts_text: str, config: Dict[str, Any], force_refresh: bool = False) -> Optional[str]:
        """
        Core logic to synthesize text to speech and return S3 URL.
        """
        tts_language = config.get("code")
        tts_voice = config.get("voice")
        tts_provider = config.get("provider", "AWS")
        
        tts_hash = hashlib.md5(f"{tts_text}_{tts_voice}_{tts_language}_{tts_provider}".encode()).hexdigest()
        
        db = get_mongo_db("onedb")
        cache_col = db["emergency_tts_cache"]
        
        # Check Cache
        if not force_refresh:
            try:
                cached_entry = cache_col.find_one({"tts_hash": tts_hash})
                if cached_entry:
                    url = cached_entry.get("audio_url")
                    # Clean the URL if it contains an old signature
                    if url and "?" in url and "s3.amazonaws.com" in url:
                        url = url.split("?")[0]
                        logger.info(f"✨ Cleaned cached URL: {url}")
                    
                    logger.info(f"⚡ TTS Cache Hit → {url}")
                    return url
            except Exception as e:
                logger.warning(f"⚠️ Cache lookup failed: {e}")

        # Generate Audio
        try:
            audio_content = None
            if tts_provider == "SARVAM":
                url = "https://api.sarvam.ai/text-to-speech"
                headers = {
                    "api-subscription-key": settings.SARVAM_API_KEY,
                    "Content-Type": "application/json"
                }
                payload = {
                    "inputs": [tts_text],
                    "target_language_code": tts_language,
                    "speaker": tts_voice,
                    "pitch": 0, "pace": 1.0, "loudness": 1.5, "speech_sample_rate": 8000
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        import base64
                        audio_content = base64.b64decode(resp.json()["audios"][0])
                        logger.info(f"✅ Sarvam TTS generated for {tts_language}")
                    else:
                        logger.error(f"❌ Sarvam TTS failed ({resp.status_code}): {resp.text}")


            if audio_content:
                import boto3
                from botocore.config import Config
                
                s3_config = Config(
                    region_name=settings.AWS_REGION,
                    signature_version='s3v4',
                    s3={'addressing_style': 'virtual'}
                )
                
                s3 = boto3.client(
                    "s3", 
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    config=s3_config
                )
                
                s3_key = f"EmergencyAudio/ext_tts_{uuid.uuid4().hex[:8]}.wav"
                s3.put_object(
                    Bucket="connecthub3m", 
                    Key=s3_key, 
                    Body=audio_content, 
                    ContentType="audio/wav"
                )
                
                # Use the clean URL format that works in the user's browser
                resolved_url = f"https://connecthub3m.s3.amazonaws.com/{s3_key}"
                
                # Cache it
                cache_col.update_one(
                    {"tts_hash": tts_hash},
                    {"$set": {
                        "tts_text": tts_text, "tts_voice": tts_voice, "tts_language": tts_language,
                        "audio_url": resolved_url, "provider": tts_provider, "created_at": datetime.now(timezone.utc)
                    }}, upsert=True
                )
                return resolved_url

        except Exception as e:
            logger.error(f"❌ _resolve_tts failed: {e}")
        
        return None
