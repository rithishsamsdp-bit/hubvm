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
import re
import threading
import queue
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any, Tuple
import ssl
import signal
import sys
import pymongo
import urllib.parse
import io
import csv

from pymongo import MongoClient, DESCENDING
from bson import ObjectId
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
import firebase_admin
from firebase_admin import credentials,messaging
# from firebase_config import initialize_firebase

logger = logging.getLogger(__name__)

from config import settings


# Firebase Initialization
def initialize_firebase():
    if not firebase_admin._apps:
        try:
            current_dir = os.path.dirname(__file__)
            cred_path = os.path.join(current_dir, "serviceAccountKey.json")

            if not os.path.exists(cred_path):
                logger.error(f"FCM Credentials not found at {cred_path}")
                return False

            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                "projectId": cred.project_id
            })
            logger.info("✅ Firebase initialized successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Firebase initialization failed: {e}")
            return False
    return True



# ----------------------------
# Configuration
# ----------------------------
@dataclass
class Config:
    """Application configuration."""
    # Kafka
    kafka_broker: str = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
    kafka_topics: list = field(default_factory=lambda: os.getenv("KAFKA_TOPIC", "whatsupdlr,whatsapp-campaign-Live,whatsapp-auto-execute-Live").split(","))
    kafka_group_id: str = os.getenv("KAFKA_GROUP_ID", "dlr-consumer")
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
# Campaign Completion Tracker
# ----------------------------
class CampaignTracker:
    def __init__(self, total, campaign_id, db_manager):
        self.total = total
        self.count = 0
        self.lock = threading.Lock()
        self.campaign_id = campaign_id
        self.db_manager = db_manager

    def increment(self):
        with self.lock:
            self.count += 1
            if self.count >= self.total:
                print(f"✅ Campaign {self.campaign_id} Completed! All {self.total} tasks finished.")
                self.db_manager.updateCampaignStatus(self.campaign_id, "COMPLETED")

# ----------------------------
# MySQL Connection Pool
# ----------------------------
class DatabaseManager:
    """Manages MySQL connection pool and operations.."""
    
    def __init__(self):
        self.pool: Optional[pooling.MySQLConnectionPool] = None
        self.mongo_client: Optional[pymongo.MongoClient] = None
        self._lock = threading.Lock()
        self._initialize_pool()
        self._initialize_mongo()
    
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

    def _initialize_mongo(self):
        """Initialize MongoDB connection."""
        try:
            MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net")
            self.mongo_client = pymongo.MongoClient(
                MONGO_URI,
                tls=True,
                tlsAllowInvalidCertificates=True,
                connectTimeoutMS=20000,
                retryWrites=True
            )
            # Force a connection check
            # self.mongo_client.admin.command('ping') 
            logger.info("✅ MongoDB connection initialized")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            self.mongo_client = None
    
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
        
        
    def getAccountID(self, entry_id: str) -> bool:
        """Insert conference event into database."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                select_query = """
                    SELECT 
                        pa.a_accountId,
                        pa.a_accountNo
                    FROM p_whatsappaccounts pw
                    LEFT JOIN p_accounts pa 
                        ON pw.w_accountId = pa.a_accountId
                    WHERE pw.w_wabaID = %s
                    LIMIT 1
                """
                cursor.execute(select_query, (entry_id,))
                member_row = cursor.fetchone()
                return member_row
        except Exception as e:
            logger.error(f"❌ MySQL insert failed: {e}")
            return False



    def newInboundAssign(self, accountId: str, accountNo: str) -> dict | None:
        try:
            with self.get_connection() as conn:
                with conn.cursor(buffered=True) as cursor:

                    cursor.execute("""
                        SELECT m_memberExtensionNo
                        FROM p_members
                        WHERE m_accountId = %s
                        AND m_accountNo = %s
                        AND m_memberRole = 'USER'
                        ORDER BY
                            CASE WHEN m_lastIncomingMsgWapp IS NULL THEN 0 ELSE 1 END,
                            m_lastIncomingMsgWapp ASC
                        LIMIT 1;
                    """, (accountId, accountNo))

                    row = cursor.fetchone()
                    if not row:
                        return None

                    agent_extension = str(row[0])
                    ist_tz = timezone(timedelta(hours=5, minutes=30))
                    current_time = datetime.now(ist_tz).strftime("%Y-%m-%d %H:%M:%S")

                    cursor.execute("""
                        UPDATE p_members
                        SET m_lastIncomingMsgWapp = %s
                        WHERE m_memberExtensionNo = %s
                        AND m_accountId = %s
                        AND m_accountNo = %s;
                    """, (current_time, agent_extension, accountId, accountNo))

                    conn.commit()

                    return {"agentName": agent_extension}

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
        except Exception as e:
            logger.error(f"❌ MySQL query failed: {e}")
            return False

    def create_campaign_entry(self, campaign_name, campaign_category, template_name, template_id, schedule_time, duplicate_status, account_id, account_no):
        """Insert new campaign and return ID."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                insert_query = """
                    INSERT INTO p_campaigns_whatsapp 
                    (cw_campaign_name, cw_campaign_category, cw_template_name, cw_template_id, cw_schedule_time, cw_duplicate_removal_status, cw_account_id, cw_account_no, cw_created_on, cw_updated_on)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """
                cursor.execute(insert_query, (campaign_name, campaign_category, template_name, template_id, schedule_time, duplicate_status, account_id, account_no))
                campaign_id = cursor.lastrowid
                conn.commit()
                cursor.close()
                return campaign_id
        except Exception as e:
            logger.error(f"❌ Failed to create campaign: {e}")
            return None

    def insert_campaign_leads(self, leads_data):
        """Bulk insert leads into p_leads_whatsapp."""
        if not leads_data:
            return True
            
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                insert_query = """
                    INSERT INTO p_leads_whatsapp 
                    (lw_campaign_id, lw_mobile_number, lw_country_code, lw_var1,lw_var2,lw_var3,lw_var4,lw_var5,lw_var6,lw_var7,lw_var8,lw_var9,lw_var10, lw_account_id, lw_account_no, lw_created_on)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """
                # Execute in chunks if needed, but executemany handles batching reasonably well for thousands
                # For 300k, we call this method repeatedly with chunks from consumer
                cursor.executemany(insert_query, leads_data)
                conn.commit()
                cursor.close()
                return True
        except Exception as e:
            logger.error(f"❌ Failed to bulk insert leads: {e}")
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
                    conversationChannel = 'Whatsapp'
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


    def updateCampaignStatus(self, campaignId: str,Status:str) -> dict | bool:
        try:
            with self.get_connection() as conn:
                with conn.cursor(buffered=True) as cursor:
                    cursor.execute("""
                        UPDATE p_campaigns_whatsapp
                        SET cw_status = %s
                        WHERE cw_id = %s
                    """, (Status,campaignId))
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"❌ MySQL query failed: {e}")
            return False       


    def getLeadDatas(self, campaignId: str) -> dict | bool:
        try:
            with self.get_connection() as conn:
                with conn.cursor(buffered=True) as cursor:
                    cursor.execute("""
                        SELECT * FROM p_leads_whatsapp
                        WHERE lw_campaign_id = %s
                    """, (campaignId,))
                    rows = cursor.fetchall()
                    if rows:
                        return rows
                    else:
                        return False
        except Exception as e:
            logger.error(f"❌ MySQL query failed: {e}")
            return False     


    def sendFCMNotification(self, ext: str) -> dict | bool:

        initialize_firebase()
        try:
            with self.get_connection() as conn:
                with conn.cursor(buffered=True) as cursor:
                    cursor.execute("""
                        SELECT m_memberFCMToken 
                        FROM p_members
                        WHERE m_memberExtensionNo = %s
                    """, (ext,))

                    row = cursor.fetchone()

                    if not row:
                        return False

                    token = row[0]

                    if not token:
                        return {
                            "status": "skipped",
                            "message": "No FCM token found or agent is not in SOFTPHONE mode."
                        }

                    try:
                        message = messaging.Message(
                            notification=messaging.Notification(
                                title="New WhatsApp Message",
                                body=f"You have a new message from a customer"
                            ),
                            data={
                                "type": "incoming_message_Whatsapp",
                                "extension": ext
                            },
                            token=token,
                            android=messaging.AndroidConfig(
                                priority="high"
                            )
                        )

                        response = messaging.send(message)

                        return {
                            "status": "success",
                            "message_id": response
                        }

                    except Exception as e:
                        logger.error(f"FCM send error: {e}")
                        return {
                            "status": "error",
                            "message": str(e)
                        }

        except Exception as e:
            logger.error(f"MySQL query failed: {e}")
            return False               


    def getEmergencyOrchestration(self, campaignId: str) -> dict | bool:
        """Fetches orchestration data for an emergency campaign."""
        try:
            with self.get_connection() as conn:
                with conn.cursor(dictionary=True) as cursor:
                    cursor.execute("""
                        SELECT e_orchestrationId FROM p_emergency_campaigns
                        WHERE e_campaignId = %s
                    """, (campaignId,))
                    row = cursor.fetchone()
                    if not row or not row.get("e_orchestrationId"):
                        return False

                    orchestration_id = row["e_orchestrationId"]
                    # Fetch from MongoDB
                    orchestration_db = self.mongo_client["emergency_orchestration"]
                    doc = orchestration_db["orchestrations"].find_one({"_id": ObjectId(orchestration_id)})
                    if doc:
                        return doc.get("data")
                    return False
        except Exception as e:
            logger.error(f"❌ Failed to get emergency orchestration: {e}")
            return False

    def getWhatsappAccount(self, accountId: str) -> dict | bool:
        try:
            with self.get_connection() as conn:
                with conn.cursor(buffered=True) as cursor:
                    cursor.execute("""
                        SELECT w_phNumberId, w_apiKey FROM p_whatsappaccounts WHERE w_accountId = %s
                    """, (accountId,))
                    rows = cursor.fetchall()
                    if rows:
                        return {
                            "phNumberId": rows[0][0],
                            "apiKey": rows[0][1]
                        }
                    else:
                        return False
        except Exception as e:
            logger.error(f"❌ MySQL query failed: {e}")
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
                *config.kafka_topics,
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
            logger.info(f"📊 Subscribed to topics: {config.kafka_topics} with group: {config.kafka_group_id}")
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
    """Processes WhatsApp DLR events."""
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
        
        # Initialize Worker Queue for Bulk Campaigns
        self.campaign_queue = queue.Queue()
        self.worker_threads = []
        for _ in range(5):  # Start 5 worker threads
            t = threading.Thread(target=self._campaign_worker, daemon=True)
            t.start()
            self.worker_threads.append(t)
        
    def _campaign_worker(self):
        """Worker thread to process campaign messages from queue."""
        while True:
            try:
                task = self.campaign_queue.get()
                if task is None:
                    break
                
                # Unpack task
                func, args, kwargs = task
                try:
                    func(*args, **kwargs)
                except Exception as e:
                    logger.error(f"❌ Error in campaign worker: {e}")
                finally:
                    self.campaign_queue.task_done()
            except Exception as e:
                logger.error(f"❌ Worker thread error: {e}")

    def _tracked_worker_task(self, tracker: 'CampaignTracker', *args) -> None:
        """Helper to run a task and notify tracker on completion."""
        try:
            self.sendCampaignMsgBulk(*args)
        finally:
            tracker.increment()

    def process_event(self, eventdata: Dict[str, Any], topic: str) -> str:
        """Process a single event."""
        logger.info(f"🔄 Processing event: topic='{topic}', type={type(topic)}")
        data = eventdata
        try:
            if topic == "whatsupdlr":
                # Validate payload structure first
                if not isinstance(data, dict) or "entry" not in data or not data["entry"]:
                    logger.warning("Invalid payload: missing 'entry'")
                    return {"error": "invalid_payload"}

                entry = data["entry"][0]
                if "changes" not in entry or not entry["changes"]:
                    logger.warning("Invalid payload: missing 'changes'")
                    return {"error": "invalid_payload"}

                # Extract account info after validation
                entry_id = entry.get('id')
                logger.info(f"Processing event for entry_id: {entry_id}")
                logger.info(f"Raw data : {data} \ntopic : {topic}")
                
                getAccountIDs = db_manager.getAccountID(entry_id)
                if not getAccountIDs:
                    logger.error(f"No account found for entry_id: {entry_id}")
                    return {"error": "account_not_found"}
                
                accountId = getAccountIDs[0]
                accountNo = getAccountIDs[1]

                change = entry["changes"][0]
                event = change.get("field")
                logger.info(f"Event field: {event}")
                logger.info(f"Event field: {event}")
                
                # client = pymongo.MongoClient("mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net")
                client = db_manager.mongo_client
                db = client["whatsappConnecthub"]
                MasterDB = client["onedb"]
                collection = db["messageLogs"]
                
                if event=='messages':
                    message_type = self.check_message_type(data)
                    logger.info(f"check_message_type: {message_type}")
                    if message_type == "incoming":
                        value = change.get("value", {})
                        contacts = value.get("contacts", [])
                        messages = value.get("messages", [])
                        metadata = value.get("metadata", {})

                        if not contacts or not messages or "display_phone_number" not in metadata:
                            logger.warning("Invalid message payload: missing required fields")
                            return {"error": "missing_fields"}

                        contact = contacts[0]
                        message = messages[0]

                        name = contact.get("profile", {}).get("name", "Unknown")
                        wa_id = contact.get("wa_id", "")
                        custNo = str(wa_id)[-10:]
                        messageType = message.get("type", "")
                        wamid = message.get("id", "")
                        timestamp = message.get("timestamp", "")
                        display_phone_number = metadata.get("display_phone_number", "")
                        custWaba_Id = entry.get("id", "")

                        # Manual READ Status Update for replied message
                        context = message.get("context", {})
                        context_id = context.get("id")
                        if context_id:
                            logger.info(f"Manual READ status for context_id: {context_id}")
                            self.updateStatus("read", context_id, timestamp, accountId, accountNo, MasterDB, collection, "")



                        query_filter = {
                            "accountId":accountId,
                            "accountNo":f"{accountNo}",
                            #"campaignId":0, # Removed to support campaign replies linking
                            "channel": "Whatsapp",
                            "direction": "Outbound",
                            "$or": [
                                {"details.m_dst": f"{custNo}"},
                                {"details.m_dst": f"91{custNo}"}
                            ]
                        }

                        sort_criteria = [("activityTimestamp", DESCENDING)]

                        sort_criteria = [("activityTimestamp", DESCENDING)]

                        logger.info(f"MongoDB Query Filter: {query_filter}")
                        logger.info(f"Sort: {sort_criteria}")

                        activitiesTable = MasterDB["activities"]

                        getAgent = activitiesTable.find_one(
                            query_filter,
                            sort=sort_criteria
                        )

                        logger.info(f"Query Result: {getAgent}")

                        if getAgent:
                            # agent = getAgent.get("m_src")
                            agent = getAgent.get("details", {}).get("m_src", "")
                            logger.info(f"Latest agent found: {agent}")
                        else:
                            newInboundUser = db_manager.newInboundAssign(accountId, accountNo)
                            if not newInboundUser:
                                logger.warning(f"No available agent found for new inbound message from {wa_id}")
                                return {"error": "no_agent_available"}
                            agent = newInboundUser["agentName"]
                            logger.info(f"New Inbound Message assigned to: {agent}")

                        if messageType == "text":
                            text_data = message.get("text", {}).get("body", "")
                            if not text_data.strip():
                                logger.info("Empty text message ignored.")
                                return {"status": "ignored"}
                            
                            
                            self.insertMessageLog(accountId,accountNo,wamid,agent,timestamp,messageType,text_data,wa_id,MasterDB,collection,name)

                        elif messageType == "button":
                            text_data = message.get("button", {}).get("text", "")
                            self.insertMessageLog(accountId,accountNo,wamid,agent,timestamp,messageType,text_data,wa_id,MasterDB,collection,name)

                            # Automated Button Reply Logic
                            self.trigger_button_reply(accountId, accountNo, wa_id, text_data, MasterDB)

                        elif messageType == "interactive":
                            interactive_data = message.get("interactive", {})
                            interactive_type = interactive_data.get("type", "")
                            if interactive_type == "button_reply":
                                text_data = interactive_data.get("button_reply", {}).get("title", "")
                            elif interactive_type == "list_reply":
                                text_data = interactive_data.get("list_reply", {}).get("title", "")
                            else:
                                text_data = ""
                            
                            if text_data:
                                self.insertMessageLog(accountId,accountNo,wamid,agent,timestamp,messageType,text_data,wa_id,MasterDB,collection,name)

                                # Automated Button Reply Logic
                                if messageType == "interactive" and interactive_type == "button_reply":
                                    self.trigger_button_reply(accountId, accountNo, wa_id, text_data, MasterDB)

                        elif messageType == "image" or messageType == "video" or messageType == "document" :  
                            media_info = message.get(messageType, {})

                            # Extract values safely
                            media_type = media_info.get("mime_type", "")
                            media_id = media_info.get("id", "")
                            mediaTextCaption = media_info.get("caption", "")

                            # Extract extension only if mime_type exists
                            fileType = media_type.split("/")[-1] if media_type else ""

                            if media_id and fileType:
                                if messageType == "image":
                                    mediaUrl = f"https://whatsappdata.s3.ap-south-1.amazonaws.com/{media_id}_IMG.{fileType}"
                                elif messageType == "video":    
                                    mediaUrl = f"https://whatsappdata.s3.ap-south-1.amazonaws.com/{media_id}_VID.{fileType}"
                                elif messageType == "document": 
                                    media_filename = media_info.get("id", "") 
                                    encodedFileName = urllib.parse.quote(media_filename)                              
                                    mediaUrl = f"https://whatsappdata.s3.ap-south-1.amazonaws.com/{media_id}_{encodedFileName}"

                                    
                                logger.info(mediaUrl)
                            else:
                                logger.warning("Missing media_name or fileType")
                                
                            self.insertMediaMessageLog(accountId,accountNo,wamid,agent,timestamp,messageType,wa_id,MasterDB,collection,fileType,mediaUrl,mediaTextCaption,name)    

                        else:
                            logger.warning(f"Unsupported message type: {messageType}")
                            return {"status": "unsupported_type"}
                    elif message_type == "outgoing":
                        value = change.get("value", {})
                        statuses = value.get("statuses", {})
                        for item in statuses:
                            status = item.get("status")
                            id = item.get("id")
                            statusChangeTime = item.get("timestamp")
                            
                            if status=='failed':
                                errorsDetails = item.get("errors")
                            else :
                                errorsDetails=''  
                                
                            value=self.updateStatus(status,id,statusChangeTime,accountId,accountNo,MasterDB,collection,errorsDetails)
                            logger.info(value)
                        return {"status": "outgoing"}
                elif event == 'message_template_status_update':
                    try:
                        logger.info("Received message_template_status_update event")

                        data = change.get("value")
                        if not data:
                            logger.error("Missing 'value' in change payload")
                            return {"status": "error", "message": "Invalid payload"}

                        template_event = data.get('event')
                        message_template_id = data.get('message_template_id')

                        if not template_event or not message_template_id:
                            logger.error("Missing required fields: event or message_template_id")
                            return {"status": "error", "message": "Missing required fields"}

                        # Reason handling with validation
                        reason = 'None'

                        if template_event == 'REJECTED':
                            reason = data.get('reason', 'No reason provided')

                        elif template_event == 'PAUSED':
                            other_info = data.get('other_info', {})
                            if isinstance(other_info, dict):
                                reason = other_info.get('description', 'No description provided')
                            else:
                                logger.error("Invalid other_info format for PAUSED event")

                        templeteDetails = db["templeteDetails"]

                        result = templeteDetails.update_one(
                            {
                                'templateStatus.id': str(message_template_id),  # force string
                                'accountNo': str(accountNo),                    # force string
                                'accountId': int(accountId)                     # force int
                            },
                            {
                                '$set': {
                                    'templateStatus.status': template_event,
                                    'templateStatus.reason': reason,
                                }
                            }
                        )

                        if result.matched_count == 0:
                            logger.error(f"No document matched for template_id: {message_template_id},{accountNo},{accountId}")
                        elif result.modified_count == 0:
                            logger.info(f"Document found but already up-to-date for template_id: {message_template_id}")
                        else:
                            logger.info(f"Template {message_template_id} updated successfully with status {template_event}")

                        return {"status": "message_template_status_update"}
                    except Exception as e:
                        logger.error(f"Exception in message_template_status_update: {str(e)}", exc_info=True)
                        return {"status": "error", "message": "Internal server error"}
                elif event=='message_template_quality_update': 
                    data = change.get("value", {})
                    logger.info("message_template_quality_update")
            elif topic=='whatsapp-campaign-Live':
                logger.info(f"Campaign Data: {data}")
                s3Link = data.get('file')
                fileName = data.get('fileName')
                campaignName = data.get('campaignName')
                campaignCategory = data.get('campaignCategory')
                templateName = data.get('templateName')
                templateId = data.get('templateId')
                scheduleTime = data.get('scheduleTime')
                duplicateRemovalStatus = data.get('duplicateRemovalStatus')
                accountId = data.get('accountId')
                accountNo = data.get('accountNo')
                database = data.get('database')

                if not s3Link:
                    raise ValueError("s3Link missing in payload")
                
                # 1. Create Campaign Entry
                campaign_id = db_manager.create_campaign_entry(
                    campaignName, campaignCategory, templateName, templateId, 
                    scheduleTime, duplicateRemovalStatus, accountId, accountNo
                )
                logger.info(f"Created Campaign ID: {campaign_id}")

                if not campaign_id:
                     logger.error("Failed to create campaign record.")
                     return {"error": "campaign_creation_failed"}

                response = requests.get(s3Link, timeout=30)
                response.raise_for_status()
                logger.info(f"Response: {response}")
                
                csv_content = response.text
                logger.info(f"DEBUG: CSV Content Length: {len(csv_content)}")
                logger.info(f"DEBUG: CSV First 200 chars: {csv_content[:200]}")

                # Use a customized DictReader to handle header variations if needed, 
                # but for now let's just inspect what we get and handle the keys visible in the screenshot.
                reader = csv.DictReader(io.StringIO(csv_content))
                logger.info(f"CSV Headers found: {reader.fieldnames}")
                
                seen_numbers = set()
                batch_size = 5000
                leads_batch = []
                total_inserted = 0

                for i, row in enumerate(reader):
                    if i < 3:
                        logger.info(f"DEBUG: Row {i}: {row}")
                    
                    # Handle variations in headers based on user screenshot
                    mobile_number = row.get("mobile_number") or row.get("phone_number") or row.get("Mobile Number") or row.get("Mobile number")
                    country_code = row.get("country_code") or row.get("Country Code") or "91" # Default 91 if missing
                    
                    var1 = row.get("var1", "")
                    var2 = row.get("var2", "")
                    var3 = row.get("var3", "")
                    var4 = row.get("var4", "")
                    var5 = row.get("var5", "")
                    var6 = row.get("var6", "")
                    var7 = row.get("var7", "")
                    var8 = row.get("var8", "")
                    var9 = row.get("var9", "")
                    var10 = row.get("var10", "")
                    
                    if not mobile_number:
                        logger.warning(f"Row {i} skipped: No mobile number found. Row keys: {list(row.keys())}")
                        continue
                    
                    # Sanitize
                    clean_number = str(mobile_number).strip().replace(" ", "")
                    clean_number = re.sub(r'[^0-9]', '', clean_number)
                    
                    # Validation
                    if not clean_number or len(clean_number) < 10 or len(clean_number) > 15:
                        continue
                    
                    # Duplicate Check
                    status_str = str(duplicateRemovalStatus).strip().lower()
                    if status_str in ["yes", "yse", "true", "1"]:
                        if clean_number in seen_numbers:
                            continue
                        seen_numbers.add(clean_number)
                    
                    # Prepare tuple for bulk insert
                    # (campaign_id, mobile, country_code, account_id, account_no)
                    leads_batch.append((campaign_id, clean_number, country_code,var1,var2,var3,var4,var5,var6,var7,var8,var9,var10, accountId, accountNo))
                    
                    if len(leads_batch) >= batch_size:
                        success = db_manager.insert_campaign_leads(leads_batch)
                        if success:
                            total_inserted += len(leads_batch)
                            logger.info(f"Inserted batch of {len(leads_batch)} leads. Total: {total_inserted}")
                        else:
                            logger.error("Failed to insert batch.")
                        leads_batch = [] # Reset batch
                
                # Insert remaining
                if leads_batch:
                    success = db_manager.insert_campaign_leads(leads_batch)
                    if success:
                        total_inserted += len(leads_batch)
                        logger.info(f"Inserted final batch of {len(leads_batch)} leads. Total: {total_inserted}")
                
                logger.info(f"✅ Campaign processing complete. Total leads inserted: {total_inserted}")
                    
            elif topic == 'whatsapp-auto-execute-Live':
                logger.info(f"whatsapp-auto-execute-Live Campaign Data: {data}")
                campaignName =  data.get('campaignName')
                campaignId =  data.get('campaignId')
                campaignCategory =  data.get('campaignCategory')
                templateName =  data.get('templateName')
                templateId =  data.get('templateId')
                scheduleTime =  data.get('scheduleTime')
                duplicateRemovalStatus =  data.get('duplicateRemovalStatus')
                status =  data.get('status')
                accountId =  data.get('accountId')
                accountNo =  data.get('accountNo')
                db_manager.updateCampaignStatus(campaignId,"RUNNING")
                leadDatas = db_manager.getLeadDatas(campaignId)
                logger.info(f"Lead Datas: {len(leadDatas) if leadDatas else 0} records found")
                
                if leadDatas:
                    total_tasks = len(leadDatas)
                    tracker = CampaignTracker(total_tasks, campaignId, db_manager)
                    logger.info(f"🚀 Pushing {total_tasks} campaign tasks to queue...")
                    
                    for leadData in leadDatas:
                        dst=leadData[2] # lw_mobile_number
                        logger.info(f"Processing leadData: {dst}")
                        country_code=leadData[3] # lw_country_code
                        # Access via index since we used fetchall() which returns tuples by default or dictionary if configured.
                        # Wait, the previous edit used dictionary=True in some places but getLeadDatas uses fetchall default.
                        # Using DatabaseManager.get_connection() default cursor which is MySQLCursor (tuple).
                        # Tuple indices: 
                        # 0:lw_id, 1:lw_campaign_id, 2:lw_mobile_number, 3:lw_country_code, 
                        # 4:lw_var1, 5:lw_var2, 6:lw_var3, 7:lw_var4, 8:lw_var5, 9:lw_var6, 10:lw_var7, 11:lw_var8, 12:lw_var9, 13:lw_var10, ...
                        
                        var1=leadData[4]
                        var2=leadData[5]
                        var3=leadData[6]
                        var4=leadData[7]
                        var5=leadData[8]
                        var6=leadData[9]
                        var7=leadData[10]
                        var8=leadData[11]
                        var9=leadData[12]
                        var10=leadData[13]
                        
                        # Pack args for sendCampaignMsgBulk
                        args = (templateName, templateId,var1,var2,var3,var4,var5,var6,var7,var8,var9,var10,dst, accountId, accountNo,campaignId)
                        logger.info(f"Pushing task for {dst} with args count: {len(args)}")
                        # Push tracked task
                        self.campaign_queue.put((self._tracked_worker_task, (tracker, *args), {}))
                        
                    logger.info("✅ All tasks pushed to queue.")

        except Exception as e:
            logger.error(f"Error in process_event: {e}")
            return {"error": str(e)}

    def trigger_button_reply(self, accountId, accountNo, wa_id, button_title, MasterDB):
        """Checks for configured button replies and sends an automated response."""
        try:
            custNo = str(wa_id)[-10:]
            # Find the latest campaign activity for this user
            query_filter = {
                "accountId": accountId,
                "accountNo": str(accountNo),
                "channel": "Whatsapp",
                "direction": "Outbound",
                "campaignId": {"$ne": 0},
                "$or": [
                    {"details.m_dst": f"{custNo}"},
                    {"details.m_dst": f"91{custNo}"}
                ]
            }
            sort_criteria = [("activityTimestamp", DESCENDING)]
            activity = MasterDB["activities"].find_one(query_filter, sort=sort_criteria)
            
            if not activity:
                return

            campaignId = activity.get("campaignId")
            logger.info(f"Checking automated reply for campaign {campaignId}, button '{button_title}'")
            
            orchestration_data = db_manager.getEmergencyOrchestration(campaignId)
            if not orchestration_data:
                return

            # Search all stages for a matching button reply
            stages = orchestration_data.get("stages", [])
            for stage in stages:
                wa_config = stage.get("config", {}).get("wa", {})
                button_replies = wa_config.get("buttonReplies", {})
                
                if button_title in button_replies:
                    reply_text = button_replies[button_title]
                    if reply_text and reply_text.strip():
                        logger.info(f"🚀 Triggering automated reply for campaign {campaignId}: {reply_text}")
                        self.sendWhatsAppTextMessage(accountId, accountNo, wa_id, reply_text)
                        return # Only send one reply

        except Exception as e:
            logger.error(f"Error in trigger_button_reply: {e}")

    def sendWhatsAppTextMessage(self, accountId, accountNo, dst, text):
        """Sends a simple WhatsApp text message."""
        try:
            whatsappAccount = db_manager.getWhatsappAccount(accountId)
            if not whatsappAccount:
                logger.error(f"WhatsApp account not found for accountId {accountId}")
                return
            
            phNumberId = whatsappAccount["phNumberId"]
            apiKey = whatsappAccount["apiKey"]

            url = f"https://partnersv1.pinbot.ai/v3/{phNumberId}/messages"
            headers = {
                "Content-Type": "application/json",
                "apikey": apiKey
            }
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": dst,
                "type": "text",
                "text": {"body": text}
            }

            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            logger.info(f"Automated reply sent to {dst}. Status: {resp.status_code}, Response: {resp.text}")

        except Exception as e:
            logger.error(f"Failed to send automated WhatsApp text message: {e}")

    def sendCampaignMsgBulk(self, tempName: str, tempId: str,var1:str,var2:str,var3:str,var4:str,var5:str,var6:str,var7:str,var8:str,var9:str,var10:str, dst: str, accountId: str, accountNo: str,campaignId:str) -> dict:
        try:
            # 🔹 Fetch WhatsApp Account Details (Using MySQL)
            whatsappAccount = db_manager.getWhatsappAccount(accountId)
            if not whatsappAccount:
                return {"error": "WhatsApp account not found"}
            
            phNumberId = whatsappAccount["phNumberId"]
            apiKey = whatsappAccount["apiKey"]

            phNumberId = whatsappAccount["phNumberId"]
            apiKey = whatsappAccount["apiKey"]

            logger.info(f"WhatsApp Account: {whatsappAccount}")
            

            logger.debug(f"DEBUG: tempId={tempId} (type={type(tempId)})")
            logger.debug(f"DEBUG: accountId={accountId} (type={type(accountId)})")
            logger.debug(f"DEBUG: accountNo={accountNo} (type={type(accountNo)})")

            # 🔹 Fetch template (Using PyMongo)
            client = db_manager.mongo_client
            db = client["whatsappConnecthub"]
            
            # Verify connection
            # Verify connection
            try:
                logger.debug(f"DEBUG: Collections: {db.list_collection_names()}")
            except Exception as e:
                logger.error(f"DEBUG: Connection Check Failed: {e}")

            templateLog = db["templeteDetails"]
            
            # Construct query handling potential int accountId
            query = { "templateStatus.id": tempId, "accountNo": accountNo }
            if str(accountId).isdigit():
                 query["accountId"] = int(accountId) # DB has int
            else:
                query["accountId"] = accountId


            logger.debug(f"DEBUG: Mongo Query: {query}")

            template_doc = templateLog.find_one(query)

            logger.info(f"Template Doc: {template_doc}")
            
            if not template_doc:
                # client.close()
                return {"statusCode": 404, "body": "No template found"}

            template_payload = template_doc.get("template_payload")
            template_structure = template_doc.get("template_structure")
            # client.close() # Close mongo connection

            if not template_payload:
                return {"statusCode": 400, "body": "template_payload missing"}

            # 🔹 Ensure valid JSON
            if isinstance(template_payload, str):
                try:
                    template_payload = json.loads(template_payload)
                except json.JSONDecodeError:
                    return {"statusCode": 400, "body": "Invalid JSON in template_payload"}

            # 🔹 Replace Placeholders recursively
            vars_map = {
                "${MSISDN}": dst
            }
            # Add var1 to var10 to the map
            # Explicitly mapping from arguments for clarity
            arg_vars = {
                "var1": var1, "var2": var2, "var3": var3, "var4": var4, "var5": var5,
                "var6": var6, "var7": var7, "var8": var8, "var9": var9, "var10": var10
            }
            for i in range(1, 11):
                key = f"${{variable{i}}}"
                val = arg_vars.get(f"var{i}")
                if val:
                    vars_map[key] = str(val)

            def replace_placeholders(data, is_structure=False):
                if isinstance(data, dict):
                    return {k: replace_placeholders(v, is_structure) for k, v in data.items()}
                elif isinstance(data, list):
                    return [replace_placeholders(i, is_structure) for i in data]
                elif isinstance(data, str):
                    # Replace ${variableX} style (for payload)
                    for key, val in vars_map.items():
                        if key in data:
                            data = data.replace(key, str(val))
                    
                    # If processing structure/logging, also replace {{1}} style
                    if is_structure:
                        for i in range(1, 11):
                            key_curly = f"{{{{{i}}}}}" # contracts to {{1}}
                            val = arg_vars.get(f"var{i}")
                            if val and key_curly in data:
                                data = data.replace(key_curly, str(val))
                    return data
                return data

            payload_with_dst = replace_placeholders(template_payload)
            
            # Prepare logged structure with substituted values
            template_structure_logged = replace_placeholders(template_structure, is_structure=True)

            # 🔹 Send template (Using requests)
            url = f"https://partnersv1.pinbot.ai/v3/{phNumberId}/messages"
            headers = {
                "Content-Type": "application/json",
                "apikey": apiKey # Use the apiKey fetched from the database
            }

            try:
                resp = requests.post(url, headers=headers, json=payload_with_dst, timeout=30)
                resp_text = resp.text

                logger.info(f"Api Response: {resp_text}")
                
                if resp.status_code != 200:
                    return {
                        "statusCode": resp.status_code,
                        "body": resp_text
                    }

                message_id = None
                wa_id = None
                try:
                    resp_json = resp.json()
                    messages = resp_json.get("messages", [])
                    if messages:
                        message_id = messages[0].get("id")
                    
                    contacts = resp_json.get("contacts", [])
                    if contacts:
                        wa_id = contacts[0].get("wa_id", "")
                except json.JSONDecodeError:
                    resp_json = resp_text

                activitiesLog = None
                if message_id:
                        
                    # Prepare Logs
                    ist_offset = timedelta(hours=5, minutes=30)
                    ist_timezone = timezone(ist_offset)
                    now = datetime.now(ist_timezone)
                    iso_string = now.isoformat()
                    
                    mongo_payload = {
                        "m_id": message_id,
                        "m_src": '',
                        "m_dst": wa_id,
                        "m_timestamp": time.time(),
                        "m_type": 'Template',
                        "m_receiveMsg": template_structure_logged,
                        "m_msgType": "Outbound",
                        "m_mediaUrlRaw": '',
                        "m_createdOn": iso_string
                    }
                        
                        # Fetch Agent Name (Optional, expensive to query again? db_manager doesn't give it)
                        # We can query it or just use agent ID if name not critical. 
                        # Or query it quickly:

                    activitiesLog = {                         
                        "accountId": accountId,
                        "accountNo": accountNo,
                        "leadId": '',
                        "taskId": '',
                        "conversationId":'',
                        "campaignId":campaignId,
                        "memberName": '',
                        "channel": 'Whatsapp',
                        "direction": 'Outbound',
                        "type": 'Message',
                        "activityTimestamp": iso_string,
                        "details": mongo_payload,
                        "updatedStatus": [{
                            "status": "sent",
                            "timestamp": str(int(time.time())),
                            "updatedOn": iso_string
                        }]
                    }
                    
                    # Insert into Mongo
                    client = db_manager.mongo_client
                    db = client["whatsappConnecthub"]
                    Masterdb = client["onedb"]
                    activities_col = Masterdb["activities"]
                    messageLog_col = db["messageLogs"]
                    
                    activities_col.insert_one(activitiesLog)
                    messageLog_col.insert_one(mongo_payload)
                    # client.close()
                    
                    logger.info(f"✅ Outbound message logged successfully ID : {message_id}.")

                # Convert ObjectId to str for response
                if activitiesLog and '_id' in activitiesLog:
                    activitiesLog['_id'] = str(activitiesLog['_id'])
                
                return {
                    "statusCode": 200,
                    "body": "Template sent successfully",
                    "response": activitiesLog if activitiesLog else resp_json
                }

            except Exception as req_err:
                return {"statusCode": 500, "body": str(req_err)}

        except Exception as e:
            return {
                "statusCode": 500,
                "body": str(e)
            }

    def insertMessageLog(self,accountId,accountNo,wamid,agent,timestamp,messageType,text_data,wa_id,MasterDB,collection,contactName="Unknown"):
        
        ist_offset = timedelta(hours=5, minutes=30)
        ist_timezone = timezone(ist_offset)
        now = datetime.now(ist_timezone)
        ist_formatted = now.strftime("%Y-%m-%d %H:%M:%S")
        iso_string = now.isoformat()
        
        insertValue = {
            "accountId": accountId,
            "accountNo": accountNo,
            "id": wamid,
            "src": wa_id,
            "dst": agent,
            "timestamp": timestamp,
            "type": messageType,
            "receiveMsg": text_data,
            "msgType": "Inbound",
            "assignedAt": ist_formatted
        }
        
        getAssignUsers = db_manager.getAssignUser(agent, accountId)
        if not getAssignUsers:
            logger.warning(f"No assigned users found for agent: {agent}")
            return {"error": "no_assigned_users"}
        
        userName = getAssignUsers["agentName"]
        dataReciver = getAssignUsers["socketUsers"]
        
        getLeadConversationIDs = db_manager.getLeadConversationID(agent, accountId, accountNo, wa_id)
        if not getLeadConversationIDs:
            logger.error(f"Failed to get/create lead and conversation for wa_id: {wa_id}")
            return {"error": "lead_conversation_error"}
        
        leadId = getLeadConversationIDs["leadId"]
        conversationId = getLeadConversationIDs["conversationId"]
        
        ist_offset = timedelta(hours=5, minutes=30)
        ist_timezone = timezone(ist_offset)
        now = datetime.now(ist_timezone)
        iso_string = now.isoformat()
        


        payload_content = {
            "accountId": accountId,
            "accountNo": accountNo,
            "leadId": leadId,
            "taskId": '',
            "conversationId": conversationId,
            "campaignId": 0,
            "memberName": userName,
            "channel": 'Whatsapp',
            "direction": 'Inbound',
            "type": 'Message',
            "activityTimestamp": iso_string,
            "details": {
                "m_id": wamid,
                "m_src": wa_id,
                "m_dst": agent,
                "m_timestamp": timestamp,
                "m_type": messageType,
                "m_receiveMsg": text_data,
                "m_msgType": "Inbound",
                "m_createdOn": ist_formatted
            },
            "contactName": contactName
        }
        for ext in dataReciver:
            socketData = {
                "extention": ext,
                "data": {"action": "Whatsapp"},
            }
            sentNotification = db_manager.sendFCMNotification(ext)
            print(f"Notification Token Status: {sentNotification}")

            socketData["data"]["payload"] = payload_content
            self.socket_manager.emit('message', json.dumps(socketData))
            
        activities=MasterDB["activities"]
        activities.insert_one(payload_content)                    
        collection.insert_one(insertValue)
        print(f"✅ Inserted message from {wa_id}: {text_data}")


        return {"status": "ok"}
    
    
    def insertMediaMessageLog(self,accountId,accountNo,wamid,agent,timestamp,messageType,wa_id,MasterDB,collection,fileType,mediaUrl,mediaTextCaption,contactName="Unknown"):
        
        ist_offset = timedelta(hours=5, minutes=30)
        ist_timezone = timezone(ist_offset)
        now = datetime.now(ist_timezone)
        ist_formatted = now.strftime("%Y-%m-%d %H:%M:%S")
        iso_string = now.isoformat()
        
        insertValue = {
            "accountId": accountId,
            "accountNo": accountNo,
            "id": wamid,
            "src": wa_id,
            "dst": agent,
            "timestamp": timestamp,
            "type": messageType,
            "receiveMsg": mediaUrl,
            "mediaTextCaption": mediaTextCaption,
            "fileType": fileType,
            "msgType": "Inbound",
            "assignedAt": ist_formatted
        }
        
        getAssignUsers = db_manager.getAssignUser(agent, accountId)
        if not getAssignUsers:
            logger.warning(f"No assigned users found for agent: {agent}")
            return {"error": "no_assigned_users"}
        
        userName = getAssignUsers["agentName"]
        dataReciver = getAssignUsers["socketUsers"]
        
        getLeadConversationIDs = db_manager.getLeadConversationID(agent, accountId, accountNo, wa_id)
        if not getLeadConversationIDs:
            logger.error(f"Failed to get/create lead and conversation for wa_id: {wa_id}")
            return {"error": "lead_conversation_error"}
        
        leadId = getLeadConversationIDs["leadId"]
        conversationId = getLeadConversationIDs["conversationId"]
        
        ist_offset = timedelta(hours=5, minutes=30)
        ist_timezone = timezone(ist_offset)
        now = datetime.now(ist_timezone)
        iso_string = now.isoformat()
        


        payload_content = {
            "accountId": accountId,
            "accountNo": accountNo,
            "leadId": leadId,
            "taskId": '',
            "conversationId": conversationId,
            "campaignId": 0,
            "memberName": userName,
            "channel": 'Whatsapp',
            "direction": 'Inbound',
            "type": 'Message',
            "activityTimestamp": iso_string,
            "details": {
                "m_id": wamid,
                "m_src": wa_id,
                "m_dst": agent,
                "m_timestamp": timestamp,
                "m_type": messageType,
                "m_receiveMsg": mediaUrl,
                "m_fileType": fileType,
                "m_mediaTextCaption": mediaTextCaption,
                "m_msgType": "Inbound",
                "m_createdOn": ist_formatted
            },
            "contactName": contactName
        }
        for ext in dataReciver:
            socketData = {
                "extention": ext,
                "data": {"action": "Whatsapp"},
            }

            socketData["data"]["payload"] = payload_content
            self.socket_manager.emit('message', json.dumps(socketData))
            
        activities=MasterDB["activities"]
        activities.insert_one(payload_content)                    
        collection.insert_one(insertValue)
        print(f"✅ Inserted message from {wa_id}: {mediaUrl}")


        return {"status": "ok"}
    
    
    def updateStatus(self, status, id, statusChangeTime, accountId, accountNo, MasterDB, collection, errorsDetails):
        ist_offset = timedelta(hours=5, minutes=30)
        ist_timezone = timezone(ist_offset)
        now = datetime.now(ist_timezone)
        iso_string = now.isoformat()

        status_obj = {
            "status": status,
            "timestamp": statusChangeTime,
            "updatedOn": iso_string
        }

        activities = MasterDB["activities"]

        # -------------------------
        # Build proper update payload
        # -------------------------
        if status == 'failed':
            update_payload = {
                "$push": {
                    "updatedStatus": status_obj,
                    "errorDetails": errorsDetails
                }
            }

            statusDetails=errorsDetails
        else:
            update_payload = {
                "$push": {
                    "updatedStatus": status_obj
                }
            }

            statusDetails=''

        # Prepare account ID filter to handle both int and string types
        acc_id_filter = [accountId]
        if str(accountId).isdigit():
            acc_id_filter.append(int(accountId))
            acc_id_filter.append(str(accountId))
        
        match_query = {
            "accountId": {"$in": acc_id_filter},
            "accountNo": accountNo,
            "channel": "Whatsapp",
            "details.m_id": id
        }
        
        result = activities.update_one(match_query, update_payload)
        
        

        # ----- Fetch the message correctly -----
        getMessageDetails = activities.find_one(match_query)

        if not getMessageDetails:
            print("No message found for this ID")
            return

        # Extract top-level fields
        leadId = getMessageDetails.get("leadId")
        conversationId = getMessageDetails.get("conversationId")
        memberName = getMessageDetails.get("memberName")

        # Extract nested details
        details = getMessageDetails.get("details", {})

        wamid = details.get("m_id")
        src_number = details.get("m_src")
        agent = src_number
        wa_id = details.get("m_dst")
        timestamp = details.get("m_timestamp")
        messageType = details.get("m_type")
        mediaUrl = details.get("m_receiveMsg")
        fileType = details.get("m_fileType")
        m_mediaUrlRaw = details.get("m_m_mediaUrlRaw")

        # Assigned Users
        getAssignUsers = db_manager.getAssignUser(src_number, accountId)
        if not getAssignUsers:
            print("No assigned user found")
            return

        dataReciver = getAssignUsers.get("socketUsers")



        # Prepare payload for socket
        payload_content = {
            "accountId": accountId,
            "accountNo": accountNo,
            "leadId": leadId,
            "taskId": '',
            "conversationId": conversationId,
            "campaignId": 0,
            "memberName": memberName,
            "channel": 'Whatsapp',
            "direction": 'Outbound',
            "type": 'Message',
            "activityTimestamp": iso_string,
            "details": {
                "m_id": wamid,
                "m_src": agent,
                "m_dst": wa_id,
                "m_timestamp": timestamp,
                "m_type": messageType,
                "m_receiveMsg": mediaUrl,
                "m_fileType": fileType,
                "m_msgType": "Outbound",
                "m_mediaUrlRaw": m_mediaUrlRaw,
                "m_createdOn": now.strftime("%Y-%m-%d %H:%M:%S"),
                "m_updatedStatus": status_obj,
                "m_statusDetails":statusDetails
            }
        }

        # Emit socket for each user
        for ext in dataReciver:
            socketData = {
                "extention": ext,
                "data": {
                    "action": "Whatsapp",
                    "payload": payload_content
                }
            }
            self.socket_manager.emit('message', json.dumps(socketData))

        print(result)
        return result
    
            
    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return self._stats.copy()
    
    
    def check_message_type(self, doc: Dict[str, Any]) -> str:
        """Determine whether the event is incoming or outgoing."""
        try:
            for entry in doc.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    if "messages" in value:
                        print("Detected incoming message")
                        return "incoming"
                    elif "statuses" in value:
                        print("Detected outgoing message")
                        return "outgoing"

            print("Neither 'contacts' nor 'statuses' found in value.")
            return "unknown"
        
        except Exception as e:
            print(f"Error in check_message_type: {e}")
            return "error"
        
    

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
        logger.info(f"Kafka Topics: {config.kafka_topics}")
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
                        logger.info(f"🛠️ Received message from topic: {message.topic}, offset: {message.offset}")
                        self.event_processor.process_event(eventdata, message.topic)
                    
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
