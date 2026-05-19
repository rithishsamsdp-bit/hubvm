#!/usr/bin/env python3
import os
import sys
import json
import time
import signal
import logging
import ssl
import urllib3
from typing import Dict, Optional, List
from concurrent.futures import ThreadPoolExecutor
from confluent_kafka import Consumer, KafkaError, KafkaException, Producer
import mysql.connector
from mysql.connector import pooling, errors
import requests
from http.cookies import SimpleCookie
import socketio
from threading import Lock, Event
from datetime import datetime, timedelta
from collections import defaultdict, deque
import pytz
from zoneinfo import ZoneInfo
from decimal import Decimal

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
BROKERS = os.getenv("KAFKA_BROKERS", "kafka-service:9092")
GROUP_ID = os.getenv("KAFKA_GROUP_ID", "livemonitor-group")
TOPIC = os.getenv("KAFKA_TOPIC", "livemonitor-topic")
DLT_TOPIC = os.getenv("KAFKA_DLT_TOPIC", "")
AUTO_OFFSET_RESET = os.getenv("KAFKA_AUTO_OFFSET_RESET", "latest")
SECURITY_PROTOCOL = os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT")
COMMIT_EVERY_N = int(os.getenv("COMMIT_EVERY_N", "100"))
COMMIT_EVERY_SEC = float(os.getenv("COMMIT_EVERY_SEC", "5.0"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "5"))
BASE_BACKOFF_SEC = float(os.getenv("BASE_BACKOFF_SEC", "0.25"))
BACKOFF_MAX_SEC = float(os.getenv("BACKOFF_MAX_SEC", "8.0"))
POLL_TIMEOUT_SEC = float(os.getenv("POLL_TIMEOUT_SEC", "1.0"))
MAX_POLL_INTERVAL_MS = int(os.getenv("MAX_POLL_INTERVAL_MS", "300000"))
SESSION_TIMEOUT_MS = int(os.getenv("SESSION_TIMEOUT_MS", "45000"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "10"))

# Status debouncing configuration
STATUS_DEBOUNCE_WINDOW = float(os.getenv("STATUS_DEBOUNCE_WINDOW", "2.0"))
STATUS_HISTORY_SIZE = int(os.getenv("STATUS_HISTORY_SIZE", "10"))

# NEW: Agent timeout tracking configuration
AGENT_STATUS_TIMEOUT = float(os.getenv("AGENT_STATUS_TIMEOUT", "20.0"))  # 1 minute in seconds
TIMEOUT_CHECK_INTERVAL = float(os.getenv("TIMEOUT_CHECK_INTERVAL", "10.0"))  # Check every 10 seconds

# Thread-safe data structures
agent_status_map: Dict[str, str] = {}
agent_status_map_lock = Lock()
agent_status_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=STATUS_HISTORY_SIZE))
agent_last_update: Dict[str, float] = {}

# NEW: Agent timeout tracking
agent_status_timestamps: Dict[str, float] = {}  # Extension -> timestamp when status started
agent_timeout_notified: Dict[str, bool] = {}  # Extension -> whether timeout was already notified
agent_timeout_lock = Lock()

# DB Config
DB_HOST = os.getenv("DB_HOST", "pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASS = os.getenv("DB_PASS", "#Pulse#$2024")
DB_NAME = os.getenv("DB_NAME", "onedb")
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "13"))
DB_POOL_RESET_SESSION = bool(os.getenv("DB_POOL_RESET_SESSION", "True"))
DB_CONNECTION_TIMEOUT = int(os.getenv("DB_CONNECTION_TIMEOUT", "10"))

# Secondary DB Config
SECONDARY_DB_HOST = os.getenv("SECONDARY_DB_HOST", "10.0.4.129")
SECONDARY_DB_USER = os.getenv("SECONDARY_DB_USER", "admin")
SECONDARY_DB_PASS = os.getenv("SECONDARY_DB_PASS", "#Pulse#$2024")
SECONDARY_DB_NAME = os.getenv("SECONDARY_DB_NAME", "onedb")
SECONDARY_DB_CONNECTION_TIMEOUT = int(os.getenv("SECONDARY_DB_CONNECTION_TIMEOUT", "10"))


# Socket.IO Config
SOCKETIO_URL = os.getenv("SOCKETIO_URL", "https://connecthub.pulsework360.com")
SOCKETIO_PATH = os.getenv("SOCKETIO_PATH", "/socketadmin")
SOCKETIO_NAMESPACE = os.getenv("SOCKETIO_NAMESPACE", "/socketadmin/monitoring")
LOGIN_URL = os.getenv("LOGIN_URL", "https://connecthub.pulsework360.com/auth/login")
ACCOUNT_CODE = os.getenv("ACCOUNT_CODE", "PUTPL")
MEMBER_NAME = os.getenv("MEMBER_NAME", "ssadmin")
MEMBER_PASSWORD = os.getenv("MEMBER_PASSWORD", "Pulse@123")
emitted_ids = {}
IST = ZoneInfo("Asia/Kolkata")

# Logging
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("kafka-consumer")

# Shutdown
_shutdown = False
def _handle_signal(signum, frame):
    global _shutdown
    log.warning(f"Received signal {signum}; shutting down…")
    _shutdown = True

signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


# Socket.IO Manager Class
class SocketIOManager:
    def __init__(self, config):
        self.config = config
        self.sio = None
        self.access_token = None
        self.token_expiry = None
        self.lock = Lock()
        self.shutdown_event = Event()
        self.last_connect_attempt = 0
        self.connect_retry_delay = 5
        self.max_retry_delay = 300
        
    def get_access_token(self):
        """Login and retrieve access token"""
        try:
            session = requests.Session()
            payload = {
                "accountcode": self.config['account_code'],
                "membername": self.config['member_name'],
                "memberpassword": self.config['member_password']
            }
            headers = {'Content-Type': 'application/json'}

            response = session.post(
                self.config['login_url'], 
                headers=headers, 
                json=payload,
                verify=False,
                timeout=10
            )
            
            if response.status_code != 200:
                log.error(f"Login failed with status {response.status_code}: {response.text}")
                return None

            access_token = None
            for raw_cookie in response.raw.headers.getlist("Set-Cookie"):
                # Each raw_cookie is a single "name=value; attr; attr" string
                name_value = raw_cookie.split(";")[0].strip()
                if name_value.startswith("accessToken="):
                    access_token = name_value.split("=", 1)[1].strip()
                    break

            if not access_token:
                log.error("accessToken not found in Set-Cookie headers")
                return None

            self.token_expiry = datetime.now() + timedelta(hours=1)
            log.info("Access token retrieved successfully")
            return access_token

        except Exception as e:
            log.error(f"❌ Failed to get access token: {e}")
            return None

    def is_token_valid(self):
        """Check if current token is still valid"""
        if not self.access_token or not self.token_expiry:
            return False
        return datetime.now() < (self.token_expiry - timedelta(minutes=5))

    def setup_socketio(self):
        """Setup Socket.IO client with proper error handling"""
        with self.lock:
            try:
                now = time.time()
                if now - self.last_connect_attempt < self.connect_retry_delay:
                    log.debug(f"Rate limiting connection attempts, waiting {self.connect_retry_delay}s")
                    return False
                
                self.last_connect_attempt = now

                if not self.is_token_valid():
                    log.info("Token expired or missing, getting new token...")
                    self.access_token = self.get_access_token()
                    if not self.access_token:
                        self.connect_retry_delay = min(self.connect_retry_delay * 2, self.max_retry_delay)
                        return False

                if self.sio:
                    try:
                        self.sio.disconnect()
                    except:
                        pass
                    self.sio = None

                self.sio = socketio.Client(
                    logger=False, 
                    engineio_logger=False,
                    reconnection=False
                )
                
                self.sio.eio.ssl_verify = False
                self.sio.eio.ssl_context = ssl._create_unverified_context()

                namespace = AdminNamespace(self.config['namespace'], self)
                self.sio.register_namespace(namespace)

                auth_headers = {
                    "Cookie": f"accessToken={self.access_token}",
                    "User-Agent": "PulseWork-Monitor/1.0"
                }

                log.info(f"Attempting to connect to {self.config['url']}...")
                self.sio.connect(
                    self.config['url'],
                    headers=auth_headers,
                    socketio_path=self.config['path'],
                    namespaces=[self.config['namespace']],
                    transports=["websocket"],
                    wait_timeout=10
                )
                
                self.connect_retry_delay = 5
                log.info("✅ Socket.IO client connected successfully")
                return True

            except socketio.exceptions.ConnectionError as e:
                log.error(f"❌ Socket.IO connection error: {e}")
                self.connect_retry_delay = min(self.connect_retry_delay * 2, self.max_retry_delay)
                self.access_token = None
                return False
            except Exception as e:
                log.error(f"❌ Socket.IO setup failed: {e}")
                self.connect_retry_delay = min(self.connect_retry_delay * 2, self.max_retry_delay)
                return False

    def emit(self, event, data):
        """Emit event with connection check"""
        if not self.sio or not self.sio.connected:
            log.warning("Socket.IO not connected, cannot emit")
            return False
        
        try:
            self.sio.emit(event, data, namespace=self.config['namespace'])
            return True
        except Exception as e:
            log.error(f"Failed to emit: {e}")
            return False

    def is_connected(self):
        """Check if Socket.IO is connected"""
        return self.sio and self.sio.connected

    def disconnect(self):
        """Gracefully disconnect"""
        self.shutdown_event.set()
        if self.sio:
            try:
                self.sio.disconnect()
            except:
                pass

    def monitor_connection(self):
        """Background task to monitor and maintain connection"""
        log.info("Starting Socket.IO connection monitor...")
        
        while not self.shutdown_event.is_set():
            try:
                if not self.is_connected():
                    log.warning("Socket.IO disconnected, attempting to reconnect...")
                    self.setup_socketio()
                
                self.shutdown_event.wait(30)
                
            except Exception as e:
                log.error(f"Error in connection monitor: {e}")
                self.shutdown_event.wait(10)
        
        log.info("Socket.IO connection monitor stopped")


class AdminNamespace(socketio.ClientNamespace):
    def __init__(self, namespace, manager):
        super().__init__(namespace)
        self.manager = manager

    def on_connect(self):
        log.info(f"🔌 Connected to {self.namespace}")

    def on_disconnect(self):
        log.warning(f"❎ Disconnected from {self.namespace}")

    def on_connect_error(self, data):
        log.error(f"❌ Connection error to {self.namespace}: {data}")
        self.manager.access_token = None
        
        if isinstance(data, dict) and 'message' in data:
            if 'rejected' in data['message'].lower() or 'unauthorized' in data['message'].lower():
                log.error("Authentication rejected - will refresh token on next attempt")

    def on_response(self, data):
        log.debug(f"📩 Got response: {data}")


def initialize_socketio():
    """Initialize Socket.IO manager"""
    config = {
        'url': SOCKETIO_URL,
        'path': SOCKETIO_PATH,
        'namespace': SOCKETIO_NAMESPACE,
        'login_url': LOGIN_URL,
        'account_code': ACCOUNT_CODE,
        'member_name': MEMBER_NAME,
        'member_password': MEMBER_PASSWORD
    }
    
    manager = SocketIOManager(config)
    
    if not manager.setup_socketio():
        log.warning("Initial Socket.IO connection failed, will retry in background")
    
    return manager

# NEW: Agent Status Timeout Monitor
def monitor_agent_status_timeouts():
    """Background thread to monitor agents that stay in AVAILABLE/UNAVAILABLE for > 1 minute"""
    log.info("🕐 Starting agent status timeout monitor...")
    
    while not _shutdown:
        try:
            current_time = time.time()
            agents_to_update = []
            
            with agent_timeout_lock:
                for extension, status in list(agent_status_map.items()):
                    # Only check AVAILABLE or UNAVAILABLE status
                    if status not in ['AVAILABLE', 'UNAVAILABLE']:
                        # Reset tracking for other statuses
                        if extension in agent_status_timestamps:
                            del agent_status_timestamps[extension]
                        if extension in agent_timeout_notified:
                            del agent_timeout_notified[extension]
                        continue
                    
                    # Get or set timestamp for this status
                    if extension not in agent_status_timestamps:
                        agent_status_timestamps[extension] = current_time
                        agent_timeout_notified[extension] = False
                        continue
                    
                    # Check if timeout exceeded
                    time_in_status = current_time - agent_status_timestamps[extension]
                    
                    if time_in_status >= AGENT_STATUS_TIMEOUT and not agent_timeout_notified.get(extension, False):
                        agents_to_update.append({
                            'extension': extension,
                            'status': status,
                            'duration': time_in_status
                        })
                        agent_timeout_notified[extension] = True
            
            # Update database for agents that exceeded timeout
            if agents_to_update:
                update_agent_timeout_status(agents_to_update)
            
            # Sleep until next check
            time.sleep(TIMEOUT_CHECK_INTERVAL)
            
        except Exception as e:
            log.error(f"Error in agent status timeout monitor: {e}")
            time.sleep(TIMEOUT_CHECK_INTERVAL)
    
    log.info("🕐 Agent status timeout monitor stopped")


def update_agent_timeout_status(agents_to_update: List[Dict]):
    """Update primary DB and secondary Agents table for agents that have been AVAILABLE/UNAVAILABLE > 1 minute"""
    conn = None
    cursor = None
    
    try:
        # Get primary database connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        for agent_info in agents_to_update:
            extension = agent_info['extension']
            status = agent_info['status']
            duration = agent_info['duration']
            
            log.info(f"⏰ Agent {extension} has been {status} for {int(duration)} seconds, updating databases")
            
            # Query primary database
            cursor.execute("SELECT * FROM p_members WHERE m_memberExtensionNo = %s", (extension,))   
            member = cursor.fetchone()
            dbstatus = member['m_status'] if member else None
            m_memberMode = member['m_memberMode'] if member else None
            if not member:
                log.warning(f"Member not found for extension {extension}")
                continue
            
            if status == 'UNAVAILABLE' and dbstatus == 'LOGOUT':
                m_memberId = member['m_memberId']
                m_accountId = member['m_accountId']
                m_accountNo = member['m_accountNo']
                m_memberExtensionNo = member['m_memberExtensionNo']
                oldReadyStatus = member['m_readyStatus']
                oldReadyStartTime = member['m_readyStatusStartTime']
                oldstatus = member['m_status']
                oldstatusTime = member['m_statusTime']
                
                log.info(f"m_memberId {m_memberId}, m_accountId, {m_accountId}, m_accountNo {m_accountNo}, m_memberExtensionNo {m_memberExtensionNo}, oldReadyStatus {oldReadyStatus}, oldReadyStartTime {oldReadyStartTime} m_memberMode {m_memberMode}")
                # Update primary database
                primary_updated = False
                try:
                    if oldReadyStatus and oldReadyStartTime:
                        nowIst = datetime.now(ZoneInfo("Asia/Kolkata"))
                        if oldReadyStartTime.tzinfo is None:
                            oldReadyStartTime = oldReadyStartTime.replace(tzinfo=ZoneInfo("Asia/Kolkata"))
                        timeDiff = nowIst - oldReadyStartTime
                        oldreadystateDuration = max(0, int(timeDiff.total_seconds()))
                        
                        cursor.execute(
                            """INSERT INTO p_agentstatus (a_memberId, a_accountId, a_accountNo, a_memberExtensionNo, 
                            a_status, a_startTime, a_endTime, a_durationSeconds) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""", 
                            (m_memberId, m_accountId, m_accountNo, m_memberExtensionNo, oldReadyStatus, 
                             oldReadyStartTime, nowIst, oldreadystateDuration)
                        )
                        if oldstatusTime.tzinfo is None:
                            oldstatusTime = oldReadyStartTime.replace(tzinfo=ZoneInfo("Asia/Kolkata"))
                        oldStatusdiff = nowIst - oldstatusTime
                        oldStatusDuration = max(0, int(oldStatusdiff.total_seconds()))
                        
                        cursor.execute("""INSERT INTO p_agentstatus (a_memberId, a_accountId, a_accountNo, 
                        a_memberExtensionNo, a_status, a_startTime, a_endTime, a_durationSeconds) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""", (m_memberId, m_accountId, 
                        m_accountNo, m_memberExtensionNo, oldstatus, oldstatusTime, nowIst, oldStatusDuration))
                        
                        cursor.execute(
                            "UPDATE p_members SET m_readyStatus = %s, m_readyStatusStartTime = %s, m_status = %s, m_statusTime = %s WHERE m_memberId = %s", 
                            ('', None, '', None, m_memberId)
                        )
                        
                        conn.commit()
                        log.info(f"✅ Primary DB updated for agent {extension}")
                        primary_updated = True
                    else:
                        log.debug(f"Skipping primary DB update - missing ready status or start time for {extension}")
                        primary_updated = True
                        
                except Exception as e:
                    log.error(f"Error updating primary database for {extension}: {e}")
                    try:
                        conn.rollback()
                    except:
                        pass
                    continue
                
                secondary_conn = None
                secondary_cursor = None
                try:
                    secondary_conn = get_secondary_db_connection()
                    secondary_cursor = secondary_conn.cursor()
                    
                    secondary_cursor.execute(
                        "UPDATE agents SET status = %s, no_answer_count = %s WHERE name LIKE %s",
                        ('Logged Out', 0, f'%{extension}%')
                    )
                    
                    rows_affected = secondary_cursor.rowcount
                    secondary_conn.commit()
                    
                    log.info(f"✅ Secondary DB (Agents table) updated for {extension} - rows affected: {rows_affected}")
                    
                except Exception as e:
                    log.error(f"Error updating secondary database for {extension}: {e}")
                    if secondary_conn:
                        try:
                            secondary_conn.rollback()
                        except:
                            pass
                    # Secondary DB failure is not critical - continue processing
                    
                finally:
                    if secondary_cursor:
                        try:
                            secondary_cursor.close()
                        except:
                            pass
                    if secondary_conn:
                        try:
                            secondary_conn.close()
                        except:
                            pass
            else:
                if m_memberMode == 'SOFTPHONE':
                    secondary_conn = None
                    secondary_cursor = None
                    try:
                        secondary_conn = get_secondary_db_connection()
                        secondary_cursor = secondary_conn.cursor()
                        
                        secondary_cursor.execute("UPDATE agents SET status = %s, no_answer_count = %s WHERE name LIKE %s",('Available', 0, f'%{extension}%'))
                        rows_affected = secondary_cursor.rowcount
                        secondary_conn.commit()
                        
                        log.info(f"✅ Secondary DB (Agents table) updated for {extension} - rows affected: {rows_affected}")
                        
                    except Exception as e:
                        log.error(f"Error updating secondary database for {extension}: {e}")
                        if secondary_conn:
                            try:
                                secondary_conn.rollback()
                            except:
                                pass
                        # Secondary DB failure is not critical - continue processing
                        
                    finally:
                        if secondary_cursor:
                            try:
                                secondary_cursor.close()
                            except:
                                pass
                        if secondary_conn:
                            try:
                                secondary_conn.close()
                            except:
                                pass
                    
            
    except Exception as e:
        log.error(f"Error in update_agent_timeout_status: {e}")
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if conn:
            try:
                conn.close()
            except:
                pass



# Status Debouncing Logic
def should_process_status_change(extension: str, new_status: str) -> bool:
    current_time = time.time()
    current_status = agent_status_map.get(extension)
    history = agent_status_history[extension]
    last_update = agent_last_update.get(extension, 0)
    log.info(f"🔌 current state {current_status} old state {new_status}")
    
    if current_status == new_status:
        return False
    
    # NEW: Reset timeout tracking when status changes
    with agent_timeout_lock:
        if current_status != new_status:
            agent_status_timestamps[extension] = current_time
            agent_timeout_notified[extension] = False

    history.append(new_status)
    agent_last_update[extension] = current_time
    return True


def convert_json_safe(obj):
    if isinstance(obj, dict):
        return {k: convert_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_json_safe(i) for i in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    else:
        return obj


def emit_agent_status_update(manager, extension: str, status: str, payload: dict, id: int):
    """Emit agent status update via Socket.IO"""
    
    if not manager:
        log.debug(f"Socket.IO manager not initialized for {extension}, skipping emit")
        return
    
    if not manager.is_connected():
        log.warning("Socket.IO client not connected, skipping emit")
        return

    try:
        if id not in emitted_ids:
            now = datetime.now(IST)
            emitted_ids[id] = now
        
        payload = convert_json_safe(payload)
        data = {
            "id": id,
            "extension": extension,
            "data": payload,
        }
        
        if manager.emit("message", data):
            log.info(f"📤 Emitted agent status update: {extension} -> {status}, ID={id}")
        else:
            log.warning(f"Failed to emit update for {extension}")

    except Exception as e:
        log.error(f"❌ Failed to emit Socket.IO message: {e}")


def getCallData(account_id, cursor=None):
    try:
        if cursor is None:
            raise ValueError("Cursor must be provided")

        stats_query = """SELECT SUM(CASE WHEN c_direction = 'Inbound' THEN 1 ELSE 0 END) AS ml_inboundTotal, 
        SUM(CASE WHEN c_direction = 'Inbound' AND c_disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS ml_inboundAnswered, 
        SUM(CASE WHEN c_direction = 'Inbound' AND c_disposition = 'No Answer' THEN 1 ELSE 0 END) AS ml_inboundUnAnswered, 
        SUM(CASE WHEN c_direction = 'Outbound' THEN 1 ELSE 0 END) AS ml_outboundTotal, 
        SUM(CASE WHEN c_direction = 'Outbound' AND c_disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS ml_outboundAnswered, 
        SUM(CASE WHEN c_direction = 'Outbound' AND c_disposition = 'No Answer' THEN 1 ELSE 0 END) AS ml_outboundUnAnswered,
        SUM(CASE WHEN c_disposition = 'ANSWERED' THEN c_talktime ELSE 0 END) AS ml_answeredTotalTalktime, 
        SUM(CASE WHEN c_disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS ml_totalAnsweredCalls,
        SUM(CASE WHEN c_disposition = 'ANSWERED' THEN c_talktime ELSE 0 END) / NULLIF(SUM(CASE WHEN c_disposition = 'ANSWERED' THEN 1 ELSE 0 END), 0) AS ml_avgTalktimeAnswered
        FROM p_calls WHERE c_accountId = %s AND DATE(c_callDateTime) = CURRENT_DATE;"""
        cursor.execute(stats_query, (account_id,))
        call_stats = cursor.fetchone()

        live_query = """SELECT l_accountId,l_accountNo,l_CliNumber,l_CustomerNumber,l_memberExtention,
        l_callDirection,l_callStatus,l_callServerIP,l_callUUID,l_callStartTime 
        FROM p_liveCallStatus WHERE l_accountId = %s AND DATE(l_callStartTime) = CURRENT_DATE 
        ORDER BY l_callStartTime DESC;"""
        cursor.execute(live_query, (account_id,))
        live_calls = cursor.fetchall()

        per_agent_query = """SELECT p_members.m_memberExtensionNo, p_members.m_accountId, p_members.m_accountNo, p_members.m_memberName, p_members.m_memberId, anon_1.inbound_total, anon_1.inbound_answered, anon_1.inbound_unanswered, anon_1.outbound_total, anon_1.outbound_answered, anon_1.outbound_unanswered, p_liveMonitoring.l_memberCampaignId, p_liveMonitoring.l_memberCampaignName, p_liveMonitoring.l_memberCustomerNumber, p_liveMonitoring.l_memberCallDirection, p_liveMonitoring.l_memberuuid, p_liveMonitoring.l_memberStatus, p_liveMonitoring.l_memberCliNumberId, p_liveMonitoring.l_memberServerIp, p_liveMonitoring.l_memberLastUpdated FROM p_members LEFT OUTER JOIN (SELECT p_calls.c_memberExtensionNo AS agent, sum(CASE WHEN (p_calls.c_direction = 'Inbound') THEN 1 ELSE 0 END) AS inbound_total, sum(CASE WHEN (p_calls.c_direction = 'Inbound' AND p_calls.c_disposition = 'ANSWERED') THEN 1 ELSE 0 END) AS inbound_answered, sum(CASE WHEN (p_calls.c_direction = 'Inbound' AND p_calls.c_disposition = 'No Answer') THEN 1 ELSE 0 END) AS inbound_unanswered, sum(CASE WHEN (p_calls.c_direction = 'Outbound') THEN 1 ELSE 0 END) AS outbound_total, sum(CASE WHEN (p_calls.c_direction = 'Outbound' AND p_calls.c_disposition = 'ANSWERED') THEN 1 ELSE 0 END) AS outbound_answered, sum(CASE WHEN (p_calls.c_direction = 'Outbound' AND p_calls.c_disposition = 'No Answer') THEN 1 ELSE 0 END) AS outbound_unanswered FROM p_calls WHERE CAST(p_calls.c_callDateTime AS DATE) = CURRENT_DATE GROUP BY p_calls.c_memberExtensionNo) AS anon_1 ON anon_1.agent = p_members.m_memberExtensionNo LEFT OUTER JOIN p_liveMonitoring ON p_liveMonitoring.l_memberExtention = p_members.m_memberExtensionNo WHERE p_members.m_accountId = %s AND p_members.m_memberRole = 'USER';"""
        cursor.execute(per_agent_query, (account_id,))
        per_agent_stats = cursor.fetchall()

        total_live_calls_query = """SELECT COUNT(*) AS total_live_calls FROM p_liveCallStatus 
        WHERE l_accountId = %s AND DATE(l_callStartTime) = CURRENT_DATE;"""
        cursor.execute(total_live_calls_query, (account_id,))
        total_live_calls = cursor.fetchone()['total_live_calls']

        return call_stats, per_agent_stats, live_calls, total_live_calls

    except Exception as e:
        log.error(f"Error in getCallData: {e}")
        return None, None, None, None


# Kafka config
def _mk_common_conf() -> Dict[str, str]:
    return {
        "bootstrap.servers": BROKERS,
        "security.protocol": SECURITY_PROTOCOL,
        "group.id": GROUP_ID,
        "enable.auto.commit": False,
        "auto.offset.reset": AUTO_OFFSET_RESET,
        "session.timeout.ms": SESSION_TIMEOUT_MS,
        "max.poll.interval.ms": MAX_POLL_INTERVAL_MS,
        "partition.assignment.strategy": "range",
    }


# Database Pool
def init_db_pool():
    config = {
        'pool_name': "mypool",
        'pool_size': DB_POOL_SIZE,
        'host': DB_HOST,
        'user': DB_USER,
        'password': DB_PASS,
        'database': DB_NAME,
        'autocommit': True,
        'connection_timeout': DB_CONNECTION_TIMEOUT,
        'pool_reset_session': DB_POOL_RESET_SESSION,
        'charset': 'utf8mb4',
        'use_unicode': True,
        'get_warnings': True,
        'raise_on_warnings': True,
        'sql_mode': 'TRADITIONAL',
    }
    
    return pooling.MySQLConnectionPool(**config)

db_pool: Optional[pooling.MySQLConnectionPool] = None
socketio_client: Optional[SocketIOManager] = None


# Database Connection Helper
def get_db_connection():
    """Get database connection with proper error handling and retry logic"""
    max_retries = 3
    retry_delay = 0.5
    
    for attempt in range(max_retries):
        try:
            conn = db_pool.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            return conn
        except errors.PoolError as e:
            if "queue is full" in str(e).lower():
                if attempt < max_retries - 1:
                    log.warning(f"Connection pool full, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
            log.error(f"Database pool error: {e}")
            raise
        except Exception as e:
            if attempt < max_retries - 1:
                log.warning(f"Database connection error, retrying: {e}")
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            log.error(f"Failed to get database connection after {max_retries} attempts: {e}")
            raise

def get_secondary_db_connection():
    """Get direct secondary database connection (no pooling to avoid exhaustion)"""
    max_retries = 2
    retry_delay = 0.5
    
    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(
                host=SECONDARY_DB_HOST,
                user=SECONDARY_DB_USER,
                password=SECONDARY_DB_PASS,
                database=SECONDARY_DB_NAME,
                connection_timeout=SECONDARY_DB_CONNECTION_TIMEOUT,
                autocommit=True,
                charset='utf8mb4',
                use_unicode=True
            )
            
            # Quick test
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            
            log.debug(f"✅ Secondary DB direct connection established")
            return conn
            
        except mysql.connector.Error as e:
            if attempt < max_retries - 1:
                log.warning(f"Secondary DB connection failed, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries}): {e}")
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            log.error(f"Failed to connect to secondary database after {max_retries} attempts: {e}")
            raise
        except Exception as e:
            log.error(f"Unexpected error connecting to secondary database: {e}")
            raise

# Domain logic
def process_message(value: bytes, key: Optional[bytes], headers: Optional[List]) -> None:
    global agent_status_map, socketio_client
    conn = None
    cursor = None
    try:
        payload = json.loads(value.decode("utf-8"))
        log.info(f"Processing: {payload}")
        message_type = payload.get("type")
        if not message_type:
            log.warning("Message missing 'type' field, skipping")
            return
        log.info(f"Processing message type: {message_type}")
        
        if payload.get("force_fail"):
            raise RuntimeError("Forced failure for demo")
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if message_type == "AgentPresence":
            process_agent_presence(payload, cursor, conn)
        elif message_type == "AgentReadyAPI":
            process_agent_ready_api(payload, cursor, conn)
        elif message_type == "AgentBreakAPI":
            process_agent_break_api(payload, cursor, conn)
        elif message_type == "ChangeCampaignAPI":
            m_memberExtensionNo = payload.get('extension')
            status = ''
            id = int(str(m_memberExtensionNo)[:-4])
            if socketio_client and socketio_client.is_connected():
                emit_agent_status_update(socketio_client, m_memberExtensionNo, status, payload, id)
            else:
                log.warning("Socket.IO not connected, skipping emit")
        else:
            log.warning(f"Unknown message type: {message_type}")
            
    except errors.PoolError as e:
        log.warning(f"MySQL pool error: {e}")
        raise
    except Exception as e:
        log.exception(f"Unexpected error processing message: {e}")
        raise
    finally:
        if cursor:
            try: 
                cursor.close()
            except: 
                pass
        if conn:
            try: 
                conn.close()
            except: 
                pass


def process_agent_presence(payload: dict, cursor, conn):
    log.info(f"📤 Payload data: {payload}")
    global agent_status_map, socketio_client
    
    l_memberStatus = payload.get('l_memberStatus')
    l_memberExtention = payload.get('l_memberExtention')
    l_memberCustomerNumber = payload.get('l_memberCustomerNumber')
    raw_cli_id = payload.get("l_memberCliNumberId")
    l_memberCallDirection = payload.get('l_memberCallDirection')
    l_memberuuid = payload.get('l_memberuuid')
    l_memberServerIp = payload.get('l_memberServerIp')
    eventOriginate = payload.get('eventOriginate')
    
    try:
        l_memberCliNumberId = int(raw_cli_id) if raw_cli_id not in (None, "", "null") else 0
    except (ValueError, TypeError):
        l_memberCliNumberId = 0
    
    log.info(f"Agent {l_memberExtention}: current={agent_status_map.get(l_memberExtention)} -> new={l_memberStatus}")
    
    with agent_status_map_lock:
        try:
            if eventOriginate == 'Freeswitch':
                if l_memberStatus == 'INIT':
                    if l_memberCallDirection != 'Inbound':
                        if not l_memberExtention or not l_memberStatus:
                            return
                    
                    query = """UPDATE p_liveMonitoring SET l_memberCustomerNumber = %s, l_memberCliNumberId = %s, 
                    l_memberCallDirection = %s, l_memberuuid = %s, l_memberStatus = %s, l_memberServerIp = %s 
                    WHERE l_memberExtention = %s"""
                    cursor.execute(query, (l_memberCustomerNumber, l_memberCliNumberId, l_memberCallDirection, 
                                          l_memberuuid, l_memberStatus, l_memberServerIp, l_memberExtention))
                    
                    # Fetch member name
                    member_name_query = "SELECT m_memberName FROM p_members WHERE m_memberExtensionNo = %s"
                    cursor.execute(member_name_query, (l_memberExtention,))
                    member_row = cursor.fetchone()
                    m_memberName = member_row['m_memberName'] if member_row else ""

                    accID = payload.get('l_accountid')
                    accno = payload.get('l_accountno')
                    livecallstatusin = """INSERT INTO p_liveCallStatus (l_accountId, l_accountNo, l_CliNumber, 
                    l_CustomerNumber, l_callDirection, l_callStatus,l_callServerIP,l_callUUID)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
                    cursor.execute(livecallstatusin, (accID, accno, l_memberCliNumberId, l_memberCustomerNumber,
                                                      l_memberCallDirection, l_memberStatus, l_memberServerIp, l_memberuuid))
                    
                    payloaddata = {
                        "type": "AgentPresence",
                        "extension": l_memberExtention,
                        "status": l_memberStatus,
                        "memberCustomerNumber": l_memberCustomerNumber,
                        "memberCliNumberId": l_memberCliNumberId,
                        "memberCallDirection": l_memberCallDirection,
                        "memberServerIp": l_memberServerIp,
                        "nowIst": datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
                    }
                    emit_agent_status_update(socketio_client, l_memberExtention, l_memberStatus, payloaddata, accID)
                    
                    payloadcalls = {
                        "type": "CallInsertData",
                        "l_CliNumber": l_memberCliNumberId,
                        "l_CustomerNumber": l_memberCustomerNumber,
                        "l_callDirection": l_memberCallDirection,
                        "l_callStatus": l_memberStatus,
                        "l_callServerIP": l_memberServerIp,
                        "l_callUUID": l_memberuuid,
                        "m_memberName": m_memberName
                    }
                    emit_agent_status_update(socketio_client, l_memberExtention, l_memberStatus, payloadcalls, accID)
                    
                elif l_memberStatus == 'ONCALL':
                    updatelivecallstatus = """UPDATE p_liveCallStatus set l_memberExtention = %s, l_callStatus = %s 
                    where l_callUUID = %s"""
                    cursor.execute(updatelivecallstatus, (l_memberExtention, l_memberStatus, l_memberuuid))
                    
                    id = int(str(l_memberExtention)[:-4])
                    payloadupdate = {
                        "type": "CallUpdateData",
                        "l_callUUID": l_memberuuid,
                        "l_memberExtention": l_memberExtention,
                        "l_callStatus": l_memberStatus
                    }
                    log.info(f"📤 Freeswitch INCALL: {payloadupdate}")
                    emit_agent_status_update(socketio_client, l_memberExtention, l_memberStatus, payloadupdate, id)
                    
                elif l_memberStatus == "COMPLETED":
                    delete_query = """DELETE FROM p_liveCallStatus WHERE l_callUUID = %s"""
                    cursor.execute(delete_query, (l_memberuuid,))
                    
                    accID = payload.get('l_accountid')
                    payloadupdate = {
                        "type": "CallCompletedData",
                        "l_callUUID": l_memberuuid,
                        "l_callStatus": l_memberStatus
                    }
                    log.info(f"📤 Freeswitch complete: {payloadupdate}")
                    emit_agent_status_update(socketio_client, l_memberExtention, l_memberStatus, payloadupdate, accID)
                
                conn.commit()

            elif eventOriginate == 'Opensip':
                if should_process_status_change(l_memberExtention, l_memberStatus):
                    old_status = agent_status_map.get(l_memberExtention)
                    agent_status_map[l_memberExtention] = l_memberStatus
                    log.info(f"Agent status changed: {l_memberExtention} {old_status} -> {l_memberStatus}")
                    
                    if not l_memberExtention or not l_memberStatus:
                        return
                    
                    if l_memberStatus == 'AVAILABLE' or l_memberStatus == 'UNAVAILABLE':
                        cursor.execute("""SELECT m_readyStatus, m_readyStatusStartTime, m_status, m_statusTime, 
                        m_memberId, m_accountId, m_accountNo, m_memberExtensionNo FROM p_members 
                        WHERE m_memberExtensionNo = %s""", (l_memberExtention,))
                        old_member = cursor.fetchone()
                        
                        if old_member:
                            oldReadyStatus = old_member['m_readyStatus']
                            oldReadyStartTime = old_member['m_readyStatusStartTime']
                            oldstatusM = old_member['m_status']
                            oldstatusTimeM = old_member['m_statusTime']
                            oldm_memberId = old_member['m_memberId']
                            oldm_accountId = old_member['m_accountId']
                            oldm_accountNo = old_member['m_accountNo']
                            oldm_memberExtensionNo = old_member['m_memberExtensionNo']
                            
                            ist = pytz.timezone('Asia/Kolkata')
                            nowIst = datetime.now(ist)
                            
                            if ((l_memberStatus.strip().upper() == 'UNAVAILABLE' and 
                                 oldstatusM.strip().upper() not in ('BREAK', 'QUERY', 'LUNCH', 'MEETING')) or 
                                (l_memberStatus.strip().upper() == 'AVAILABLE')):
                                
                                if oldstatusTimeM is not None:
                                    if oldstatusTimeM.tzinfo is None:
                                        oldstatusTimeM = ist.localize(oldstatusTimeM)
                                    timeDiff = nowIst - oldstatusTimeM
                                    oldStatusDuration = max(0, int(timeDiff.total_seconds()))
                                    cursor.execute("""INSERT INTO p_agentstatus (a_memberId, a_accountId, a_accountNo, 
                                    a_memberExtensionNo, a_status, a_startTime, a_endTime, a_durationSeconds) 
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""", (oldm_memberId, oldm_accountId, 
                                    oldm_accountNo, oldm_memberExtensionNo, oldstatusM, oldstatusTimeM, nowIst, oldStatusDuration))
                                
                                log.info(f"📤 status data: {l_memberStatus}")
                                
                                if l_memberStatus == 'AVAILABLE':
                                    cursor.execute("""UPDATE p_members SET m_status = %s, m_statusTime = %s 
                                    WHERE m_memberExtensionNo = %s""", ('LOGIN', nowIst, l_memberExtention))
                                else:
                                    cursor.execute("""UPDATE p_members SET m_status = %s, m_statusTime = %s 
                                    WHERE m_memberExtensionNo = %s""", ('LOGOUT', nowIst, l_memberExtention))
                                
                                query = """UPDATE p_liveMonitoring SET l_memberStatus = %s WHERE l_memberExtention = %s"""
                                cursor.execute(query, (l_memberStatus, l_memberExtention))
                            else:
                                log.info(f"📤 status data: {l_memberStatus} old status {oldstatusM}")
                                return
                    else:
                        select_query = """SELECT l_memberAccountId, l_memberAccountNo, l_membermemberId, l_memberExtention, 
                        l_memberName, l_memberCampaignId, l_memberCampaignName, l_memberCustomerNumber, l_memberCliNumberId, 
                        l_memberCallDirection, l_memberuuid, l_memberStatus, l_memberServerIp
                        FROM p_liveMonitoring WHERE l_memberExtention = %s"""
                        cursor.execute(select_query, (l_memberExtention,))
                        row = cursor.fetchone()
                        
                        if row:
                            l_memberCustomerNumber = row['l_memberCustomerNumber']
                            l_memberCliNumberId = row['l_memberCliNumberId']
                        
                        query = """UPDATE p_liveMonitoring SET l_memberCallDirection = %s, l_memberuuid = %s, 
                        l_memberStatus = %s, l_memberServerIp = %s WHERE l_memberExtention = %s"""
                        cursor.execute(query, (l_memberCallDirection, l_memberuuid, l_memberStatus, 
                                              l_memberServerIp, l_memberExtention))
                    
                    conn.commit()
                    
                    payloaddata = {
                        "type": "AgentPresence",
                        "extension": l_memberExtention,
                        "status": l_memberStatus,
                        "memberCustomerNumber": l_memberCustomerNumber,
                        "memberCliNumberId": l_memberCliNumberId,
                        "memberCallDirection": l_memberCallDirection,
                        "memberServerIp": l_memberServerIp,
                        "nowIst": datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    if socketio_client and socketio_client.is_connected():
                        id = int(str(l_memberExtention)[:-4])
                        emit_agent_status_update(socketio_client, l_memberExtention, l_memberStatus, payloaddata, id)
                        
                        # first_seen = emitted_ids.get(id)
                        # if first_seen:
                        #     now = datetime.now(IST)
                        #     if now - first_seen > timedelta(minutes=1):
                        #         log.info(f"⏳ ID {id} exceeded 1 min (first seen {first_seen} IST)")
                        #         emitted_ids[id] = now
                        #         callStats, perAgentStats, liveCalls, totalLiveCalls = getCallData(id, cursor=cursor)
                        #         data = {
                        #             "type": "LivemonitoringData",
                        #             "call_stats": callStats,
                        #             "per_agent_stats": perAgentStats,
                        #             "live_calls": liveCalls,
                        #             "total_live_calls": totalLiveCalls
                        #         }
                        #         log.info(f"⏳ ID {id} exceeded 1 min (data {data} )")
                        #         emit_agent_status_update(socketio_client, l_memberExtention, l_memberStatus, data, id)
                    else:
                        log.warning("Socket.IO not connected, skipping emit")
                else:
                    log.debug(f"Status change debounced for agent {l_memberExtention}: {l_memberStatus}")
            else:
                return

        except Exception as e:
            log.error(f"Database update failed for extension {l_memberExtention}: {e}")
            conn.rollback()
            raise


def process_agent_ready_api(payload: dict, cursor, conn):
    """Process AgentReadyAPI message type"""
    global socketio_client
    
    try:
        log.info("Processing AgentReadyAPI event")
        
        nowIst_str = payload.get('nowIst')
        if not nowIst_str:
            log.warning("Missing nowIst field in AgentReadyAPI payload")
            return
            
        try:
            nowIst = datetime.strptime(nowIst_str, "%Y-%m-%d %H:%M:%S")
        except ValueError as e:
            log.error(f"Invalid datetime format in nowIst: {nowIst_str}, error: {e}")
            return
            
        m_memberId = payload.get('memberId')
        m_accountId = payload.get('accountId')
        m_accountNo = payload.get('accountNo')
        m_memberExtensionNo = payload.get('extension')
        status = payload.get('status')
        memberName = payload.get('memberName')
        memberRole = payload.get('memberRole')
        
        if not all([m_memberId, m_accountId, m_accountNo, m_memberExtensionNo, status]):
            return
        
        cursor.execute("""SELECT m_readyStatus, m_readyStatusStartTime FROM p_members 
        WHERE m_memberId = %s""", (m_memberId,))
        old_member = cursor.fetchone()

        oldReadyStatus = old_member['m_readyStatus'] if old_member else None
        oldReadyStartTime = old_member['m_readyStatusStartTime'] if old_member else None

        if oldReadyStatus and oldReadyStartTime:
            timeDiff = nowIst - oldReadyStartTime
            oldStatusDuration = max(0, int(timeDiff.total_seconds()))
            
            cursor.execute("""INSERT INTO p_agentstatus (a_memberId, a_accountId, a_accountNo, 
            a_memberExtensionNo, a_status, a_startTime, a_endTime, a_durationSeconds) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""", (m_memberId, m_accountId, m_accountNo, 
            m_memberExtensionNo, oldReadyStatus, oldReadyStartTime, nowIst, oldStatusDuration))

        cursor.execute("""INSERT INTO p_statelogs (s_accountId, s_accountNo, s_stateName, s_stateTime, 
        s_memberId, s_memberName, s_memberRole) VALUES (%s, %s, %s, %s, %s, %s, %s)""", 
        (m_accountId, m_accountNo, status, nowIst, m_memberId, memberName, memberRole))

        cursor.execute("""UPDATE p_members SET m_readyStatus = %s, m_readyStatusStartTime = %s 
        WHERE m_memberId = %s""", (status, nowIst, m_memberId))
        
        rows_affected = cursor.rowcount
        conn.commit()
        log.info(f"AgentReadyAPI processed successfully for member {m_memberId}, rows updated: {rows_affected}")

        if socketio_client and socketio_client.is_connected():
            id = int(str(m_memberExtensionNo)[:-4])
            emit_agent_status_update(socketio_client, str(m_memberExtensionNo), status, payload, id)
        else:
            log.warning("Socket.IO not connected, skipping emit")
            
    except Exception as e:
        log.error(f"Error processing AgentReadyAPI: {e}")
        conn.rollback()
        raise


def process_agent_break_api(payload: dict, cursor, conn):
    """Process AgentBreakAPI message type"""
    global socketio_client
    
    try:
        log.info("Processing AgentBreakAPI event")
        
        nowIst = payload.get('nowIst')
        oldstatusTime = payload.get('oldstatusTime')

        if isinstance(nowIst, str):
            try:
                nowIst = datetime.strptime(nowIst, "%Y-%m-%d %H:%M:%S")
            except ValueError as e:
                log.error(f"Invalid datetime format in nowIst: {nowIst}, error: {e}")
                return

        if isinstance(oldstatusTime, str):
            try:
                oldstatusTime = datetime.strptime(oldstatusTime, "%Y-%m-%d %H:%M:%S")
            except ValueError as e:
                log.error(f"Invalid datetime format in oldstatusTime: {oldstatusTime}, error: {e}")
                oldstatusTime = None

        m_memberId = payload.get('memberId')
        m_accountId = payload.get('accountId')
        m_accountNo = payload.get('accountNo')
        m_memberExtensionNo = payload.get('extension')
        status = payload.get('status')
        memberName = payload.get('memberName')
        memberRole = payload.get('memberRole')
        oldstatus = payload.get('oldstatus')

        if not all([m_memberId, m_accountId, m_accountNo, m_memberExtensionNo, status]):
            return

        if oldstatus and oldstatusTime:
            timeDiff = nowIst - oldstatusTime
            oldStatusDuration = max(0, int(timeDiff.total_seconds()))

            cursor.execute("""INSERT INTO p_agentstatus (a_memberId, a_accountId, a_accountNo, 
            a_memberExtensionNo, a_status, a_startTime, a_endTime, a_durationSeconds) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""", (m_memberId, m_accountId, m_accountNo, 
            m_memberExtensionNo, oldstatus, oldstatusTime, nowIst, oldStatusDuration))

        cursor.execute("""INSERT INTO p_statelogs (s_accountId, s_accountNo, s_stateName, s_stateTime, 
        s_memberId, s_memberName, s_memberRole) VALUES (%s, %s, %s, %s, %s, %s, %s)""", 
        (m_accountId, m_accountNo, status, nowIst, m_memberId, memberName, memberRole))

        rows_affected = cursor.rowcount
        conn.commit()
        log.info(f"AgentBreakAPI processed successfully for member {m_memberId}, rows updated: {rows_affected}")

        if socketio_client and socketio_client.is_connected():
            id = int(str(m_memberExtensionNo)[:-4])
            emit_agent_status_update(socketio_client, str(m_memberExtensionNo), status, payload, id)
        else:
            log.warning("Socket.IO not connected, skipping emit")
            
    except Exception as e:
        log.error(f"Error processing AgentBreakAPI: {e}")
        conn.rollback()
        raise


# DLT producer
def make_producer() -> Optional[Producer]:
    if not DLT_TOPIC:
        return None
    return Producer(_mk_common_conf())

_dlt_batch: List = []

def send_to_dlt(p: Producer, original) -> None:
    headers = original.headers() or []
    headers.append(("x-dlt-timestamp", str(int(time.time())).encode()))
    p.produce(
        topic=DLT_TOPIC,
        key=original.key(),
        value=original.value(),
        headers=headers,
    )
    _dlt_batch.append(original)
    if len(_dlt_batch) >= 10:
        p.flush(1)
        _dlt_batch.clear()
    log.warning(f"Message sent to DLT: {original.topic()}[{original.partition()}] offset={original.offset()}")


# Rebalance callbacks
def on_assign(consumer: Consumer, partitions):
    log.info(f"Assigned partitions: {partitions}")
    consumer.assign(partitions)

def on_revoke(consumer: Consumer, partitions):
    log.warning(f"Revoked partitions: {partitions}")
    try:
        consumer.commit(asynchronous=False)
    except Exception:
        log.exception("Commit on revoke failed")


# Worker to handle individual messages
def handle_message(msg, producer: Optional[Producer], counters: Dict[str, int]):
    attempt = 0
    while True:
        try:
            process_message(msg.value(), msg.key(), msg.headers())
            counters["processed"] += 1
            break
        except Exception as ex:
            attempt += 1
            if attempt > MAX_RETRIES:
                counters["failed"] += 1
                log.error(f"Message failed after {MAX_RETRIES} retries: {ex}")
                if producer and DLT_TOPIC:
                    send_to_dlt(producer, msg)
                    counters["dlt"] += 1
                break
            backoff = min(BACKOFF_MAX_SEC, BASE_BACKOFF_SEC * (2 ** (attempt - 1)))
            log.warning(f"Retry {attempt}/{MAX_RETRIES} after {backoff:.2f}s. Error: {ex}")
            time.sleep(backoff)


# Health check and stats
def log_stats(counters: Dict[str, int], start_time: float):
    """Log processing statistics"""
    runtime = time.time() - start_time
    total_processed = counters["processed"]
    rate = total_processed / runtime if runtime > 0 else 0
    
    log.info(f"Stats: processed={total_processed}, failed={counters['failed']}, "
             f"dlt={counters['dlt']}, rate={rate:.2f}/sec, runtime={runtime:.1f}s, "
             f"active_agents={len(agent_status_map)}")


# Main loop
def main():
    global db_pool, agent_status_map, socketio_client
    
    start_time = time.time()
    
    try:
        log.info("Initializing database pool...")
        db_pool = init_db_pool()
        
        test_conn = get_db_connection()
        test_conn.close()
        log.info("Database connection verified")
        
        log.info("Setting up Socket.IO client...")
        socketio_client = initialize_socketio()
        if not socketio_client:
            log.error("Failed to setup Socket.IO client, continuing without real-time updates")
        
        consumer = Consumer(_mk_common_conf())
        producer = make_producer()
        consumer.subscribe([TOPIC], on_assign=on_assign, on_revoke=on_revoke)

        processed_since_commit = 0
        last_commit_ts = time.time()
        last_stats_ts = time.time()
        counters = {"processed": 0, "failed": 0, "dlt": 0}

        executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        
        socketio_monitor_executor = ThreadPoolExecutor(max_workers=1)
        socketio_monitor_executor.submit(socketio_client.monitor_connection)

        # NEW: Start agent timeout monitor thread
        timeout_monitor_executor = ThreadPoolExecutor(max_workers=1)
        timeout_monitor_executor.submit(monitor_agent_status_timeouts)
        
        log.info(f"Consumer started. topic={TOPIC}, group_id={GROUP_ID}, brokers={BROKERS}")
        log.info(f"Socket.IO enabled: {socketio_client is not None}")
        log.info(f"Status debounce window: {STATUS_DEBOUNCE_WINDOW}s")

        try:
            while not _shutdown:
                msg = consumer.poll(POLL_TIMEOUT_SEC)
                if msg is None:
                    now = time.time()
                    
                    if processed_since_commit and (now - last_commit_ts) >= COMMIT_EVERY_SEC:
                        try:
                            consumer.commit(asynchronous=True)
                            log.debug("Committed offsets (time-based)")
                            processed_since_commit = 0
                            last_commit_ts = now
                        except KafkaException as e:
                            log.error(f"Commit failed: {e}")
                    
                    if now - last_stats_ts >= 60:
                        log_stats(counters, start_time)
                        last_stats_ts = now
                        
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    else:
                        log.error(f"Consumer error: {msg.error()}")
                        continue

                executor.submit(handle_message, msg, producer, counters)
                processed_since_commit += 1

                if processed_since_commit >= COMMIT_EVERY_N:
                    try:
                        consumer.commit(asynchronous=True)
                        last_commit_ts = time.time()
                        processed_since_commit = 0
                        log.debug("Committed offsets (count-based)")
                    except KafkaException as e:
                        log.error(f"Commit failed: {e}")

        except KeyboardInterrupt:
            log.warning("KeyboardInterrupt — shutting down")
        finally:
            log.info("Starting cleanup...")
            
            try:
                consumer.commit(asynchronous=False)
            except Exception:
                pass
            consumer.close()
            
            executor.shutdown(wait=True)
            socketio_monitor_executor.shutdown(wait=True)
            timeout_monitor_executor.shutdown(wait=True)
            
            if socketio_client:
                try:
                    socketio_client.disconnect()
                    log.info("Socket.IO client disconnected")
                except Exception:
                    pass
                    
            if producer:
                try:
                    if _dlt_batch:
                        producer.flush(5)
                except Exception:
                    pass
                    
            log_stats(counters, start_time)
            log.info("Consumer shutdown complete")
            
    except Exception as e:
        log.error(f"Critical error in main: {e}")
        raise


if __name__ == "__main__":
    main()
