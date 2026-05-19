#!/usr/bin/env python3
"""
Kafka Consumer for FreeSWITCH ESL Events → MySQL
Optimized version with:
- Robust error handling and retry logic
- Graceful shutdown
- Batch processing
- Health check endpoint
- Better monitoring and logging
- No WebSocket/Socket.IO dependencies
"""

import os
import json
import logging
import time
import signal
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Tuple
from zoneinfo import ZoneInfo
from http.server import HTTPServer, BaseHTTPRequestHandler

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable, KafkaError
from datetime import datetime

import mysql.connector
from mysql.connector import pooling, Error as MySQLError

from config import settings
from socket_manager import socket_manager

# --------------------
# Configuration
# --------------------
@dataclass
class Config:
    # Kafka settings
    kafka_broker: str = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
    kafka_topic: str = os.getenv("KAFKA_TOPIC", "esqueueevents")
    kafka_group_id: str = os.getenv("KAFKA_GROUP_ID", "eslqueueconsumer")
    kafka_max_poll_records: int = int(os.getenv("KAFKA_MAX_POLL_RECORDS", "100"))
    kafka_auto_offset_reset: str = os.getenv("KAFKA_AUTO_OFFSET_RESET", "latest")
    kafka_session_timeout_ms: int = 30000
    kafka_heartbeat_interval_ms: int = 10000
    kafka_max_poll_interval_ms: int = 300000
    
    # MySQL settings
    mysql_pool_size: int = int(os.getenv("MYSQL_POOL_SIZE", "5"))
    mysql_pool_name: str = "esl_consumer_pool"
    
    # Processing settings
    batch_size: int = int(os.getenv("BATCH_SIZE", "50"))
    batch_timeout_seconds: float = float(os.getenv("BATCH_TIMEOUT_SECONDS", "5.0"))
    
    # Retry settings
    max_retries: int = int(os.getenv("MAX_RETRIES", "5"))
    retry_backoff_seconds: int = int(os.getenv("RETRY_BACKOFF_SECONDS", "5"))
    
    # Other settings
    timezone: ZoneInfo = ZoneInfo("Asia/Kolkata")
    health_check_port: int = int(os.getenv("HEALTH_CHECK_PORT", "8080"))
    stats_report_interval: int = int(os.getenv("STATS_REPORT_INTERVAL", "300"))

    EVENT_QUERIES = {
        'agent-offering': {
            'query': """
                INSERT INTO p_queueLogs (
                    q_eventType, q_accountNo, q_eventSubtype, q_Queue, q_Action,
                    q_member, q_memberSystem, q_memberUuid, q_memberSessionUuid,
                    p_queueCallDate
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """,
            'columns': [
                'Event-Name', 'q_accountNo', 'Event-Subclass', 'CC-Queue', 'CC-Action',
                'CC-Agent', 'CC-Agent-System', 'CC-Member-UUID',
                'CC-Member-Session-UUID', 'Event-Date-Local'
            ]
        },

        'member-queue-end': {
            'Terminated': {
                'query': """
                    INSERT INTO p_queueLogs (
                        q_eventType, q_accountNo, q_eventSubtype, q_Queue, q_Action,
                        q_hangupCause, q_cause, q_member, q_memberSystem,
                        q_memberUuid, q_memberLeavingTime, q_memberJoinedTime,
                        q_memberSessionUuid, q_cliNumber, p_queueCallDate, q_memberCidName,q_memberCidNumber
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                'columns': [
                    'Event-Name', 'q_accountNo', 'Event-Subclass', 'CC-Queue',
                    'CC-Action', 'CC-Hangup-Cause', 'CC-Cause', 'CC-Agent',
                    'CC-Agent-System', 'CC-Agent-UUID',
                    'CC-Member-Leaving-Time', 'CC-Member-Joined-Time',
                    'CC-Member-Session-UUID', 'variable_sip_h_X-cliphonenumber',
                    'Event-Date-Local', 'CC-Member-CID-Name',
                    'CC-Member-CID-Number'
                ]
            },
            'Cancel': {
                'query': """
                    INSERT INTO p_queueLogs (
                        q_eventType, q_accountNo, q_eventSubtype, q_Queue, q_Action,
                        q_cause, q_memberUuid, q_memberSessionUuid,
                        q_memberCidName, q_memberCidNumber,
                        q_memberLeavingTime, q_memberJoinedTime,
                        q_cliNumber, p_queueCallDate
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                'columns': [
                    'Event-Name', 'q_accountNo', 'Event-Subclass', 'CC-Queue',
                    'CC-Action', 'CC-Cause', 'CC-Member-UUID',
                    'CC-Member-Session-UUID', 'CC-Member-CID-Name',
                    'CC-Member-CID-Number', 'CC-Member-Leaving-Time',
                    'CC-Member-Joined-Time', 'variable_sip_h_X-cliphonenumber',
                    'Event-Date-Local'
                ]
            }
        },

        'member-queue-start': {
            'query': """
                INSERT INTO p_queueLogs (
                    q_eventType, q_accountNo, q_eventSubtype, q_Queue, q_Action,
                    q_memberUuid, q_memberSessionUuid,
                    q_memberCidName, q_memberCidNumber, p_queueCallDate, q_cliNumber
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """,
            'columns': [
                'Event-Name', 'q_accountNo', 'Event-Subclass', 'CC-Queue', 'CC-Action',
                'CC-Member-UUID', 'CC-Member-Session-UUID',
                'CC-Member-CID-Name', 'CC-Member-CID-Number', 'Event-Date-Local', 'variable_sip_h_X-cliphonenumber'
            ]
        }
    }

config = Config()

# --------------------
# Logging
# --------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("KafkaConsumer")

# --------------------
# Shutdown Management
# --------------------
shutdown_event = threading.Event()

def signal_handler(signum, frame):
    signal_name = signal.Signals(signum).name
    logger.info(f"🛑 Shutdown signal received: {signal_name}")
    shutdown_event.set()

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# --------------------
# Health Check Server
# --------------------
class HealthCheckHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'status': 'healthy',
                'shutdown': shutdown_event.is_set()
            }
            self.wfile.write(json.dumps(response).encode())
        elif self.path == '/ready':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {'status': 'ready'}
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

def start_health_server(port: int):
    """Start health check HTTP server in daemon thread"""
    try:
        server = HTTPServer(('0.0.0.0', port), HealthCheckHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        logger.info(f"✅ Health check server running on port {port}")
    except Exception as e:
        logger.warning(f"Failed to start health check server: {e}")

# --------------------
# DB Manager
# --------------------
class DatabaseManager:
    def __init__(self):
        self.pool = None
        self._lock = threading.Lock()
        self._initialize_pool()

    def _initialize_pool(self):
        """Initialize MySQL connection pool with retry logic"""
        max_attempts = 5
        for attempt in range(1, max_attempts + 1):
            try:
                self.pool = pooling.MySQLConnectionPool(
                    pool_name=config.mysql_pool_name,
                    pool_size=config.mysql_pool_size,
                    pool_reset_session=True,
                    host=settings.MYSQL_HOST,
                    user=settings.MYSQL_USERNAME,
                    password=settings.MYSQL_PASSWORD,
                    database="onedb",
                    autocommit=False,
                    connect_timeout=10
                )
                logger.info(f"✅ MySQL connection pool created (size={config.mysql_pool_size})")
                return
            except Exception as e:
                logger.error(f"DB Pool init failed (attempt {attempt}/{max_attempts}): {e}")
                if attempt < max_attempts:
                    time.sleep(5)
                else:
                    raise

    @contextmanager
    def get_conn(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = self.pool.get_connection()
            yield conn
            conn.commit()
        except MySQLError as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Unexpected error in DB operation: {e}")
            raise
        finally:
            if conn and conn.is_connected():
                conn.close()

db = DatabaseManager()

# --------------------
# Helpers
# --------------------
def safe_json_loads(data: str) -> Optional[Dict[str, Any]]:
    """Safely parse JSON data with nested string handling"""
    if not data:
        return None
    
    try:
        obj = json.loads(data)
        # Handle double-encoded JSON strings
        if isinstance(obj, str):
            obj = json.loads(obj)
        
        if not isinstance(obj, dict):
            logger.warning(f"Expected dict but got {type(obj).__name__}")
            return None
            
        return obj
    except json.JSONDecodeError as e:
        logger.debug(f"JSON decode error: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error parsing JSON: {e}")
        return None

# --------------------
# Metrics Tracker
# --------------------
class MetricsTracker:
    def __init__(self):
        self.processed = 0
        self.errors = 0
        self.db_errors = 0
        self.skipped = 0
        self.last_processed_time = time.time()
        self.lock = threading.Lock()
    
    def increment_processed(self, count: int = 1):
        with self.lock:
            self.processed += count
            self.last_processed_time = time.time()
    
    def increment_errors(self, count: int = 1):
        with self.lock:
            self.errors += count
    
    def increment_db_errors(self, count: int = 1):
        with self.lock:
            self.db_errors += count
    
    def increment_skipped(self, count: int = 1):
        with self.lock:
            self.skipped += count
    
    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            return {
                'processed': self.processed,
                'errors': self.errors,
                'db_errors': self.db_errors,
                'skipped': self.skipped,
                'last_processed': datetime.fromtimestamp(self.last_processed_time).isoformat()
            }

metrics = MetricsTracker()

# --------------------
# Event Processor
# --------------------
class EventProcessor:
    def __init__(self, batch_size: int = 50, batch_timeout: float = 5.0):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.pending: List[Tuple[Dict, Dict]] = []
        self.last_flush_time = time.time()
        self.lock = threading.Lock()
        
    def process(self, event: Dict[str, Any]) -> bool:
        """Process a single event, returns True if successful"""
        try:
            logger.info(event)
            ccAction = event.get("CC-Action")
            if ccAction not in config.EVENT_QUERIES:
                logger.debug(f"Skipping unsupported action: {ccAction}")
                metrics.increment_skipped()
                return False

            # Parse queue and account number
            queue_full = event.get("CC-Queue", "")
            if "@" in queue_full:
                qQueue, aAccountNo = queue_full.split("@", 1)
            else:
                qQueue, aAccountNo = queue_full, None
            event["q_accountNo"] = aAccountNo
            event["CC-Queue"] = qQueue

            # Parse member/agent
            member_full = event.get("CC-Agent")
            if member_full and "@" in member_full:
                qMember = member_full.split("@", 1)[0]
            else:
                qMember = member_full
            event["CC-Agent"] = qMember

            # Handle member-queue-end with subtypes
            if ccAction == "member-queue-end":
                ccResult = event.get("CC-Cause", "")
                subtype = "Terminated" if ccResult == "Terminated" else "Cancel"
                query_info = config.EVENT_QUERIES[ccAction].get(subtype)
                if not query_info:
                    logger.warning(f"No query found for member-queue-end subtype={subtype}")
                    metrics.increment_skipped()
                    return False
            else:
                query_info = config.EVENT_QUERIES[ccAction]
            
            with self.lock:
                self.pending.append((query_info, event))
                
                # Check if we should flush
                should_flush = (
                    len(self.pending) >= self.batch_size or
                    (time.time() - self.last_flush_time) >= self.batch_timeout
                )
                
            if should_flush:
                self.flush()
            
            # Update live member state
            self.handle_live_state(event, ccAction)

            return True

        except Exception as e:
            logger.error(f"Event processing error: {e}", exc_info=True)
            metrics.increment_errors()
            return False

    def handle_live_state(self, event: Dict[str, Any], action: str):
        """Handle real-time updates for p_live_queue_members table"""
        try:
            member_uuid = event.get("CC-Member-UUID")
            if not member_uuid:
                return

            queue = event.get("CC-Queue")
            account = event.get("q_accountNo") or "unknown"
            agent_id = event.get("CC-Agent") or None
            
            # DEBUG PRINT
            print(f"[{action}] Live State: UUID={member_uuid} Queue={queue} Agent={agent_id}")

            # Define queries based on action
            if action == "member-queue-start":
                # Note: agent_id is usually null at start, but we include it if present
                query = """
                    INSERT INTO p_live_queue_members 
                    (member_uuid, queue_name, account_no, agent_id, status, joined_time)
                    VALUES (%s, %s, %s, %s, 'WAITING', NOW())
                    ON DUPLICATE KEY UPDATE status='WAITING', agent_id=%s, updated_time=NOW()
                """
                params = (member_uuid, queue, account, agent_id, agent_id)
                
            elif action == "agent-offering":
                # User Request: Remove from table immediately when agent is offering/ringing
                # because it is no longer strictly "waiting"
                query = "DELETE FROM p_live_queue_members WHERE member_uuid = %s"
                params = (member_uuid,)
                
            elif action == "member-queue-end":
                query = "DELETE FROM p_live_queue_members WHERE member_uuid = %s"
                params = (member_uuid,)
            
            else:
                return

            # Execute immediately (not batched) for real-time accuracy
            with db.get_conn() as conn:
                cur = conn.cursor()
                cur.execute(query, params)
                cur.close()
            
            print(f"✅ [{action}] DB Update Success")

            # ----------------------------------------
            # Socket Integration: Notify Assigned Agents
            # ----------------------------------------
            try:
                # We need queue name (e.g. 10@1001 or just 10) to find assigned agents
                # Queue format in p_queuegroups is mapped via q_queuegroupId + q_accountNo
                 
                if queue and account != "unknown":
                    # queue variable comes from event["CC-Queue"] which is already processed in process() method
                    # to strip the domain part (e.g. "10@1001" -> "10")
                    queue_id_str = queue 
                    
                    # Find all agents assigned to this queue
                    # QueueGroups table: q_queuegroupId, q_accountNo, q_memberExtensionNo
                    agent_query = """
                        SELECT q_memberExtensionNo 
                        FROM p_queuegroups 
                        WHERE q_queuegroupId = %s AND q_accountNo = %s
                    """
                    
                    with db.get_conn() as conn:
                        cur = conn.cursor()
                        cur.execute(agent_query, (queue_id_str, account))
                        assigned_agents = cur.fetchall() # List of tuples, e.g. [('1001',), ('1002',)]
                        cur.close()
                    
                    if assigned_agents:
                        print(f"📡 Emitting QUEUE_STATS to {len(assigned_agents)} agents for queue {queue}")
                        for (ext,) in assigned_agents:
                            # Parse extension from format "1234@domain.com"
                            ext_str = str(ext).split('@')[0]
                            payload = {
                                "extention": int(ext_str),
                                "data": {
                                    "action": "QUEUE_STATS"
                                }
                            }
                            print(f"📤 Payload: {payload}")
                            socket_manager.emit("message", payload)
                            
            except Exception as se:
                print(f"⚠️ Socket Emit Error: {se}")
                logger.error(f"Socket Emit Error: {se}")
                
        except Exception as e:
            # Log but don't stop processing (it's just stats)
            print(f"❌ Failed to update live state for {action}: {e}")
            logger.error(f"Failed to update live state for {action}: {e}")
            
    def flush(self) -> int:
        """Flush pending events to database, returns number of records inserted"""
        with self.lock:
            if not self.pending:
                return 0
            
            batch = self.pending.copy()
            self.pending = []
            self.last_flush_time = time.time()
        
        inserted_count = 0
        try:
            with db.get_conn() as conn:
                cur = conn.cursor()
                
                for query_info, event in batch:
                    try:
                        values = [event.get(c) for c in query_info["columns"]]
                        cur.execute(query_info["query"], tuple(values))
                        inserted_count += 1
                    except Exception as e:
                        logger.error(
                            f"Failed to insert record for action {event.get('CC-Action')}: {e}"
                        )
                        metrics.increment_db_errors()
                
                cur.close()
            
            if inserted_count > 0:
                logger.info(f"✅ Inserted {inserted_count}/{len(batch)} records to DB")
                metrics.increment_processed(inserted_count)
            
            return inserted_count
            
        except Exception as e:
            logger.error(f"Batch insert error: {e}", exc_info=True)
            metrics.increment_db_errors()
            return inserted_count
    
    def force_flush(self):
        """Force flush all pending events (for shutdown)"""
        count = self.flush()
        if count > 0:
            logger.info(f"Final flush completed: {count} records")

processor = EventProcessor(
    batch_size=config.batch_size,
    batch_timeout=config.batch_timeout_seconds
)

# --------------------
# Kafka Consumer Loop
# --------------------
def run_consumer():
    """Main consumer loop with retry logic"""
    retry_count = 0
    consumer = None
    
    while not shutdown_event.is_set() and retry_count < config.max_retries:
        try:
            logger.info(f"Connecting to Kafka (attempt {retry_count + 1}/{config.max_retries})...")
            
            consumer = KafkaConsumer(
                config.kafka_topic,
                bootstrap_servers=[config.kafka_broker],
                group_id=config.kafka_group_id,
                enable_auto_commit=True,
                auto_commit_interval_ms=5000,
                auto_offset_reset=config.kafka_auto_offset_reset,
                session_timeout_ms=config.kafka_session_timeout_ms,
                heartbeat_interval_ms=config.kafka_heartbeat_interval_ms,
                max_poll_interval_ms=config.kafka_max_poll_interval_ms,
                max_poll_records=config.kafka_max_poll_records,
                value_deserializer=lambda m: m.decode('utf-8', errors='ignore') if m else None
            )
            
            logger.info(f"✅ Kafka connected to topic: {config.kafka_topic}")
            logger.info(f"📊 Group ID: {config.kafka_group_id}")
            retry_count = 0
            
            # Main processing loop
            logger.info("🔄 Listening for events...")
            while not shutdown_event.is_set():
                try:
                    message_batch = consumer.poll(timeout_ms=1000)
                    
                    if not message_batch:
                        if processor.pending:
                            processor.flush()
                        continue
                    
                    # Process all messages in the batch
                    for topic_partition, messages in message_batch.items():
                        for message in messages:
                            if shutdown_event.is_set():
                                break
                            
                            if not message.value:
                                continue
                            
                            # Parse event data
                            eventdata = safe_json_loads(message.value)
                            if eventdata:
                                processor.process(eventdata)
                        
                        if shutdown_event.is_set():
                            break
                    
                except Exception as e:
                    logger.error(f"Error processing messages: {e}", exc_info=True)
                    metrics.increment_errors()
                    time.sleep(1)
            
            logger.info("Shutdown detected, finishing processing...")
            break
            
        except NoBrokersAvailable:
            retry_count += 1
            backoff = config.retry_backoff_seconds * retry_count
            logger.error(f"❌ Kafka broker unavailable (attempt {retry_count}/{config.max_retries})")
            if retry_count < config.max_retries:
                logger.info(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)
            
        except KafkaError as e:
            logger.error(f"Kafka error: {e}", exc_info=True)
            retry_count += 1
            if retry_count < config.max_retries:
                time.sleep(config.retry_backoff_seconds)
            
        except Exception as e:
            logger.error(f"Unexpected error in consumer loop: {e}", exc_info=True)
            retry_count += 1
            if retry_count < config.max_retries:
                time.sleep(config.retry_backoff_seconds)
        
        finally:
            if consumer:
                try:
                    consumer.close()
                    logger.info("Kafka consumer closed")
                except Exception as e:
                    logger.error(f"Error closing consumer: {e}")
                consumer = None
    
    # Final cleanup
    processor.force_flush()
    
    # Log final metrics
    stats = metrics.get_stats()
    logger.info("=" * 60)
    logger.info("📊 Final Statistics")
    logger.info(f"Processed: {stats['processed']}")
    logger.info(f"Errors: {stats['errors']}")
    logger.info(f"DB Errors: {stats['db_errors']}")
    logger.info(f"Skipped: {stats['skipped']}")
    logger.info("=" * 60)
    
    if retry_count >= config.max_retries:
        logger.error("❌ Max retries exceeded, exiting")
        return 1
    
    logger.info("✅ Consumer shutdown complete")
    return 0

# --------------------
# Periodic Flush Thread
# --------------------
def periodic_flush():
    """Background thread to ensure periodic flushing"""
    while not shutdown_event.is_set():
        time.sleep(config.batch_timeout_seconds)
        if processor.pending:
            processor.flush()

# --------------------
# Stats Reporter Thread
# --------------------
def stats_reporter():
    """Periodically log statistics"""
    while not shutdown_event.is_set():
        time.sleep(config.stats_report_interval)
        if shutdown_event.is_set():
            break
        
        stats = metrics.get_stats()
        logger.info("=" * 60)
        logger.info("📊 Statistics Report")
        logger.info(f"Processed: {stats['processed']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info(f"DB Errors: {stats['db_errors']}")
        logger.info(f"Skipped: {stats['skipped']}")
        logger.info(f"Last Processed: {stats['last_processed']}")
        logger.info("=" * 60)

# --------------------
# Main Entry Point
# --------------------
if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Kafka Consumer for FreeSWITCH ESL Events Starting...")
    logger.info(f"Kafka Broker: {config.kafka_broker}")
    logger.info(f"Kafka Topic: {config.kafka_topic}")
    logger.info(f"Group ID: {config.kafka_group_id}")
    logger.info(f"Batch Size: {config.batch_size}")
    logger.info(f"Auto Offset Reset: {config.kafka_auto_offset_reset}")
    logger.info("=" * 60)
    
    # Start health check server
    start_health_server(config.health_check_port)
    
    # Start periodic flush thread
    flush_thread = threading.Thread(target=periodic_flush, daemon=True, name="PeriodicFlush")
    flush_thread.start()
    logger.info("Started thread: PeriodicFlush")
    
    # Start stats reporter thread
    stats_thread = threading.Thread(target=stats_reporter, daemon=True, name="StatsReporter")
    stats_thread.start()
    logger.info("Started thread: StatsReporter")
    
    # Start Socket Connection
    token = socket_manager.get_access_token()
    if token:
        socket_manager.set_access_token(token)
        threading.Thread(target=socket_manager.connect, daemon=True).start()
        logger.info("✅ Socket Manager Connected")
    
    # Run consumer
    exit_code = run_consumer()
    
    # Wait a moment for final cleanup
    time.sleep(1)
    
    exit(exit_code)
