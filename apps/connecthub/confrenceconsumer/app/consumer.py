#!/usr/bin/env python3
"""
Kafka Consumer for FreeSWITCH ESL Events
with auto token refresh, event throttling, and robust Socket.IO integration.

Required packages:
    pip install kafka-python python-socketio[client] websocket-client requests
"""

import os
import json
import logging
import time
import threading
import queue
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, Any, Tuple
import ssl
import signal
import sys
from urllib.parse import quote
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable, KafkaError
from decimal import Decimal
from zoneinfo import ZoneInfo
import requests
from http.cookies import SimpleCookie
import socketio
import mysql.connector
from mysql.connector import pooling, Error as MySQLError
from datetime import datetime, timezone, timedelta
from xmlrpc.client import ServerProxy, Error, Transport
from config import settings

# ----------------------------
# Configuration
# ----------------------------
@dataclass
class Config:
    """Application configuration."""
    # Kafka
    kafka_broker: str = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
    kafka_topic: str = os.getenv("KAFKA_TOPIC", "eslconferenceEvent")
    kafka_group_id: str = os.getenv("KAFKA_GROUP_ID", "esl-consumer")
    kafka_max_poll_records: int = int(os.getenv("KAFKA_MAX_POLL_RECORDS", "10"))
    
    # Socket.IO
    socketio_url: str = os.getenv("SOCKETIO_URL", "https://connecthub.pulsework360.com")
    socketio_path: str = os.getenv("SOCKETIO_PATH", "/socketagent")
    socketio_namespace: str = os.getenv("SOCKETIO_NAMESPACE", "/socketagent/agentevent")
    
    # Auth
    login_url: str = os.getenv("LOGIN_URL", "https://connecthub.pulsework360.com/auth/login")
    account_code: str = os.getenv("ACCOUNT_CODE", "PUTPL")
    member_name: str = os.getenv("MEMBER_NAME", "ssadmin")
    member_password: str = os.getenv("MEMBER_PASSWORD", "Pulse@123")
    
    # SSL
    disable_ssl_verify: bool = os.getenv("DISABLE_SSL_VERIFY", "True").lower() in ("true", "1", "yes")
    
    # Intervals and limits
    token_refresh_interval: int = int(os.getenv("TOKEN_REFRESH_INTERVAL", "3600"))
    event_throttle_delay: float = float(os.getenv("EVENT_THROTTLE_DELAY", "0.05"))
    queue_max_size: int = int(os.getenv("QUEUE_MAX_SIZE", "1000"))
    heartbeat_interval: int = int(os.getenv("HEARTBEAT_INTERVAL", "30"))
    stats_report_interval: int = int(os.getenv("STATS_REPORT_INTERVAL", "300"))
    max_consecutive_errors: int = int(os.getenv("MAX_CONSECUTIVE_ERRORS", "10"))
    
    # MySQL
    mysql_pool_size: int = int(os.getenv("MYSQL_POOL_SIZE", "5"))
    
    # Timezone
    timezone: ZoneInfo = ZoneInfo("Asia/Kolkata")

class TimeoutTransport(Transport):
    def __init__(self, timeout=5, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.timeout = timeout
    
    def make_connection(self, host):
        conn = super().make_connection(host)
        conn.timeout = self.timeout
        return conn
    
config = Config()

# ----------------------------
# Logging Setup
# ----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Suppress SSL warnings if disabled
if config.disable_ssl_verify:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ----------------------------
# Event Types
# ----------------------------
class EventAction(Enum):
    """Conference event actions."""
    ADD_MEMBER = "add-member"
    DEL_MEMBER = "del-member"
    START_TALKING = "start-talking"
    STOP_TALKING = "stop-talking"

# ----------------------------
# MySQL Connection Pool
# ----------------------------
class DatabaseManager:
    """Manages MySQL connection pool and operations."""
    
    def __init__(self):
        self.pool: Optional[pooling.MySQLConnectionPool] = None
        self._lock = threading.Lock()
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize MySQL connection pool."""
        try:
            mysql_config = {
                "host": settings.MYSQL_HOST,
                "user": settings.MYSQL_USERNAME,
                "password": settings.MYSQL_PASSWORD,
                "database": "onedb",
                "autocommit": False,
            }
            logger.info(f"✅ DATA: {mysql_config}")
            self.pool = pooling.MySQLConnectionPool(
                pool_name="esl_consumer_pool",
                pool_size=config.mysql_pool_size,
                pool_reset_session=True,
                **mysql_config
            )
            logger.info("✅ MySQL connection pool created (size=%d)", config.mysql_pool_size)
        except Exception as e:
            logger.error(f"❌ Failed to create MySQL pool: {e}")
            self.pool = None
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        conn = None
        try:
            conn = self.pool.get_connection()
            yield conn
        except MySQLError as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn and conn.is_connected():
                conn.close()
    
    def insert_conference_event(self, conference_id: str, conf_name: str, caller_number: str, action: str, confduration: float = 0,confstarttime: Optional[datetime] = None,confendtime: Optional[datetime] = None,confhours: float = 0.0) -> bool:
        """Insert conference event into database."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                select_query = """SELECT m_accountId, m_accountNo FROM p_members WHERE m_memberExtensionNo = %s LIMIT 1"""
                cursor.execute(select_query, (conf_name,))
                member_row = cursor.fetchone()
                accountid = member_row[0] if member_row else None
                accountno = member_row[1] if member_row else None
                insert_query = """
                    INSERT INTO p_conferences 
                    (p_conferenceUniqueId, p_confName, p_customerNumber, p_action, p_accountId, p_accountNo, p_confDuration, p_confStartTime, p_confEndTime, p_confHours, p_createdAt)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """
                cursor.execute(insert_query, (conference_id, conf_name, caller_number, action, accountid, accountno, confduration, confstarttime, confendtime, confhours))
                conn.commit()
                cursor.close()
                logger.info(f"✅ Inserted {action} event for conference={conf_name}")
                return True
        except Exception as e:
            logger.error(f"❌ MySQL insert failed: {e}")
            return False

db_manager = DatabaseManager()

# ----------------------------
# JSON helper
# ----------------------------
def convert_json_safe(obj: Any) -> Any:
    """Convert objects to JSON-serializable format."""
    if isinstance(obj, dict):
        return {k: convert_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_json_safe(i) for i in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    elif isinstance(obj, Enum):
        return obj.value
    return obj

def safe_json_loads(data: str) -> Optional[Dict[str, Any]]:
    """Safely parse JSON data with nested string handling."""
    try:
        obj = json.loads(data)
        # Handle double-encoded JSON strings
        if isinstance(obj, str):
            obj = json.loads(obj)
        return obj
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to decode JSON: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error parsing JSON: {e}")
        return None

# ----------------------------
# SocketManager
# ----------------------------
class SocketManager:
    """Manages Socket.IO connection with auto-reconnect and heartbeat."""
    
    def __init__(self):
        self.url = config.socketio_url
        self.namespace = config.socketio_namespace
        self.path = config.socketio_path
        
        self._sio = socketio.Client(
            logger=False,
            engineio_logger=False,
            reconnection=True,
            reconnection_attempts=5,
            reconnection_delay=1,
            reconnection_delay_max=5,
        )
        
        # SSL configuration
        self._sio.eio.ssl_verify = not config.disable_ssl_verify
        if config.disable_ssl_verify:
            self._sio.eio.ssl_context = ssl._create_unverified_context()
        
        self._connected = False
        self._access_token: Optional[str] = None
        self._lock = threading.Lock()
        self._shutdown = threading.Event()
        
        # Statistics
        self._stats = {
            "emit_count": 0,
            "emit_errors": 0,
            "last_emit_time": None,
            "reconnect_count": 0
        }
        
        # Register namespace handler
        self._sio.register_namespace(self._create_namespace_handler())
        
        # Start heartbeat thread
        self._heartbeat_thread = threading.Thread(target=self._heartbeat, daemon=True)
        self._heartbeat_thread.start()
    
    def _create_namespace_handler(self):
        """Create namespace handler instance."""
        manager = self
        
        class AgentEventNamespace(socketio.ClientNamespace):
            def on_connect(self):
                manager._connected = True
                manager._stats["reconnect_count"] += 1
                logger.info("🔌 Connected to %s", self.namespace)
            
            def on_disconnect(self):
                manager._connected = False
                logger.warning("❎ Disconnected from %s", self.namespace)
            
            def on_connect_error(self, data):
                logger.error("❌ Connection error to %s: %s", self.namespace, data)
            
            def on_response(self, data):
                logger.debug("📩 Server response: %s", data)
        
        return AgentEventNamespace(self.namespace)
    
    def set_token(self, token: str):
        """Update the access token."""
        with self._lock:
            self._access_token = token
            logger.debug("🔑 Token updated")
    
    def connect(self):
        """Connect to Socket.IO server with current token."""
        with self._lock:
            if self._connected:
                logger.info("⚡ Socket already connected.")
                return
            
            if not self._access_token:
                raise ValueError("Access token not set before connecting")
            
            headers = {"Cookie": f"accessToken={self._access_token}"}
            max_retries = 5
            
            for retry in range(max_retries):
                if self._shutdown.is_set():
                    logger.info("Shutdown requested, aborting connection")
                    return
                
                try:
                    logger.info("🔄 Connecting to Socket.IO server (attempt %d/%d)...", 
                              retry + 1, max_retries)
                    self._sio.connect(
                        self.url,
                        headers=headers,
                        socketio_path=self.path,
                        namespaces=[self.namespace],
                        transports=["websocket"],
                    )
                    logger.info("✅ Socket connected successfully")
                    return
                except Exception as e:
                    logger.error("❌ Connection attempt %d failed: %s", retry + 1, e)
                    if retry < max_retries - 1:
                        time.sleep(min(2 ** retry, 10))
            
            raise ConnectionError("Failed to connect to Socket.IO after multiple attempts")
    
    def emit(self, event_name: str, payload: Dict[str, Any]):
        """Emit event to Socket.IO server."""
        if not self._connected:
            logger.warning("⚠ Socket not connected, attempting reconnect...")
            try:
                self.connect()
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"Failed to reconnect: {e}")
                self._stats["emit_errors"] += 1
                raise
        
        try:
            payload = convert_json_safe(payload)
            logger.info("📤 Emitting %s: %s", event_name, payload)
            self._sio.emit(event_name, payload, namespace=self.namespace)
            self._stats["emit_count"] += 1
            self._stats["last_emit_time"] = datetime.now(config.timezone)
        except Exception as e:
            self._stats["emit_errors"] += 1
            logger.error(f"❌ Emit failed: {e}")
            raise
    
    def disconnect(self):
        """Gracefully disconnect from Socket.IO server."""
        with self._lock:
            self._shutdown.set()
            if self._connected:
                try:
                    self._sio.disconnect()
                    self._connected = False
                    logger.info("🔌 Socket disconnected gracefully.")
                except Exception as e:
                    logger.error(f"Error during disconnect: {e}")
    
    def _heartbeat(self):
        """Send periodic heartbeat to keep connection alive."""
        while not self._shutdown.is_set():
            time.sleep(config.heartbeat_interval)
            if self._connected:
                try:
                    self._sio.emit("ping", {"timestamp": time.time()}, namespace=self.namespace)
                    logger.debug("💓 Heartbeat sent")
                except Exception as e:
                    logger.warning("❌ Heartbeat failed: %s", e)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics."""
        stats = self._stats.copy()
        stats["connected"] = self._connected
        if stats["last_emit_time"]:
            stats["last_emit_time"] = stats["last_emit_time"].isoformat()
        return stats

# ----------------------------
# Authentication
# ----------------------------
class AuthManager:
    """Manages authentication and token refresh."""
    
    def __init__(self):
        self._session = requests.Session()
        self._lock = threading.Lock()
    
    def get_access_token(self) -> str:
        """Authenticate and retrieve access token."""
        with self._lock:
            payload = {
                "accountcode": config.account_code,
                "membername": config.member_name,
                "memberpassword": config.member_password
            }
            headers = {"Content-Type": "application/json"}
            
            try:
                logger.info(f"Attempting login to {config.login_url}")
                response = self._session.post(
                    config.login_url,
                    headers=headers,
                    data=json.dumps(payload),
                    verify=not config.disable_ssl_verify,
                    timeout=15
                )
                
                if response.status_code != 200:
                    logger.error(f"Login failed with status {response.status_code}: {response.text}")
                    response.raise_for_status()

                # 1. Try to get from JSON body (common in some endpoints)
                try:
                    res_j = response.json()
                    # Check common keys: 'token', 'accessToken', or nested in 'data'
                    token = res_j.get('token') or res_j.get('accessToken')
                    if not token and isinstance(res_j.get('data'), dict):
                        token = res_j.get('data').get('token') or res_j.get('data').get('accessToken')
                    
                    if token:
                        logger.info("🔑 Access token obtained from JSON body")
                        return token
                except Exception:
                    pass

                # 2. Try to get from cookies (standard for some endpoints)
                logger.info(f"Cookies received: {list(response.cookies.keys())}")
                token = response.cookies.get('accessToken')
                if token:
                    logger.info("🔑 Access token obtained from response.cookies")
                    return token

                # 3. Fallback to manual Set-Cookie header parsing (more robust regex)
                set_cookie_header = response.headers.get('Set-Cookie') or response.headers.get('set-cookie')
                if set_cookie_header:
                    import re
                    # Look for accessToken= followed by anything up to a semicolon or end of string
                    # We avoid splitting by comma because JWTs can sometimes look like they have commas if mangled, 
                    # but more importantly, Expires attributes have commas.
                    match = re.search(r'accessToken=([^;]+)', set_cookie_header)
                    if match:
                        token = match.group(1).strip()
                        # If there's a comma in the match (due to header joining), take only the first part 
                        # UNLESS it's part of the JWT. JWTs are base64 and don't have commas.
                        if ',' in token:
                            # Split by comma and find the one that starts with 'eyJ' (JWT header)
                            parts = token.split(',')
                            for p in parts:
                                p = p.strip()
                                if p.startswith('eyJ'):
                                    token = p
                                    break
                            else:
                                token = parts[0].strip()
                        
                        logger.info("🔑 Access token obtained from manual regex header search")
                        return token
                
                # If we reach here, we failed to find the token
                logger.error(f"Response headers: {dict(response.headers)}")
                logger.error(f"Response body: {response.text[:200]}")
                raise ValueError("Access token not found in response (checked JSON body and cookies)")
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Authentication request failed: {e}")
                raise
            except Exception as e:
                logger.error(f"Failed to extract access token: {e}")
                raise

auth_manager = AuthManager()

# ----------------------------
# Kafka Consumer
# ----------------------------
def create_consumer(max_retries: int = 10, base_delay: int = 5) -> KafkaConsumer:
    """Create Kafka consumer with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            consumer = KafkaConsumer(
                config.kafka_topic,
                bootstrap_servers=[config.kafka_broker],
                auto_offset_reset="latest",
                enable_auto_commit=True,
                group_id=config.kafka_group_id,
                max_poll_records=config.kafka_max_poll_records,
                session_timeout_ms=30000,
                heartbeat_interval_ms=10000,
                value_deserializer=lambda m: m.decode('utf-8') if m else None,
            )
            logger.info(f"✅ Connected to Kafka broker: {config.kafka_broker}")
            logger.info(f"📊 Subscribed to topic: {config.kafka_topic} with group: {config.kafka_group_id}")
            return consumer
        except NoBrokersAvailable:
            delay = min(base_delay * (2 ** attempt), 60)
            logger.warning(f"Kafka broker not available (attempt {attempt + 1}/{max_retries}). "
                         f"Retrying in {delay}s...")
            time.sleep(delay)
        except Exception as e:
            logger.error(f"Error creating consumer: {e}")
            time.sleep(base_delay)
    
    raise Exception(f"❌ Failed to connect to Kafka after {max_retries} attempts")

# ----------------------------
# Event Validation
# ----------------------------
def validate_event(eventdata: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate event has required fields.
    Returns (is_valid, error_message).
    """
    required_fields = ["Action", "Member-ID", "Conference-Name", "Caller-Caller-ID-Number"]
    missing = [f for f in required_fields if f not in eventdata]
    
    if missing:
        return False, f"Missing required fields: {missing}"
    
    # Validate action
    action = eventdata.get("Action")
    valid_actions = [e.value for e in EventAction]
    if action not in valid_actions:
        return False, f"Invalid action: {action}"
    
    return True, None

# ----------------------------
# Event Processor
# ----------------------------
class EventProcessor:
    """Processes conference events."""
    def __init__(self, socket_manager: SocketManager, event_queue: queue.Queue):
        self.socket_manager = socket_manager
        self.event_queue = event_queue
        self._stats = {
            "processed": 0,
            "errors": 0,
            "db_errors": 0,
            "queue_full_errors": 0
        }
        self.conference_members = {}
        
    
    def process_event(self, eventdata: Dict[str, Any]) -> bool:
        """Process a single event."""
        try:
            # Validate event
            logger.info(eventdata)
            is_valid, error_msg = validate_event(eventdata)
            if not is_valid:
                logger.warning(f"Invalid event: {error_msg}")
                self._stats["errors"] += 1
                return False
            action = eventdata["Action"]
            member_id = eventdata["Member-ID"]
            confnameaccounnum = eventdata["Conference-Name"]
            caller_number_full = eventdata["Caller-Caller-ID-Number"]
            caller_number = caller_number_full[-10:]
            conference_id = eventdata.get("Conference-Unique-ID", "")
            
            if confnameaccounnum:
                parts = confnameaccounnum.split("-", 1)
                if len(parts) == 2:
                    conf_name, accountid = parts
                else:
                    conf_name = confnameaccounnum
                    accountid = "default"
            else:
                conf_name = "default"
                accountid = "default"
            
            logger.info(f"📨 Processing event: Action={action} MemberID={member_id} Conference={conf_name}")
            unique_key = f"{conf_name}_{caller_number}"
            logger.info(f"📨 Processing event: Confrence Generated uniqueid={conference_id} ")
            logger.info(f"📨 Processing event: Confrence members current={self.conference_members} ")
            if conference_id not in self.conference_members:
                self.conference_members[conference_id] = {}
                logger.info(f"🔊 Member started talking: {caller_number} in {conf_name}")
                FREESWITCH_HOST = eventdata["FreeSWITCH-IPv4"]
                FREESWITCH_USERNAME = quote('admin', safe='')
                FREESWITCH_PASSWORD = quote('#Pulse#$2024', safe='')
                FREESWITCH_PORT = '8080'
                transport = TimeoutTransport(timeout=5)
                server = ServerProxy(
                    f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{FREESWITCH_HOST}:{FREESWITCH_PORT}/RPC2",
                    transport=transport)
                result = server.freeswitch.api("conference", f"{confnameaccounnum} recording /var/www/html/recordings/{conference_id}.mp3")
                logger.info(f"conference {confnameaccounnum} recording /var/www/html/recordings/{conference_id}.mp3")
            # Process del-member action
            if action == EventAction.DEL_MEMBER.value:
                # Insert into database
                IST = timezone(timedelta(hours=5, minutes=30))
                lefttime = datetime.now(IST)
                joininfo = self.conference_members.get(conference_id, {}).get(unique_key)
                durationseconds = 0
                if joininfo and "joined_at" in joininfo:
                    joinedat = joininfo["joined_at"]
                    logger.info(f"📨 left date={joinedat} ")
                    durationseconds = (lefttime - joinedat).total_seconds()
                    logger.info(
                    f"👋 Member left: {caller_number} from {conf_name} "
                    f"| Joined at: {joinedat.isoformat()} | Left at: {lefttime.isoformat()} | Duration: {durationseconds:.2f}s"
                    )
                    durationhours = str(timedelta(seconds=int(durationseconds)))
                if caller_number == conf_name:
                    logger.info("Admin user left the conference, clearing all members.")
                    FREESWITCH_HOST = eventdata["FreeSWITCH-IPv4"]
                    FREESWITCH_USERNAME = quote('admin', safe='')
                    FREESWITCH_PASSWORD = quote('#Pulse#$2024', safe='')
                    FREESWITCH_PORT = '8080'
                    local_file_path = f"/var/www/html/recordings/{conference_id}.mp3"
                    s3_bucket = "connecthub3m"
                    aws_path = "/usr/bin/aws"
                    s3_key = f"{conference_id}.mp3"
                    aws_command = (
                        f'ionice -c2 -n7 {aws_path} s3 mv "{local_file_path}" '
                        f'"s3://{s3_bucket}/{accountid}/{s3_key}" '
                        f'--region ap-south-1 --only-show-errors --profile default 2>&1'
                    )
                    transport = TimeoutTransport(timeout=5)
                    server = ServerProxy(
                        f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{FREESWITCH_HOST}:{FREESWITCH_PORT}/RPC2",
                        transport=transport)
                    result = server.freeswitch.api("bg_system", aws_command)
                    logger.error(f"Move Com: {aws_command}", exc_info=True)
                if conference_id:
                    success = db_manager.insert_conference_event(conference_id,conf_name,caller_number,action,durationseconds,joinedat,lefttime,durationhours)
                    if not success:
                        self._stats["db_errors"] += 1
                
                # Queue for Socket.IO emission
                payload = {
                    "type": "confrencehangup",
                    "MemberID": member_id,
                    "CallerCallerIDNumber": caller_number
                }

                try:
                    self.event_queue.put(
                        ("message", {"extention": conf_name, "data": payload}),
                        timeout=5
                    )
                    self._stats["processed"] += 1
                    return True
                except queue.Full:
                    logger.error("⚠ Event queue full, dropping event")
                    self._stats["queue_full_errors"] += 1
                    return False
            elif EventAction.ADD_MEMBER.value:
                IST = timezone(timedelta(hours=5, minutes=30))
                jointime = datetime.now(IST)
                if unique_key not in self.conference_members[conference_id]:
                    self.conference_members[conference_id][unique_key] = {
                    "joined_at": jointime,
                    "caller_number": caller_number,
                    "conference": conf_name
                    }

            else:
                # Handle other event types if needed
                logger.debug(f"Ignoring action: {action}")
                return True
                
        except Exception as e:
            logger.error(f"Error processing event: {e}", exc_info=True)
            self._stats["errors"] += 1
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return self._stats.copy()

# ----------------------------
# Background Workers
# ----------------------------
def refresh_token_worker(socket_manager: SocketManager, shutdown_event: threading.Event):
    """Periodically refresh authentication token."""
    while not shutdown_event.is_set():
        time.sleep(config.token_refresh_interval)
        if shutdown_event.is_set():
            break
        try:
            logger.info("🔄 Refreshing access token...")
            new_token = auth_manager.get_access_token()
            socket_manager.set_token(new_token)
            logger.info("✅ Access token refreshed successfully")
        except Exception as e:
            logger.error(f"⚠ Token refresh failed: {e}")

def emit_worker(socket_manager: SocketManager, event_queue: queue.Queue, shutdown_event: threading.Event):
    """Process and emit events from queue with throttling."""
    consecutive_errors = 0
    
    while not shutdown_event.is_set():
        try:
            event_name, payload = event_queue.get(timeout=1)
        except queue.Empty:
            continue
        
        try:
            socket_manager.emit(event_name, payload)
            consecutive_errors = 0
        except Exception as e:
            consecutive_errors += 1
            logger.warning(f"Failed to emit event (error #{consecutive_errors}): {e}")
            
            if consecutive_errors >= config.max_consecutive_errors:
                logger.error(f"Too many consecutive errors ({consecutive_errors}), pausing for 30s")
                time.sleep(30)
                consecutive_errors = 0
        finally:
            event_queue.task_done()
            time.sleep(config.event_throttle_delay)

def stats_reporter(socket_manager: SocketManager, event_processor: EventProcessor, 
                  shutdown_event: threading.Event):
    """Periodically log statistics."""
    while not shutdown_event.is_set():
        time.sleep(config.stats_report_interval)
        if shutdown_event.is_set():
            break
        
        socket_stats = socket_manager.get_stats()
        processor_stats = event_processor.get_stats()
        
        logger.info("=" * 60)
        logger.info("📊 Statistics Report")
        logger.info(f"Socket.IO: {socket_stats}")
        logger.info(f"Event Processor: {processor_stats}")
        logger.info("=" * 60)

# ----------------------------
# Main Application
# ----------------------------
class KafkaConsumerApp:
    """Main application class."""
    
    def __init__(self):
        self.shutdown_event = threading.Event()
        self.consumer: Optional[KafkaConsumer] = None
        self.socket_manager: Optional[SocketManager] = None
        self.event_processor: Optional[EventProcessor] = None
        self.threads = []
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_event.set()
    
    def _setup(self):
        """Setup all components."""
        logger.info("=" * 60)
        logger.info("Starting Kafka Consumer")
        logger.info(f"Kafka Broker: {config.kafka_broker}")
        logger.info(f"Kafka Topic: {config.kafka_topic}")
        logger.info(f"Socket.IO URL: {config.socketio_url}")
        logger.info("=" * 60)
        
        # Authenticate and setup Socket.IO
        logger.info("🔐 Authenticating...")
        access_token = auth_manager.get_access_token()
        
        self.socket_manager = SocketManager()
        self.socket_manager.set_token(access_token)
        self.socket_manager.connect()
        
        # Create event queue
        event_queue = queue.Queue(maxsize=config.queue_max_size)
        
        # Create event processor
        self.event_processor = EventProcessor(self.socket_manager, event_queue)
        
        # Start background workers
        self.threads = [
            threading.Thread(
                target=refresh_token_worker,
                args=(self.socket_manager, self.shutdown_event),
                daemon=True,
                name="TokenRefreshWorker"
            ),
            threading.Thread(
                target=emit_worker,
                args=(self.socket_manager, event_queue, self.shutdown_event),
                daemon=True,
                name="EmitWorker"
            ),
            threading.Thread(
                target=stats_reporter,
                args=(self.socket_manager, self.event_processor, self.shutdown_event),
                daemon=True,
                name="StatsReporter"
            )
        ]
        
        for thread in self.threads:
            thread.start()
            logger.info(f"Started thread: {thread.name}")
        
        # Create Kafka consumer
        self.consumer = create_consumer()
        logger.info("✅ Setup complete, ready to consume messages")
    
    def _consume_messages(self):
        """Main message consumption loop."""
        logger.info("🔄 Starting message consumption loop...")
        
        while not self.shutdown_event.is_set():
            try:
                message_batch = self.consumer.poll(timeout_ms=1000, max_records=config.kafka_max_poll_records)
                
                if not message_batch:
                    continue
                
                for topic_partition, messages in message_batch.items():
                    for message in messages:
                        if self.shutdown_event.is_set():
                            logger.info("Shutdown detected, breaking consumption loop")
                            return
                        
                        if message.value is None:
                            continue
                        
                        # Parse event data
                        eventdata = safe_json_loads(message.value)
                        if not eventdata:
                            continue
                        
                        # Process event
                        self.event_processor.process_event(eventdata)
                    
                    if self.shutdown_event.is_set():
                        break
                        
            except KafkaError as e:
                logger.error(f"Kafka error: {e}")
                time.sleep(1)
            except Exception as e:
                logger.error(f"Error in consumption loop: {e}", exc_info=True)
                time.sleep(1)
    
    def _cleanup(self):
        """Cleanup resources."""
        logger.info("Shutting down...")
        self.shutdown_event.set()
        
        if self.consumer:
            logger.info("Closing Kafka consumer...")
            try:
                self.consumer.close()
            except Exception as e:
                logger.error(f"Error closing consumer: {e}")
        
        if self.socket_manager:
            logger.info("Disconnecting Socket.IO...")
            try:
                self.socket_manager.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting socket: {e}")
        
        # Wait for threads to finish (with timeout)
        for thread in self.threads:
            thread.join(timeout=5)
        
        # Log final stats
        if self.socket_manager and self.event_processor:
            logger.info("=" * 60)
            logger.info("Final Statistics")
            logger.info(f"Socket.IO: {self.socket_manager.get_stats()}")
            logger.info(f"Event Processor: {self.event_processor.get_stats()}")
            logger.info("=" * 60)
        
        logger.info("✅ Kafka consumer stopped gracefully")
    
    def run(self):
        """Run the application."""
        try:
            self._setup()
            self._consume_messages()
        except KeyboardInterrupt:
            logger.info("⚠ Keyboard interrupt received")
        except Exception as e:
            logger.error(f"❌ Fatal error: {e}", exc_info=True)
        finally:
            self._cleanup()

# ----------------------------
# Entry Point
# ----------------------------
def main():
    """Application entry point."""
    app = KafkaConsumerApp()
    app.run()

if __name__ == "__main__":
    main()
