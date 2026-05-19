#!/usr/bin/env python3
"""
Kafka Consumer for FreeSWITCH ESL Events
with auto token refresh, event throttling, and robust Socket.IO integration.

Required packages:
    pip install kafka-python python-socketio[client] websocket-client requests.
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
import pymongo
import urllib.parse
import re
import smtplib


from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pymongo import MongoClient, DESCENDING
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable, KafkaError
from decimal import Decimal
from zoneinfo import ZoneInfo
import requests
from http.cookies import SimpleCookie
import socketio
import mysql.connector
from utils.sha256_hashing import alphanumericUniqueId
from mysql.connector import pooling, Error as MySQLError
from datetime import datetime, timezone, timedelta

from config import settings

# ----------------------------
# Configuration
# ----------------------------
@dataclass
class Config:
    """Application configuration."""
    # Kafka
    kafka_broker: str = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
    kafka_topic: str = os.getenv("KAFKA_TOPIC", "smsdlrlive")
    kafka_group_id: str = os.getenv("KAFKA_GROUP_ID", "sms-consumerlive")
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
    mail_password: str = settings.MAIL_PASSWORD
    mail_userName: str = settings.MAIL_USER_NAME
    mail_smtp_server: str = settings.MAIL_SMTP_SERVER
    mail_port: int = settings.MAIL_PORT
    
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

config = Config()

# -----------------------------
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
    """Manages MySQL connection pool and operations.."""
    
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
                "connect_timeout": 10,
                "use_pure": True,
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
        
        
    def getAccountID(self, dst_number: str) -> bool:
        """Insert conference event into database."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                last_10_digits = dst_number[-10:]
                select_query = """
                    SELECT 
                        c_accountNo,c_accountId,c_clinumberId
                        from p_clinumbers  
                    WHERE c_clinumberName = %s or c_clinumberName = %s
                    LIMIT 1
                """
                cursor.execute(select_query, (dst_number,last_10_digits))
                member_row = cursor.fetchone()
                return member_row
        except Exception as e:
            logger.error(f"❌ MySQL insert failed: {e}")
            return False



    def newInboundAssign(self, accountId: str, accountNo: str, clinumberId: str) -> dict | None:
        try:
            with self.get_connection() as conn:
                with conn.cursor(dictionary=True, buffered=True) as cursor:

                    # 1️⃣ Fetch SMS flow JSON
                    query_1 = """
                        SELECT s_smsFlowJson
                        FROM p_smsFlow
                        WHERE s_accountId = %s
                        AND s_accountNo = %s
                        AND s_smsclinumberId = %s
                    """
                    # print(f"Query 1: {query_1}")
                    # print(f"Params 1: {(accountId, accountNo, clinumberId)}")
                    cursor.execute(query_1, (accountId, accountNo, clinumberId))

                    row = cursor.fetchone()
                    if not row or not row["s_smsFlowJson"]:
                        print("Query 1 result: No row or empty s_smsFlowJson")
                        return None

                    # 2️⃣ Parse JSON & extract extensions
                    flow_data = json.loads(row["s_smsFlowJson"])
                    
                    # Handle if flow_data is a dict with 'smsmembers' key
                    if isinstance(flow_data, dict) and "smsmembers" in flow_data:
                        items_to_check = flow_data["smsmembers"]
                    elif isinstance(flow_data, list):
                        items_to_check = flow_data
                    else:
                        items_to_check = []

                    member_extensions = [
                        item["memberextensionno"]
                        for item in items_to_check
                        if isinstance(item, dict) and "memberextensionno" in item
                    ]

                    if not member_extensions:
                        print("No member extensions found in flow data")
                        return None

                    # 3️⃣ Build IN clause safely
                    placeholders = ",".join(["%s"] * len(member_extensions))

                    # print(f"placeholders : {placeholders}")

                    # 4️⃣ Fetch least recently assigned agent
                    query_2 = f"""
                        SELECT m_memberExtensionNo, m_memberName
                        FROM p_members
                        WHERE m_accountId = %s
                        AND m_accountNo = %s
                        AND m_memberRole = 'USER'
                        AND m_memberExtensionNo IN ({placeholders})
                        ORDER BY
                            (m_lastIncomingMsgSMS IS NOT NULL),
                            m_lastIncomingMsgSMS ASC
                        LIMIT 1
                    """
                    params_2 = (accountId, accountNo, *member_extensions)
                    # print(f"Query 2: {query_2}")
                    # print(f"Params 2: {params_2}")
                    cursor.execute(query_2, params_2)
                    agent = cursor.fetchone()

                    if not agent:
                        print("Query 2 result: No agent found")
                        return None

                    agent_extension = agent["m_memberExtensionNo"]
                    agent_name = agent["m_memberName"]

                    # 5️⃣ Update last SMS timestamp
                    ist_tz = timezone(timedelta(hours=5, minutes=30))
                    current_time = datetime.now(ist_tz).strftime("%Y-%m-%d %H:%M:%S")

                    update_query = """
                        UPDATE p_members
                        SET m_lastIncomingMsgSMS = %s
                        WHERE m_memberExtensionNo = %s
                        AND m_accountId = %s
                        AND m_accountNo = %s
                    """
                    params_update = (current_time, agent_extension, accountId, accountNo)
                    # print(f"Update Query: {update_query}")
                    # print(f"Update Params: {params_update}")
                    
                    cursor.execute(update_query, params_update)

                    conn.commit()

                    return {
                        "agentExtension": agent_extension,
                        "agentName": agent_name
                    }

        except Exception as e:
            logger.error(f"❌ MySQL query failed: {e}")
            return None


    def getAssignUser(self, userId: str, accountId: str) -> dict | bool:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(buffered=True)

                query_agent = """
                    SELECT m_memberName 
                    FROM p_members 
                    WHERE m_memberExtensionNo = %s 
                    AND m_accountId = %s;
                """
                cursor.execute(query_agent, (userId, accountId))
                row_agent = cursor.fetchone()
                agentName = row_agent[0] if row_agent else None

                query_team_leader = """
                    SELECT t_teamLeaderExtensionNo 
                    FROM p_teams 
                    WHERE t_teamMemberExtensionNo = %s 
                    AND t_accountId = %s;
                """
                cursor.execute(query_team_leader, (userId, accountId))

                rows_tl = cursor.fetchall()
                socketTL_list = [row[0] for row in rows_tl] if rows_tl else []
                
                
                query_admin = """
                    select m_memberExtensionNo from p_members where m_accountId=%s and m_memberRole='ADMIN';
                """
                cursor.execute(query_admin, (accountId,))

                rows_Admin = cursor.fetchall()
                socketAdmin_list = [str(row[0]) for row in rows_Admin] if rows_Admin else []
                
                combined = socketTL_list + socketAdmin_list + [userId]

                return {
                    "agentName": agentName,
                    "socketUsers": combined
                }

        except Exception as e:
            logger.error(f"❌ MySQL query failed: {e}")
            return False


    def getLeadConversationID(self, userId: str, accountId: str, accountNo: str, srcNum: str) -> dict | bool:
        try:
            with self.get_connection() as conn:
                with conn.cursor(buffered=True) as cursor:

                    # --- Check if lead exists ---
                    cursor.execute("""
                        SELECT l_leadId
                        FROM p_leads
                        WHERE l_accountId = %s
                        AND l_accountNo = %s
                        AND l_leadPhoneNo = %s
                    """, (accountId, accountNo, srcNum))
                    
                    row = cursor.fetchone()
                    if row:
                        leadId = row[0]
                    else:
                        leadId = "00L" + alphanumericUniqueId()
                        cursor.execute("""
                            INSERT INTO p_leads (l_accountId, l_accountNo, l_leadId, l_leadPhoneNo, l_leadOwner)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (accountId, accountNo, leadId, srcNum, userId))
                        conn.commit()

                    # --- Check if conversation exists ---
                    conversationChannel = 'SMS'
                    conversationType = 'Message'
                    cursor.execute("""
                        SELECT c_conversationId
                        FROM p_conversations
                        WHERE c_accountId = %s
                        AND c_accountNo = %s
                        AND c_conversationPhoneNo = %s
                        AND c_conversationOwner = %s
                        AND c_conversationChannel= %s 
                        AND c_conversationType = %s
                    """, (accountId, accountNo, srcNum, userId,conversationChannel,conversationType))

                    row = cursor.fetchone()
                    if row:
                        conversationId = row[0]
                    else:
                        conversationId = "00C" + alphanumericUniqueId()
  
                        conversationStatus = 'Active'
                        conversationDetails = json.dumps({})  # Convert dict to JSON string

                        cursor.execute("""
                            INSERT INTO p_conversations (
                                c_accountId, c_accountNo, c_conversationId, c_leadId,
                                c_conversationPhoneNo, c_conversationOwner,
                                c_conversationChannel, c_conversationType,
                                c_conversationDetails, c_conversationStatus
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            accountId, accountNo, conversationId, leadId,
                            srcNum, userId,
                            conversationChannel, conversationType,
                            conversationDetails, conversationStatus
                        ))
                        conn.commit()

                    return {
                        "leadId": leadId,
                        "conversationId": conversationId
                    }

        except Exception as e:
            logger.error(f"❌ MySQL query failed: {e}")
            return False 

    def insertNotification(self, src_number: str, agent_extension: str, ist_formatted, accountId: str, accountNo: str) -> bool:
        """Insert notification into database with validation."""
        try:
            # 🔹 Basic validation
            if not src_number or not re.match(r'^\+?\d{7,15}$', str(src_number)):
                raise ValueError("Invalid source number")

            if not agent_extension or not str(agent_extension).isdigit():
                raise ValueError("Invalid agent extension")

            if not accountId or not accountNo:
                raise ValueError("Account details missing")

            if not ist_formatted:
                raise ValueError("Invalid timestamp")

            # 🔹 Convert dict → JSON string
            notificationData = json.dumps({
                "phonenumber": src_number
            })

            with self.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    INSERT INTO p_notifications (
                        n_accountId, n_accountNo, n_notificationType, n_notificationData,
                        n_notificationTime, n_memberExtensionNo,
                        n_notificationStatus
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    accountId,
                    accountNo,
                    'INCOMINGSMS',
                    notificationData,
                    ist_formatted,
                    agent_extension,
                    'UNREAD'
                ))

                conn.commit()

                # 🔹 Check success
                return cursor.rowcount > 0

        except ValueError as ve:
            logger.warning(f"⚠️ Validation failed: {ve}")
            return False

        except Exception as e:
            logger.error(f"❌ MySQL insert failed: {e}")
            return False
        
    def checkSmsMode(self, agent_extension: str, accountId: str, accountNo: str)  -> bool:
        """Fetch SMS mode and mail ID for a member."""

        try:
            # 🔹 Basic validation
            if not agent_extension or not accountId or not accountNo:
                raise ValueError("Missing required parameters")

            with self.get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    SELECT m_smsMode, m_memberMailId
                    FROM p_members
                    WHERE m_memberExtensionNo = %s
                    AND m_accountId = %s
                    AND m_accountNo = %s
                """, (agent_extension, accountId, accountNo))

                row = cursor.fetchone()

                if row:
                    smsMode, mailId = row

                    return {
                        "smsMode": smsMode,
                        "mailId": mailId
                    }

                # 🔹 No data found
                return None

        except ValueError as ve:
            logger.warning(f"⚠️ Validation error: {ve}")
            return None

        except Exception as e:
            logger.error(f"❌ DB error in checkSmsMode: {e}")
            return None
        

    def sendSmsMail(self, src_number: str, ist_formatted: str, msg: str, mailId: str) -> bool:
        """Send an email notification for an incoming SMS."""
        try:
            # 🔹 Basic validation
            if not mailId:
                logger.error("❌ Mail ID is missing, cannot send SMS mail")
                return False

            smtp_server = config.mail_smtp_server
            port = config.mail_port
            username = config.mail_userName
            password = config.mail_password

            if not all([smtp_server, username, password]):
                logger.error(f"❌ SMTP configuration missing. Server: {smtp_server}, User: {username}")
                return False

            from_email = username
            subject = f"Incoming SMS from {src_number}"

            bodyContent = f"""<!doctype html>
<html>
<body>
Dear User,<br><br>
You have received an SMS from '{src_number}' on {ist_formatted}.<br><br>
<b>Message:</b> {msg}
</body>
</html>
"""

            message = MIMEMultipart()
            message["From"] = from_email
            message["To"] = mailId
            message["Subject"] = subject
            message.attach(MIMEText(bodyContent, "html"))

            logger.info(f"📬 Attempting to send SMS mail to {mailId} via {smtp_server}:{port}")
            
            # Using context manager for SMTP is safer
            with smtplib.SMTP(smtp_server, port, timeout=15) as server:
                server.starttls()
                server.login(username, password)
                server.send_message(message)

            logger.info(f"✅ Email sent successfully to {mailId}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send SMS mail to {mailId}: {e}", exc_info=True)
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
                response = self._session.post(
                    config.login_url,
                    headers=headers,
                    data=json.dumps(payload),
                    verify=not config.disable_ssl_verify,
                    timeout=10
                )
                response.raise_for_status()
                
                # 1. Try to extract from JSON body first (common in /login/app)
                try:
                    resp_json = response.json()
                    if resp_json and isinstance(resp_json, dict) and resp_json.get("token"):
                        token = resp_json["token"]
                        logger.info("🔑 Access token obtained from JSON response")
                        return token
                except:
                    pass

                # 2. Try to extract from response.cookies (Requests handles comma-separated Set-Cookie headers)
                for key in ['accessToken', 'AuthToken', 'accessToken_KPL']:
                    if key in response.cookies:
                        token = response.cookies[key]
                        logger.info(f"🔑 Access token obtained from cookies: {key}")
                        return token
                
                import re
                # 3. Fallback: Manual string parsing if Requests fails (unlikely but safe)
                set_cookie_header = response.headers.get('Set-Cookie') or response.headers.get('set-cookie', '')
                for key in ['accessToken', 'AuthToken', 'accessToken_KPL']:
                    if f"{key}=" in set_cookie_header:
                        try:
                            # Extract everything after key= until ; or end of string
                            match = re.search(f"{key}=([^;\\s,]+)", set_cookie_header)
                            if match:
                                token = match.group(1)
                                logger.info(f"🔑 Access token obtained from manual header parsing: {key}")
                                return token
                        except:
                            pass

                # If we're here, we failed to find the token
                logger.error(f"Response Body: {response.text[:200]}...")
                logger.error(f"Response Headers: {response.headers}")
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
                auto_offset_reset="earliest",
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
    """Processes SMS DLR events."""
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
        
        # Initialize MongoDB connection once
        try:
            self.mongo_client = pymongo.MongoClient("mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net")
            self.db = self.mongo_client["smsConnecthub"]
            self.master_db = self.mongo_client["onedb"]
            self.collection = self.db["messageLogs"]
            self.activities_table = self.master_db["activities"]
            logger.info("✅ MongoDB connection initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize MongoDB: {e}")
            self.mongo_client = None

    def close(self):
        """Close MongoDB connection."""
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("✅ MongoDB connection closed")
        
    def process_event(self, eventdata: Dict[str, Any]) -> str:
        """Process a single event."""
        data = eventdata
        print(data)
        try:
            dst_number = data["SMS_DST_ADDR"]
            src_number = data["SMS_SRC_ADDR"]
            text_data = data["SMS_TEXT"]
            timestamp = data["SMS_TIME"]
            
            getAccountIDs = db_manager.getAccountID(dst_number)
            if not getAccountIDs:
                logger.warning(f"Account not found for dst: {dst_number}")
                return {"error": "account_not_found"}
            
            accountNo = getAccountIDs[0]
            accountId = getAccountIDs[1]
            clinumberId = getAccountIDs[2]
            
            print(f"accountId : {accountId}")
            print(f"accountNo : {accountNo}")
            print(f"clinumberId : {clinumberId}")
            
            if not self.mongo_client:
                 logger.error("MongoDB not initialized")
                 return {"error": "mongodb_connection_error"}

            query_filter = {
                "channel": "SMS",
                "direction": "Outbound",
                "$or": [
                    {"details.m_dst": f"{src_number}"},
                    {"details.m_dst": f"1{src_number}"}
                ]
            }

            sort_criteria = [("activityTimestamp", DESCENDING)]
            
            getAgent = self.activities_table.find_one(
                query_filter,
                sort=sort_criteria
            )

            agent_extension = None
            agent_name = None

            if getAgent:
                # Found existing agent from previous conversation
                agent_extension = getAgent.get("details", {}).get("m_src", "")
                logger.info(f"Latest agent found for {src_number}: {agent_extension}")
            else:
                # Assign new agent
                newInboundUser = db_manager.newInboundAssign(accountId, accountNo, clinumberId)
                print(f"newInboundUser : {newInboundUser}")
                if not newInboundUser:
                    logger.warning(f"No available agent found for new inbound message from {src_number}")
                    return {"error": "no_agent_available"}
                
                agent_extension = newInboundUser["agentExtension"]
                agent_name = newInboundUser["agentName"]
                logger.info(f"New Inbound Message assigned to: {agent_name} ({agent_extension})")

            # Get full agent details and socket users (Team Leaders, Admins, etc.)
            # If we only have agent_extension (from MongoDB), this fetches the name.
            assignUser = db_manager.getAssignUser(agent_extension, accountId)
            
            if not assignUser:
                logger.error(f"Failed to get agent details for {agent_extension}")
                return {"error": "agent_details_error"}
            
            # Use name from getAssignUser to be safe/consistent
            agent_name = assignUser["agentName"]
            socket_users = assignUser["socketUsers"]

            self.insertMessageLog(accountId, accountNo, src_number, timestamp, text_data, agent_extension, agent_name, socket_users)
            
            return {"status": "ok"}

        except Exception as e:
            logger.error(f"Error in process_event: {e}")
            return {"error": str(e)}

        
    def insertMessageLog(self, accountId, accountNo, src_number, timestamp, text_data, agent_extension, agent_name, socket_users):
        
        ist_offset = timedelta(hours=5, minutes=30)
        ist_timezone = timezone(ist_offset)
        now = datetime.now(ist_timezone)
        ist_formatted = now.strftime("%Y-%m-%d %H:%M:%S")
        iso_string = now.isoformat()
        
        insertValue = {
            "accountId": accountId,
            "accountNo": accountNo,
            "src": src_number,
            "dst": agent_extension,
            "timestamp": timestamp,
            "type": 'text',
            "receiveMsg": text_data,
            "msgType": "Inbound",
            "assignedAt": ist_formatted
        }
        
        getLeadConversationIDs = db_manager.getLeadConversationID(agent_extension, accountId, accountNo, src_number)
        if not getLeadConversationIDs:
            logger.error(f"Failed to get/create lead and conversation for src: {src_number}")
            return {"error": "lead_conversation_error"}
        
        leadId = getLeadConversationIDs["leadId"]
        conversationId = getLeadConversationIDs["conversationId"]
        
        
        payload_content = {
            "accountId": accountId,
            "accountNo": accountNo,
            "leadId": leadId,
            "taskId": '',
            "conversationId": conversationId,
            "campaignId": 0,
            "memberName": agent_name,
            "channel": 'SMS',
            "direction": 'Inbound',
            "type": 'Message',
            "activityTimestamp": iso_string,
            "details": {
                "m_src": src_number,
                "m_dst": agent_extension,
                "m_timestamp": timestamp,
                "m_type": 'text',
                "m_receiveMsg": text_data,
                "m_msgType": "Inbound",
                "m_assignedAt": ist_formatted
            }
        }
        checkSmsMode=db_manager.checkSmsMode(agent_extension,accountId, accountNo)
        smsMode = checkSmsMode["smsMode"]
        mailId = checkSmsMode["mailId"]
        if smsMode == 'MAIL':
            sendSmsMail=db_manager.sendSmsMail(src_number,ist_formatted,text_data,mailId)
            logger.info(f"Mail Status {sendSmsMail}")
        else:    
            # Notify all relevant users (Agent + Team Leaders + Admins)
            db_manager.insertNotification(src_number,agent_extension,ist_formatted, accountId, accountNo)
            for ext in socket_users:
                socketData = {
                    "extention": ext, # Note: Validating 'extention' vs 'extension' with frontend requirements
                    "data": {
                        "action": "SMS",
                        "payload": payload_content
                    }
                }
                self.socket_manager.emit('message', json.dumps(socketData))
            
        self.activities_table.insert_one(payload_content)                    
        self.collection.insert_one(insertValue)
        logger.info(f"✅ Inserted message from {src_number}: {text_data}")

    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return self._stats.copy()
        
# ----------------------------
# Kafka Consumer Setup
# ----------------------------
def create_consumer() -> KafkaConsumer:
    """Creates and returns a KafkaConsumer instance."""
    return KafkaConsumer(
        config.kafka_topic,
        bootstrap_servers=config.kafka_broker,
        group_id=config.kafka_group_id,
        auto_offset_reset='earliest',  # Start consuming from the earliest available offset
        enable_auto_commit=True,
        value_deserializer=lambda x: x.decode('utf-8')
    )

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
            self.event_processor.close()
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

