"""
Emergency IVR Consumer
Consumes from 'emergency-ivr-calls' Kafka topic and originates calls via FreeSWITCH ESL.
Modeled after Predectiveorginate.py — uses ESLWrapper with persistent connections.
"""

import json
import logging
import os
import random
import signal
import sys
import threading
import time
from confluent_kafka import Consumer, KafkaError
from ESL import ESLconnection
from config import settings

# =====================================================
# Configuration
# =====================================================

KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "emergency-ivr-calls")

FS_SERVERS = [
    {"host": "10.0.4.19", "port": 8021, "password": "Pulse#$2024"},
]

CONCURRENT_LIMIT = 20
ESL_CONNECT_RETRIES = 3
HEALTH_CHECK_INTERVAL = 30

# =====================================================
# Logging
# =====================================================

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("emergency-ivr-consumer")

# =====================================================
# Graceful Shutdown
# =====================================================

running = True

def shutdown_handler(sig, frame):
    global running
    logger.info("Shutdown signal received, stopping consumer...")
    running = False



# =====================================================
# ESLWrapper (from Predectiveorginate.py)
# =====================================================

class ESLWrapper:
    def __init__(self, host: str, port: int, password: str, max_calls: int = 20):
        self.host = host
        self.port = port
        self.password = password
        self.conn = None
        self.lock = threading.Lock()
        self.semaphore = threading.Semaphore(max_calls)
        self.last_health_check = 0.0
        self.is_connected = False
        logger.info("ESLWrapper initialized for %s:%s", host, port)

    def _connect(self, max_attempts=ESL_CONNECT_RETRIES):
        """Connect to FreeSWITCH with retry logic"""
        for attempt in range(max_attempts):
            try:
                logger.info(
                    "Connecting to FreeSWITCH %s:%s (attempt %s/%s)",
                    self.host, self.port, attempt + 1, max_attempts
                )
                self.conn = ESLconnection(self.host, self.port, self.password)
                
                if self.conn.connected():
                    logger.info("✅ Connected to FreeSWITCH %s:%s", self.host, self.port)
                    self.last_health_check = time.time()
                    self.is_connected = True
                    return
                else:
                    logger.warning(
                        "Connection attempt %s/%s failed for %s:%s",
                        attempt + 1, max_attempts, self.host, self.port
                    )
            except Exception as e:
                logger.error(
                    "Connection error for %s:%s (attempt %s/%s): %s",
                    self.host, self.port, attempt + 1, max_attempts, e
                )
            
            if attempt < max_attempts - 1:
                sleep_time = min(2 ** attempt, 8)
                time.sleep(sleep_time)
        
        self.is_connected = False
        raise ConnectionError(f"ESL connection to {self.host}:{self.port} failed after {max_attempts} attempts")

    def health_check(self):
        """Check if connection is healthy"""
        try:
            if not self.conn or not self.conn.connected():
                return False
            response = self.conn.api("status")
            if response and response.getBody():
                self.last_health_check = time.time()
                return True
            return False
        except Exception as e:
            logger.warning("Health check failed for %s:%s - %s", self.host, self.port, e)
            return False

    def ensure_connected(self):
        """Ensure connection is active, reconnect if needed"""
        if self.is_connected and self.conn and self.conn.connected():
            if time.time() - self.last_health_check > HEALTH_CHECK_INTERVAL:
                if not self.health_check():
                    with self.lock:
                        logger.warning("Health check failed, reconnecting %s:%s", self.host, self.port)
                        self._connect()
            return
        
        with self.lock:
            if not self.is_connected or not self.conn or not self.conn.connected():
                logger.info("Establishing connection to %s:%s...", self.host, self.port)
                self._connect()

    def get_connection(self):
        """Get a valid ESL connection"""
        self.ensure_connected()
        return self.conn


class FreeSwitchPool:
    def __init__(self, servers):
        self.servers = servers
        self.lock = threading.Lock()

    def get(self, timeout=15):
        """Get an available FreeSWITCH server from the pool"""
        start = time.time()
        while time.time() - start < timeout:
            with self.lock:
                available = list(self.servers)
            random.shuffle(available)
            
            for server in available:
                try:
                    conn = server.get_connection()
                    if conn and conn.connected():
                        return server
                except Exception as e:
                    logger.warning("Server %s:%s unavailable: %s", server.host, server.port, e)
            
            time.sleep(1)
        
        raise RuntimeError("No FreeSWITCH servers available")

# =====================================================
# Initialize Pool
# =====================================================

esl_servers = [ESLWrapper(s["host"], s["port"], s["password"], CONCURRENT_LIMIT) for s in FS_SERVERS]
fs_pool = FreeSwitchPool(esl_servers)

# =====================================================
# Kafka
# =====================================================

kafka_config = {
    "bootstrap.servers": f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}",
    "group.id": "emergency-ivr-consumer-group",
    "enable.auto.commit": False,
    "auto.offset.reset": "earliest",
    "session.timeout.ms": 30000,
    "heartbeat.interval.ms": 10000,
    "max.poll.interval.ms": 300000,
}

consumer = Consumer(kafka_config)

# =====================================================
# Call Origination
# =====================================================

def originate_call(event: dict):

    lead_number = event.get("lead_number")
    campaign_id = event.get("campaign_id")
    carrier_name = event.get("carrierName")
    campaign_name = event.get("campaignName", f"Emergency_{campaign_id}")
    database = event.get("database")
    c_id = event.get("c_Id", "")
    carrier_prefix = event.get("carrierPrefix", "")
    caller_id = event.get("callerId") or event.get("c_clinumberName") or lead_number

    ivr_config = event.get("ivr_config", {})
    ivr_audio_url = ivr_config.get("audioUrl")
    ivr_type = ivr_config.get("type", "AUDIO")

    if not ivr_audio_url and ivr_type != "MULTILINGUAL":
        logger.error("No IVR audio URL for %s", lead_number)
        return

    try:
        server = fs_pool.get()
        conn = server.get_connection()

        with server.semaphore:

            # Prepare variables for the dialplan
            ivr_type = ivr_config.get("type", "AUDIO")
            flow_id = ivr_config.get("flowId")
            
            # Common variables for all originate commands
            vars_dict = {
                "customerNumber": lead_number,
                "account_id": str(event.get("account_id") or "0"),
                "account_no": str(event.get("account_no") or "0"),
                "database": event.get("database", "onedb"),
                "origination_caller_id_number": caller_id,
                "origination_caller_id_name": caller_id,
                "sip_h_X-fscallerid": caller_id,
                "sip_h_X-campaignId": str(campaign_id),
                "ignore_early_media": "ring_ready",
                "progress_timeout": "30",
                "is_emergency": "true",
                "session_in_hangup_hook": "true",
                "ivr_type": ivr_type,
                "ivr_audio_url": ivr_audio_url or "",
                "ivr_flow_id": str(flow_id or "0"),
                "cf_callflowId": str(flow_id or "0"),
                "api_hangup_hook": f"'lua /opt/freeswitch/storage/script/orient_hangup.lua {campaign_id} {lead_number}'"
            }
            
            vars_str = ",".join([f"{k}={v}" for k, v in vars_dict.items()])

            dial_cmd = (
                f"originate {{{vars_str}}}"
                f"sofia/gateway/{carrier_name}/{carrier_prefix}{lead_number} "
            )

            if ivr_type == "FLOW":
                # Transfer to the extension that handles complex flows via callroutingDomestic
                dial_cmd += "pulseEmergency" # FreeSWITCH handles this as the destination extension
            elif ivr_type == "MULTILINGUAL":
                # Transfer to a specialized Lua script for language selection and dynamic prompt playback
                prompt_json = ivr_config.get("prompt_json", "{}")
                # Compact JSON to remove spaces and minimize parsing issues in FreeSWITCH
                compact_json = json.dumps(json.loads(prompt_json), separators=(',', ':'))
                vars_dict["ivr_prompt_json"] = f"'{compact_json}'"
                # Update vars_str to include the new variable
                vars_str = ",".join([f"{k}={v}" for k, v in vars_dict.items()])
                dial_cmd = f"originate {{{vars_str}}}sofia/gateway/{carrier_name}/{carrier_prefix}{lead_number} &lua(/opt/freeswitch/storage/script/emergency_multilingual.lua)"
            elif ivr_config.get("nodeType") == "keypad":
                # Simple single-step keypad
                dial_cmd += f"&read(1 1 {ivr_audio_url} ivr_response 5000 #)"
            else:
                # Simple single-step playback
                dial_cmd += f"&playback({ivr_audio_url})"

            logger.info("Dial: %s", dial_cmd)

            response = conn.bgapi(dial_cmd)
            if response:
                body = response.getBody() or ""
                job_uuid = body.strip()
                if not job_uuid:
                     # Some versions return it in a header
                     job_uuid = response.getHeader("Job-UUID")
                
                logger.info("ESL Response: %s", body)
                logger.info("Call queued. Job UUID: %s | lead=%s", job_uuid, lead_number)
            else:
                logger.error("❌ Failed to get response from bgapi for %s", lead_number)

    except Exception as e:
        logger.error("Originate failed for %s: %s", lead_number, e)
# =====================================================
# Main Consumer Loop
# =====================================================

def consume():
    """Main Kafka consumer loop"""
    consumer.subscribe([KAFKA_TOPIC])
    logger.info("🚀 Subscribed to topic: %s", KAFKA_TOPIC)

    while running:
        try:
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                logger.error("Kafka error: %s", msg.error())
                continue

            try:
                raw = msg.value().decode("utf-8")
                event = json.loads(raw)
                logger.info("🔥 Received: %s", event)

                thread = threading.Thread(target=originate_call, args=(event,), daemon=True)
                thread.start()

                consumer.commit(message=msg)

            except json.JSONDecodeError as e:
                logger.error("Invalid JSON: %s", e)
                consumer.commit(message=msg)
            except Exception as e:
                logger.error("Error processing message: %s", e)
                consumer.commit(message=msg)

        except Exception as e:
            logger.error("Consumer loop error: %s", e)
            time.sleep(2)

    logger.info("Consumer stopped.")
    consumer.close()

# =====================================================
# Entrypoint
# =====================================================

if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    logger.info("🚀 Starting Emergency IVR Consumer...")
    logger.info("Kafka topic: %s", KAFKA_TOPIC)
    logger.info("Kafka broker: %s:%s", settings.KAFKA_HOST, settings.KAFKA_PORT)
    logger.info("FreeSWITCH servers: %s", FS_SERVERS)
    logger.info("Concurrent limit: %s", CONCURRENT_LIMIT)

    consume()
