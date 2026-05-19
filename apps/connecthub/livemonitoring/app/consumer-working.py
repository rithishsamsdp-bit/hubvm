#!/usr/bin/env python3
"""
FreeSWITCH ESL Kafka Consumer → MySQL  (Production)
====================================================
Handles:
  - sofia::register       → agent LOGIN
  - sofia::unregister     → agent LOGOUT (explicit)
  - sofia::expire         → agent LOGOUT (TTL)
  - callcenter::info      → queue counters + agent CC status
  - CHANNEL_CALLSTATE     → live call tracking

Socket.IO events emitted:
  agent:register          – agent came online
  agent:unregister        – agent explicitly logged out
  agent:expire            – agent registration expired
  agent:status            – callcenter agent-status-change
  queue:update            – any queue counter mutation
  call:update             – live call state change
"""

import json
import logging
import signal
import threading
import time
from contextlib import contextmanager
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo
import pytz
import redis as redis_lib
from kafka import KafkaConsumer
from kafka.errors import KafkaError, NoBrokersAvailable
from mysql.connector import Error as MySQLError
from mysql.connector import pooling

from config import settings
from socket_manager import socket_manager

# ─────────────────────────────────────────
# Logging
# ─────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("KafkaConsumer")

# ─────────────────────────────────────────
# Graceful shutdown
# ─────────────────────────────────────────
shutdown_event = threading.Event()


def _signal_handler(signum, frame):
    logger.info(f"Signal {signum} received — shutting down")
    shutdown_event.set()


signal.signal(signal.SIGINT,  _signal_handler)
signal.signal(signal.SIGTERM, _signal_handler)

# ─────────────────────────────────────────
# Socket.IO event name constants
# ─────────────────────────────────────────
SOCKET_AGENT_REGISTER   = "agent:register"
SOCKET_AGENT_UNREGISTER = "agent:unregister"
SOCKET_AGENT_EXPIRE     = "agent:expire"
SOCKET_AGENT_STATUS     = "agent:status"
SOCKET_QUEUE_UPDATE     = "queue:update"
SOCKET_CALL_UPDATE      = "call:update"


# ─────────────────────────────────────────
# Health-check HTTP server
# ─────────────────────────────────────────
class HealthCheckHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/health":
            healthy = not shutdown_event.is_set()
            body = json.dumps({
                "status":     "healthy" if healthy else "unhealthy",
                "shutdown":   shutdown_event.is_set(),
                "components": {
                    "database": "connected" if db.pool else "disconnected",
                    "socket":   "connected" if socket_manager.is_connected else "disconnected",
                },
            }).encode()
            self.send_response(200 if healthy else 503)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/ready":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ready"}')
        else:
            self.send_response(404)
            self.end_headers()


def start_health_server(port: int):
    try:
        server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
        threading.Thread(target=server.serve_forever, daemon=True, name="HealthServer").start()
        logger.info(f"✅ Health server listening on :{port}")
    except Exception as exc:
        logger.warning(f"Health server failed to start: {exc}")


# ─────────────────────────────────────────
# Database manager
# ─────────────────────────────────────────
class DatabaseManager:
    def __init__(self):
        self.pool: Optional[pooling.MySQLConnectionPool] = None
        self._init_pool()

    def _init_pool(self):
        for attempt in range(1, 6):
            try:
                self.pool = pooling.MySQLConnectionPool(
                    pool_name="esl_pool",
                    pool_size=settings.MYSQL_POOL_SIZE,
                    pool_reset_session=True,
                    host=settings.MYSQL_HOST,
                    user=settings.MYSQL_USERNAME,
                    password=settings.MYSQL_PASSWORD,
                    database=settings.MYSQL_DATABASE,
                    autocommit=False,
                    connect_timeout=10,
                )
                logger.info(f"✅ MySQL pool ready  size={settings.MYSQL_POOL_SIZE}")
                return
            except Exception as exc:
                logger.error(f"DB pool init attempt {attempt}/5: {exc}")
                if attempt < 5:
                    time.sleep(5)
                else:
                    raise

    @contextmanager
    def get_conn(self):
        conn = None
        try:
            conn = self.pool.get_connection()
            yield conn
            conn.commit()
        except MySQLError as exc:
            if conn:
                conn.rollback()
            logger.error(f"MySQL error: {exc}")
            raise
        except Exception as exc:
            if conn:
                conn.rollback()
            logger.error(f"Unexpected DB error: {exc}")
            raise
        finally:
            if conn and conn.is_connected():
                conn.close()


db = DatabaseManager()


# ─────────────────────────────────────────
# Redis manager
# ─────────────────────────────────────────
class RedisManager:
    def __init__(self):
        self._pool: Optional[redis_lib.ConnectionPool] = None
        self._init_pool()

    def _init_pool(self):
        for attempt in range(1, 6):
            try:
                self._pool = redis_lib.ConnectionPool(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=settings.REDIS_DB,
                    password=settings.REDIS_PASSWORD or None,
                    max_connections=settings.REDIS_POOL_SIZE,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                )
                self._client().ping()
                logger.info(
                    f"✅ Redis pool ready  "
                    f"host={settings.REDIS_HOST}:{settings.REDIS_PORT}  db={settings.REDIS_DB}"
                )
                return
            except Exception as exc:
                logger.error(f"Redis pool init attempt {attempt}/5: {exc}")
                if attempt < 5:
                    time.sleep(5)
                else:
                    logger.warning("⚠️  Redis unavailable — dedup/cache disabled")
                    self._pool = None

    def _client(self) -> redis_lib.Redis:
        return redis_lib.Redis(connection_pool=self._pool)

    @property
    def available(self) -> bool:
        return self._pool is not None

    def is_duplicate(self, call_id: str) -> bool:
        if not self.available or not call_id:
            return False
        try:
            return self._client().exists(f"reg:dedup:{call_id}") == 1
        except Exception as exc:
            logger.warning(f"Redis exists check failed: {exc}")
            return False

    def mark_registered(self, call_id: str):
        if not self.available or not call_id:
            return
        try:
            self._client().setex(f"reg:dedup:{call_id}", settings.REDIS_DEDUP_TTL_SECONDS, "1")
        except Exception as exc:
            logger.warning(f"Redis setex failed: {exc}")

    def remove_registration(self, call_id: str):
        if not self.available or not call_id:
            return
        try:
            self._client().delete(f"reg:dedup:{call_id}")
        except Exception as exc:
            logger.warning(f"Redis delete failed: {exc}")


cache = RedisManager()


# ─────────────────────────────────────────
# Pure helper functions
# ─────────────────────────────────────────
def safe_json_loads(data: str) -> Optional[Dict[str, Any]]:
    if not data:
        return None
    try:
        obj = json.loads(data)
        if isinstance(obj, str):
            obj = json.loads(obj)
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


def extract_registration_fields(event: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "username":       event.get("username")    or event.get("from-user")    or event.get("User"),
        "realm":          event.get("realm")        or event.get("from-host")    or event.get("Realm"),
        "network_ip":     event.get("network-ip")   or event.get("network_ip")   or event.get("FreeSWITCH-IPv4"),
        "network_port":   event.get("network-port") or event.get("network_port"),
        "contact":        event.get("contact")      or event.get("Contact"),
        "sip_user_agent": event.get("user-agent")   or event.get("sip_user_agent") or event.get("User-Agent"),
        "expires":        event.get("expires")      or event.get("Expires"),
        "profile_name":   event.get("profile-name") or event.get("profile_name"),
        "event_date_gmt": event.get("Event-Date-GMT"),
    }


def now_ist() -> datetime:
    return datetime.now(pytz.timezone("Asia/Kolkata"))


def safe_emit(event_name: str, payload: Dict[str, Any], agent_ext: str = None) -> None:
    """Fire-and-forget socket emit — never raises, always logs on failure."""
    if not agent_ext:
        logger.warning(f"[SOCKET] emit skipped [{event_name}]: empty agent_ext")
        return
    try:
        ext_id = agent_ext[:-4] if len(agent_ext) > 4 else agent_ext
        data = {"data": payload, "extension": agent_ext, "id": ext_id}
        socket_manager.emit("message", data)
        logger.debug(f"[SOCKET] emitted {event_name} agent={agent_ext}")
    except Exception as exc:
        logger.warning(f"[SOCKET] emit failed [{event_name}]: {exc}")


def _fetch_queue_snapshot(cursor, queue_id: str) -> Optional[Dict[str, Any]]:
    """Read the current p_liveQueueMonitoring row after a counter update."""
    cursor.execute("""
        SELECT l_queueId, l_queueName, l_accountId, l_accountNo,
               l_waitingCalls, l_usersInCall, l_idleUsers,
               l_activeUsers, l_abandonedCalls
        FROM   p_liveQueueMonitoring
        WHERE  l_queueId = %s
    """, (queue_id,))
    return cursor.fetchone()


def _build_queue_payload(snap: Dict, action: str, ts: str,
                          extra: Optional[Dict] = None) -> Dict[str, Any]:
    """Build the canonical queue:update socket payload with integer-guaranteed counters."""
    payload: Dict[str, Any] = {
        "event":          SOCKET_QUEUE_UPDATE,
        "action":         action,
        "queueId":        str(snap.get("l_queueId", "")),
        "queueName":      snap.get("l_queueName", ""),
        "accountId":      snap.get("l_accountId", ""),
        "accountNo":      snap.get("l_accountNo", ""),
        "waitingCalls":   int(snap.get("l_waitingCalls",   0) or 0),
        "usersInCall":    int(snap.get("l_usersInCall",    0) or 0),
        "idleUsers":      int(snap.get("l_idleUsers",      0) or 0),
        "activeUsers":    int(snap.get("l_activeUsers",    0) or 0),
        "abandonedCalls": int(snap.get("l_abandonedCalls", 0) or 0),
        "timestamp":      ts,
    }
    if extra:
        payload.update(extra)
    return payload


# ─────────────────────────────────────────
# Metrics tracker
# ─────────────────────────────────────────
class MetricsTracker:
    def __init__(self):
        self.processed = self.errors = self.db_errors = self.skipped = 0
        self.last_processed_time = time.time()
        self._lock = threading.Lock()

    def increment_processed(self, n: int = 1):
        with self._lock:
            self.processed += n
            self.last_processed_time = time.time()

    def increment_errors(self, n: int = 1):
        with self._lock:
            self.errors += n

    def increment_db_errors(self, n: int = 1):
        with self._lock:
            self.db_errors += n

    def increment_skipped(self, n: int = 1):
        with self._lock:
            self.skipped += n

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "processed":      self.processed,
                "errors":         self.errors,
                "db_errors":      self.db_errors,
                "skipped":        self.skipped,
                "last_processed": datetime.fromtimestamp(self.last_processed_time).isoformat(),
            }


metrics = MetricsTracker()

PendingItem = Tuple[str, tuple, Optional[str], Dict]


# ─────────────────────────────────────────
# Event Processor
# ─────────────────────────────────────────
class EventProcessor:
    def __init__(self, batch_size: int = 50, batch_timeout: float = 5.0):
        self.batch_size    = batch_size
        self.batch_timeout = batch_timeout
        self.pending: List[PendingItem] = []
        self.last_flush_time = time.time()
        self._lock = threading.Lock()

    def process(self, event: Dict[str, Any]) -> bool:
        try:
            event_name  = event.get("Event-Name", "")
            event_sub   = event.get("Event-Subclass", "")
            routing_key = event_sub if event_sub else event_name

            if   routing_key == "sofia::register":   return self._handle_register(event)
            elif routing_key == "sofia::unregister":  return self._handle_unregister(event)
            elif routing_key == "sofia::expire":      return self._handle_expire(event)
            elif event_name  == "CHANNEL_CALLSTATE":  return self._handle_channel_callstate(event)
            elif event_sub   == "callcenter::info":   return self._handle_callcenter_info(event)
            else:
                logger.debug(f"Unhandled event: {routing_key!r}")
                metrics.increment_skipped()
                return True
        except Exception as exc:
            logger.error(f"Event routing error: {exc}", exc_info=True)
            metrics.increment_errors()
            return False

    # ─── Shared member DB helper ──────────────────────────────────────────────
    def _archive_and_update_member(
        self, cursor, member_ext: str, new_status: str,
        new_live_status: str, ist, now: datetime,
    ) -> Optional[str]:
        cursor.execute("""
            SELECT m_status, m_statusTime, m_memberId,
                   m_accountId, m_accountNo, m_memberExtensionNo
            FROM   p_members
            WHERE  m_memberExtensionNo = %s
        """, (member_ext,))
        member = cursor.fetchone()

        if not member:
            logger.warning(f"No member found for extension {member_ext!r}")
            metrics.increment_skipped()
            return None

        old_status      = (member["m_status"] or "").strip().upper()
        old_status_time = member["m_statusTime"]
        member_id       = member["m_memberId"]
        account_id      = member["m_accountId"]
        account_no      = member["m_accountNo"]
        member_ext_no   = member["m_memberExtensionNo"]

        BLOCKED = {"BREAK", "QUERY", "LUNCH", "MEETING"}
        if old_status in BLOCKED:
            logger.info(f"Skipping — agent {member_ext!r} in manual state {old_status!r}")
            metrics.increment_skipped()
            return None

        if old_status_time is not None:
            if old_status_time.tzinfo is None:
                old_status_time = ist.localize(old_status_time)
            duration = max(0, int((now - old_status_time).total_seconds()))
            cursor.execute("""
                INSERT INTO p_agentstatus
                    (a_memberId, a_accountId, a_accountNo, a_memberExtensionNo,
                     a_status, a_startTime, a_endTime, a_durationSeconds)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (member_id, account_id, account_no, member_ext_no,
                  old_status, old_status_time, now, duration))

        cursor.execute("""
            UPDATE p_members SET m_status = %s, m_statusTime = %s
            WHERE  m_memberExtensionNo = %s
        """, (new_status, now, member_ext))

        cursor.execute("""
            UPDATE p_liveMonitoring SET l_memberStatus = %s
            WHERE  l_memberExtention = %s
        """, (new_live_status, member_ext))

        return old_status

    # ─── sofia::register ──────────────────────────────────────────────────────
    def _handle_register(self, event: Dict[str, Any]) -> bool:
        fields    = extract_registration_fields(event)
        agent_ext = fields.get("username")
        call_id   = event.get("call-id") or event.get("Call-ID") or event.get("call_id")

        if call_id and cache.is_duplicate(call_id):
            metrics.increment_skipped()
            return True

        ist = pytz.timezone("Asia/Kolkata")
        ts  = now_ist()

        try:
            with db.get_conn() as conn:
                cursor = conn.cursor(dictionary=True)
                old_status = self._archive_and_update_member(
                    cursor, agent_ext, "LOGIN", "AVAILABLE", ist, ts)
                cursor.close()
                if old_status is None:
                    return True
            if call_id:
                cache.mark_registered(call_id)
            metrics.increment_processed()
            logger.info(f"[REGISTER] ✅ Agent={agent_ext} {old_status}→LOGIN")
        except Exception as exc:
            logger.error(f"[REGISTER] DB error agent={agent_ext}: {exc}", exc_info=True)
            metrics.increment_db_errors()
            return False

        safe_emit(SOCKET_AGENT_REGISTER, {
            "type":      "AgentPresence",
            "extension":   agent_ext,
            "status":     "AVAILABLE",
            "memberCustomerNumber": "",
            "memberCliNumberId": "",
            "memberCallDirection":"",
            "memberServerIp": "",
            "nowIst": datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S"),
        }, agent_ext)
        return True

    # ─── sofia::unregister / expire ───────────────────────────────────────────
    def _handle_logout(self, event: Dict[str, Any], label: str, socket_event: str) -> bool:
        fields    = extract_registration_fields(event)
        agent_ext = fields.get("username")
        call_id   = event.get("call-id") or event.get("Call-ID") or event.get("call_id")

        if call_id:
            cache.remove_registration(call_id)

        ist = pytz.timezone("Asia/Kolkata")
        ts  = now_ist()

        try:
            with db.get_conn() as conn:
                cursor = conn.cursor(dictionary=True)
                old_status = self._archive_and_update_member(
                    cursor, agent_ext, "LOGOUT", "UNAVAILABLE", ist, ts)
                cursor.close()
                if old_status is None:
                    return True
            metrics.increment_processed()
            logger.info(f"[{label}] ✅ Agent={agent_ext} {old_status}→LOGOUT")
        except Exception as exc:
            logger.error(f"[{label}] DB error agent={agent_ext}: {exc}", exc_info=True)
            metrics.increment_db_errors()
            return False

        safe_emit(socket_event, {
            "type":      "AgentPresence",
            "extension":   agent_ext,
            "status":     "UNAVAILABLE",
            "memberCustomerNumber": "",
            "memberCliNumberId": "",
            "memberCallDirection":"",
            "memberServerIp": "",
            "nowIst": datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S"),
        }, agent_ext)
        return True

    def _handle_unregister(self, event: Dict[str, Any]) -> bool:
        return self._handle_logout(event, "UNREGISTER", SOCKET_AGENT_UNREGISTER)

    def _handle_expire(self, event: Dict[str, Any]) -> bool:
        return self._handle_logout(event, "EXPIRE", SOCKET_AGENT_EXPIRE)

    # ─── callcenter::info dispatcher ─────────────────────────────────────────
    def _handle_callcenter_info(self, event: Dict[str, Any]) -> bool:
        cc_action     = event.get("CC-Action", "")
        queue_id_full = event.get("CC-Queue",  "")
        agent_full    = event.get("CC-Agent",  "")
        agent_ext     = agent_full.split("@")[0]    if agent_full    else ""
        queue_id      = queue_id_full.split("@")[0] if queue_id_full else ""

        if not cc_action:
            return True

        logger.info(f"[CC] Action={cc_action}  Queue={queue_id or '-'}  Agent={agent_ext or '-'}")

        if cc_action == "agent-state-change":
            return True
        if cc_action == "agent-status-change":
            return self._cc_agent_status_change(event, agent_ext)

        if not queue_id:
            metrics.increment_skipped()
            return True

        try:
            acc_id, acc_no, queue_name = self._get_queue_info(queue_id)
            if acc_id is None:
                return True
            adminext = acc_id + "1000"
            ts = now_ist().isoformat()

            with db.get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO p_liveQueueMonitoring
                        (l_accountId, l_accountNo, l_queueId, l_queueName)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE l_queueName = VALUES(l_queueName)
                """, (acc_id, acc_no, queue_id, queue_name))

            if cc_action == "member-queue-start":
                with db.get_conn() as conn:
                    cursor = conn.cursor(dictionary=True)
                    cursor.execute("""
                        UPDATE p_liveQueueMonitoring
                        SET    l_waitingCalls = l_waitingCalls + 1
                        WHERE  l_queueId = %s
                    """, (queue_id,))
                    snap = _fetch_queue_snapshot(cursor, queue_id)
                logger.info(f"[CC] Queue={queue_id} waitingCalls+1")
                if snap:
                    safe_emit(SOCKET_QUEUE_UPDATE,
                              _build_queue_payload(snap, "member-queue-start", ts), adminext)

            elif cc_action == "member-queue-end":
                cc_cause         = event.get("CC-Cause", "")
                cc_cancel_reason = event.get("CC-Cancel-Reason", "")

                if cc_cause == "Terminated":
                    logger.info(f"[CC] Queue={queue_id} Terminated — defer to bridge-agent-start")

                elif cc_cause == "Cancel":
                    with db.get_conn() as conn:
                        cursor = conn.cursor(dictionary=True)
                        cursor.execute("""
                            UPDATE p_liveQueueMonitoring
                            SET    l_waitingCalls   = CASE WHEN l_waitingCalls  > 0
                                                          THEN l_waitingCalls  - 1 ELSE 0 END,
                                   l_abandonedCalls = l_abandonedCalls + 1
                            WHERE  l_queueId = %s
                        """, (queue_id,))
                        snap = _fetch_queue_snapshot(cursor, queue_id)
                    logger.info(f"[CC] Queue={queue_id} Cancel({cc_cancel_reason}) waitingCalls-1 abandonedCalls+1")
                    if snap:
                        safe_emit(SOCKET_QUEUE_UPDATE, _build_queue_payload(
                            snap, "member-queue-end-cancel", ts,
                            extra={"cancelReason": cc_cancel_reason}), adminext)
                else:
                    with db.get_conn() as conn:
                        cursor = conn.cursor(dictionary=True)
                        cursor.execute("""
                            UPDATE p_liveQueueMonitoring
                            SET    l_waitingCalls = CASE WHEN l_waitingCalls > 0
                                                        THEN l_waitingCalls - 1 ELSE 0 END
                            WHERE  l_queueId = %s
                        """, (queue_id,))
                        snap = _fetch_queue_snapshot(cursor, queue_id)
                    logger.info(f"[CC] Queue={queue_id} waitingCalls-1 (cause={cc_cause!r})")
                    if snap:
                        safe_emit(SOCKET_QUEUE_UPDATE,
                                  _build_queue_payload(snap, "member-queue-end-unknown", ts), adminext)

            elif cc_action == "bridge-agent-start":
                with db.get_conn() as conn:
                    cursor = conn.cursor(dictionary=True)
                    cursor.execute("""
                        UPDATE p_liveQueueMonitoring
                        SET    l_waitingCalls = CASE WHEN l_waitingCalls > 0
                                                    THEN l_waitingCalls - 1 ELSE 0 END,
                               l_usersInCall  = l_usersInCall + 1,
                               l_idleUsers    = CASE WHEN l_idleUsers    > 0
                                                    THEN l_idleUsers    - 1 ELSE 0 END
                        WHERE  l_queueId = %s
                    """, (queue_id,))
                    snap = _fetch_queue_snapshot(cursor, queue_id)
                logger.info(f"[CC] Queue={queue_id} waitingCalls-1 usersInCall+1 idleUsers-1")
                if snap:
                    safe_emit(SOCKET_QUEUE_UPDATE, _build_queue_payload(
                        snap, "bridge-agent-start", ts,
                        extra={"agentExt": agent_ext}), adminext)

            elif cc_action == "bridge-agent-end":
                with db.get_conn() as conn:
                    cursor = conn.cursor(dictionary=True)
                    cursor.execute("""
                        UPDATE p_liveQueueMonitoring
                        SET    l_usersInCall = CASE WHEN l_usersInCall > 0
                                                   THEN l_usersInCall - 1 ELSE 0 END,
                               l_idleUsers   = l_idleUsers + 1
                        WHERE  l_queueId = %s
                    """, (queue_id,))
                    snap = _fetch_queue_snapshot(cursor, queue_id)
                logger.info(f"[CC] Queue={queue_id} usersInCall-1 idleUsers+1")
                if snap:
                    safe_emit(SOCKET_QUEUE_UPDATE, _build_queue_payload(
                        snap, "bridge-agent-end", ts,
                        extra={"agentExt": agent_ext}), adminext)
            else:
                logger.debug(f"[CC] Unhandled action={cc_action!r}")

        except Exception as exc:
            logger.error(f"[CC] Failed action={cc_action} queue={queue_id}: {exc}", exc_info=True)
            metrics.increment_db_errors()
            return False

        return True

    # ─── agent-status-change ──────────────────────────────────────────────────
    def _cc_agent_status_change(self, event: Dict[str, Any], agent_ext: str) -> bool:
        cc_status = event.get("CC-Agent-Status", "")

        if not agent_ext:
            logger.warning("[CC] agent-status-change missing CC-Agent")
            return True

        CC_STATUS_MAP = {
            "Available":             True,
            "Available (On Demand)": True,
            "On Break":              False,
            "Logged Out":            False,
        }
        if cc_status not in CC_STATUS_MAP:
            logger.debug(f"[CC] Unknown CC-Agent-Status={cc_status!r}")
            return True

        is_available = CC_STATUS_MAP[cc_status]
        ts           = now_ist().isoformat()

        r              = cache._client()
        state_key      = f"agent:cc_status:{agent_ext}"
        prev_cc_status = r.get(state_key)

        if prev_cc_status == cc_status:
            logger.info(f"[CC] Agent={agent_ext} unchanged ({cc_status!r}) — skip")
            return True

        r.set(state_key, cc_status)
        logger.info(f"[CC] Agent={agent_ext} {prev_cc_status!r} → {cc_status!r}")

        safe_emit(SOCKET_AGENT_STATUS, {
            "event":        "agent:status",
            "agentExt":     agent_ext,
            "ccStatus":     cc_status,
            "available":    is_available,
            "prevCcStatus": prev_cc_status,
            "timestamp":    ts,
        }, agent_ext)

        try:
            queue_ids = self._get_agent_queue_ids(agent_ext)
            if not queue_ids:
                logger.debug(f"[CC] Agent={agent_ext} belongs to no queues")
                metrics.increment_processed()
                return True

            logger.info(f"[CC] Updating {len(queue_ids)} queue(s) for agent={agent_ext}")
            for qid in queue_ids:
                try:
                    with db.get_conn() as conn:
                        cursor = conn.cursor(dictionary=True)
                        if is_available:
                            cursor.execute("""
                                UPDATE p_liveQueueMonitoring
                                SET    l_idleUsers   = l_idleUsers   + 1,
                                       l_activeUsers = l_activeUsers + 1
                                WHERE  l_queueId = %s
                            """, (qid,))
                            logger.info(f"[CC] Queue={qid} idleUsers+1 activeUsers+1")
                        else:
                            cursor.execute("""
                                UPDATE p_liveQueueMonitoring
                                SET    l_idleUsers   = CASE WHEN l_idleUsers   > 0
                                                           THEN l_idleUsers   - 1 ELSE 0 END,
                                       l_activeUsers = CASE WHEN l_activeUsers > 0
                                                           THEN l_activeUsers - 1 ELSE 0 END
                                WHERE  l_queueId = %s
                            """, (qid,))
                            logger.info(f"[CC] Queue={qid} idleUsers-1 activeUsers-1")
                        snap = _fetch_queue_snapshot(cursor, qid)

                    if snap:
                        action = "agent-available" if is_available else "agent-unavailable"
                        safe_emit(SOCKET_QUEUE_UPDATE, _build_queue_payload(
                            snap, action, ts,
                            extra={"agentExt": agent_ext, "ccStatus": cc_status}), agent_ext)
                except Exception as qexc:
                    logger.error(f"[CC] Queue update failed qid={qid}: {qexc}")

            metrics.increment_processed()

        except Exception as exc:
            logger.error(f"[CC] DB error agent={agent_ext}: {exc}", exc_info=True)
            metrics.increment_db_errors()
            return False

        return True

    # ─── CHANNEL_CALLSTATE ────────────────────────────────────────────────────
    def _handle_channel_callstate(self, event: Dict[str, Any]) -> bool:
        call_state   = event.get("Channel-Call-State")
        channel_name = event.get("Channel-Name", "")
        destination  = event.get("Caller-Destination-Number", "")
        server_ip    = event.get("FreeSWITCH-IPv4", "")
        uuid         = event.get("Channel-Call-UUID", "")
        call_dir     = event.get("Call-Direction", "")   # "inbound" or "outbound"

        if call_state not in ("RINGING", "ACTIVE", "HANGUP"):
            return True

        is_internal = "sofia/internal" in channel_name
        is_external = "sofia/external" in channel_name

        # Inbound DID carrier leg — now arrives on sofia/external (was sofia/internal)
        # Key: destination == "pulseInbound" regardless of profile
        is_inbound_did_leg = destination == "pulseInbound"

        # Agent's own SIP leg for an outbound call (internal, inbound call-dir)
        is_outbound_agent_leg = is_internal and destination == "pulseOutbound"

        # Agent's ringing/answered leg for an inbound call:
        # sofia/internal, Call-Direction=outbound (FS dials out to the agent),
        # destination is the agent extension (not a pulse* keyword)
        is_inbound_agent_leg = (
            is_internal
            and call_dir == "outbound"
            and not destination.startswith("pulse")
        )

        # External PSTN leg for an outbound call — sofia/external but NOT the
        # inbound DID leg (which also uses sofia/external now)
        is_outbound_ext_leg = is_external and not is_inbound_did_leg

        STATUS_MAP = {"RINGING": "RINGING", "ACTIVE": "INCALL", "HANGUP": "AVAILABLE"}
        ts = now_ist().isoformat()

        # ── OUTBOUND agent leg ────────────────────────────────────────────────
        if is_outbound_agent_leg:
            agent       = event.get("Caller-Username")
            call_status = STATUS_MAP[call_state]
            logger.info(f"[OUTBOUND-AGENT-{call_status}] Agent={agent} UUID={uuid}")
            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = %s,
                               l_memberuuid          = %s,
                               l_memberStatus        = %s,
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, ("OUTBOUND", uuid if call_state != "HANGUP" else "",
                          call_status, server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring OUTBOUND-AGENT={agent}: {exc}")
                return False

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":      "AgentPresence",
                "extension": agent,
                "status": call_status,
                "memberCustomerNumber": "",
                "memberCliNumberId": "",
                "memberCallDirection": "OUTBOUND",
                "memberServerIp": server_ip,
                "nowIst": datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
            }, agent)

        # ── INBOUND DID leg ───────────────────────────────────────────────────
        # dest == "pulseInbound", now arrives on sofia/external profile.
        # This leg carries: Caller-Caller-ID-Number=customer, Caller-Callee-ID-Number=agent.
        # The liveCallStatus row was keyed with the agent leg's Unique-ID, stored in
        # Redis as call:<agent_leg_uuid>. At HANGUP we look that up to clean up correctly.
        elif is_inbound_did_leg:
            if call_state == "HANGUP":
                real_agent  = event.get("Caller-Callee-ID-Number")
                cust_number = event.get("Caller-Caller-ID-Number", "")
                logger.info(f"[INBOUND-DID-HANGUP] Agent={real_agent} UUID={uuid}")
                try:
                    # p_liveCallStatus DELETE is handled by INBOUND-AGENT HANGUP
                    # (which has the correct leg_uuid). Only update liveMonitoring here.
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE p_liveMonitoring
                            SET    l_memberCallDirection = %s,
                                   l_memberuuid          = %s,
                                   l_memberStatus        = %s,
                                   l_memberServerIp      = %s
                            WHERE  l_memberExtention = %s
                        """, ("INBOUND", "", "AVAILABLE", server_ip, real_agent))
                except Exception as exc:
                    logger.error(f"[DB] INBOUND DID HANGUP liveMonitoring uuid={uuid}: {exc}")
                    return False

                safe_emit(SOCKET_CALL_UPDATE, {
                    "type":                   "AgentPresence",
                    "extension":              real_agent,
                    "status":                 "AVAILABLE",
                    "l_memberCustomerNumber": "",
                    "l_memberCliNumberId":    "",
                    "memberCallDirection":    "INBOUND",
                    "memberServerIp":         server_ip,
                    "nowIst": datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S"),
                }, real_agent)
            else:
                logger.debug(f"[INBOUND-DID] Skip {call_state} uuid={uuid}")

        # ── INBOUND agent leg ─────────────────────────────────────────────────
        # sofia/internal, Call-Direction=outbound (FS dials the agent).
        # Caller-Callee-ID-Number = agent extension
        # Caller-Caller-ID-Number = customer number
        # Unique-ID = this leg's own UUID (used for DB keying)
        # Channel-Call-UUID = the DID leg UUID (used for socket emit correlation)
        elif is_inbound_agent_leg:
            leg_uuid    = event.get("Unique-ID", uuid)        # agent leg's own UUID
            agent       = event.get("Caller-Callee-ID-Number") or destination
            cust_number = event.get("Caller-Caller-ID-Number", "")
            cust_short  = cust_number[-10:] if cust_number else ""
            call_status = STATUS_MAP[call_state]
            logger.info(f"[INBOUND-AGENT-{call_status}] Agent={agent} UUID={leg_uuid}")

            if not agent:
                logger.warning(f"[INBOUND-AGENT] No agent extension, skipping")
                return True

            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = %s,
                               l_memberuuid          = %s,
                               l_memberStatus        = %s,
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, ("INBOUND", leg_uuid if call_state != "HANGUP" else "",
                          call_status, server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring INBOUND-AGENT={agent}: {exc}")
                return False

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":                  "AgentPresence",
                "extension":             agent,
                "status":                call_status,
                "memberCustomerNumber":  cust_short,
                "memberCliNumberId":     "",
                "memberCallDirection":   "INBOUND",
                "memberServerIp":        server_ip,
                "nowIst": datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S"),
            }, agent)

            if call_state == "RINGING":
                # INSERT p_liveCallStatus as RINGING so the frontend sees the
                # call arrive before the agent answers.
                try:
                    r         = cache._client()
                    cache_key = f"agent:account:{agent}"
                    cached    = r.hgetall(cache_key)
                    if cached:
                        acc_id, acc_no, membername = cached.get("acc_id"), cached.get("acc_no"), cached.get("membername")
                    else:
                        with db.get_conn() as conn:
                            cur = conn.cursor(dictionary=True)
                            cur.execute(
                                "SELECT m_accountId, m_accountNo, m_memberName FROM p_members "
                                "WHERE m_memberExtensionNo = %s", (agent,))
                            row = cur.fetchone()
                        if not row:
                            logger.warning(f"[DB] No account for agent={agent}")
                            return True
                        acc_id, acc_no, membername = row["m_accountId"], row["m_accountNo"], row["m_memberName"]
                        r.hset(cache_key, mapping={"acc_id": acc_id, "acc_no": acc_no, "membername": membername})
                        r.expire(cache_key, 3600)
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO p_liveCallStatus
                                (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                                 l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtention)
                            VALUES (%s, %s, %s, %s, 'INBOUND', 'RINGING', %s, %s, %s)
                        """, (acc_id, acc_no, "", cust_short, server_ip, leg_uuid, agent))
                    logger.info(f"[DB] liveCallStatus INBOUND INSERTED (RINGING) uuid={leg_uuid}")
                    logger.info(f"[event] event:{event}")
                    safe_emit(SOCKET_CALL_UPDATE, {
                        "type":                  "CallInsertData",
                        "l_CliNumber":     "",
                        "l_CustomerNumber": cust_short,
                        "l_callDirection": "INBOUND",
                        "l_callStatus":    "RINGING",
                        "l_callServerIP": server_ip,
                        "l_callUUID": leg_uuid,
                        "m_memberName": membername,
                    }, agent)
                except Exception as exc:
                    logger.error(f"[DB] liveCallStatus INBOUND RINGING uuid={leg_uuid}: {exc}")
                    return False

            elif call_state == "ACTIVE":
                try:
                    r         = cache._client()
                    cache_key = f"agent:account:{agent}"
                    cached    = r.hgetall(cache_key)
                    if cached:
                        acc_id, acc_no, membername = cached.get("acc_id"), cached.get("acc_no"), cached.get("membername")
                    else:
                        with db.get_conn() as conn:
                            cur = conn.cursor(dictionary=True)
                            cur.execute(
                                "SELECT m_accountId, m_accountNo, m_memberName FROM p_members "
                                "WHERE m_memberExtensionNo = %s", (agent,))
                            row = cur.fetchone()
                        if not row:
                            logger.warning(f"[DB] No account for agent={agent}")
                            return True
                        acc_id, acc_no, membername = row["m_accountId"], row["m_accountNo"], row["m_memberName"]
                        r.hset(cache_key, mapping={"acc_id": acc_id, "acc_no": acc_no, "membername": membername})
                        r.expire(cache_key, 3600)

                    r.hset(f"call:{leg_uuid}", mapping={
                        "acc_id": acc_id, "acc_no": acc_no, "agent": agent,
                        "server_ip": server_ip, "customer_number": cust_short,
                        "direction": "INBOUND",
                    })
                    r.expire(f"call:{leg_uuid}", 3600)

                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            "UPDATE p_liveCallStatus SET l_callStatus = 'ONCALL' "
                            "WHERE l_callUUID = %s", (leg_uuid,))
                        if cursor.rowcount == 0:
                            # RINGING row missing (e.g. event lost) — insert as fallback
                            cursor.execute("""
                                INSERT INTO p_liveCallStatus
                                    (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                                     l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtention)
                                VALUES (%s, %s, %s, %s, 'INBOUND', 'ONCALL', %s, %s, %s)
                            """, (acc_id, acc_no, "", cust_short, server_ip, leg_uuid, agent))
                            logger.info(f"[DB] liveCallStatus INBOUND ONCALL (fallback insert) uuid={leg_uuid}")
                            logger.info(f"[event] event:{event}")
                            safe_emit(SOCKET_CALL_UPDATE, {
                                "type":            "CallInsertData",
                                "l_CliNumber":     "",
                                "l_CustomerNumber": cust_short,
                                "l_callDirection": "INBOUND",
                                "l_callStatus":    "ONCALL",
                                "l_callServerIP": server_ip,
                                "l_callUUID": leg_uuid,
                                "m_memberName": membername,
                            }, agent)
                        else:
                            safe_emit(SOCKET_CALL_UPDATE, {
                                "type":            "CallUpdateData",
                                "l_callUUID": leg_uuid,
                                "l_callStatus": "ONCALL",
                                "l_memberExtention": agent,    
                
                            }, agent)
                            logger.info(f"[DB] liveCallStatus INBOUND INCALL (updated) uuid={leg_uuid}")
                except Exception as exc:
                    logger.error(f"[DB] liveCallStatus INBOUND ACTIVE uuid={leg_uuid}: {exc}")
                    return False

            elif call_state == "HANGUP":
                # DELETE here — we have leg_uuid directly (same UUID used at INSERT).
                # INBOUND-DID-HANGUP carries a different Channel-Call-UUID and
                # cannot reliably delete the correct row.
                try:
                    r = cache._client()
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            "DELETE FROM p_liveCallStatus WHERE l_callUUID = %s", (leg_uuid,))
                        
                        safe_emit(SOCKET_CALL_UPDATE, {
                            "type":            "CallCompletedData",
                            "l_callUUID": leg_uuid,
                            "l_callStatus": "COMPLETED",    
                        }, agent)
                    r.delete(f"call:{leg_uuid}")
                    logger.info(f"[DB] liveCallStatus INBOUND DELETED uuid={leg_uuid}")
                except Exception as exc:
                    logger.error(f"[DB] liveCallStatus INBOUND HANGUP uuid={leg_uuid}: {exc}")
                    return False

        # ── OUTBOUND external leg ─────────────────────────────────────────────
        # FreeSWITCH behaviour: the sofia/external leg skips RINGING and fires
        # ACTIVE directly (Original-Channel-Call-State=EARLY → ACTIVE in one hop).
        # The RINGING block is kept for resilience but ACTIVE must also be able
        # to INSERT the row when no RINGING preceded it.
        elif is_outbound_ext_leg:
            agent       = event.get("Caller-Username")
            # On the external leg Caller-Caller-ID-Number is the CLI (outgoing caller ID)
            # and Caller-Destination-Number is the full dialled number.
            cli_number  = event.get("Caller-Caller-ID-Number", "")
            cust_number = (event.get("Caller-Destination-Number") or "")[-10:]
            logger.info(f"[OUTBOUND-EXT-{call_state}] Agent={agent} Customer={cust_number} UUID={uuid}")

            try:
                r = cache._client()

                if call_state == "RINGING":
                    # ── resolve & cache account info ──────────────────────────
                    cache_key = f"agent:account:{agent}"
                    cached    = r.hgetall(cache_key)
                    if cached:
                        acc_id, acc_no, membername = cached.get("acc_id"), cached.get("acc_no"), cached.get("membername")
                    else:
                        with db.get_conn() as conn:
                            cur = conn.cursor(dictionary=True)
                            cur.execute(
                                "SELECT m_accountId, m_accountNo, m_memberName FROM p_members "
                                "WHERE m_memberExtensionNo = %s", (agent,))
                            row = cur.fetchone()
                        if not row:
                            logger.warning(f"[DB] No account for agent={agent}")
                            return True
                        acc_id, acc_no, membername = row["m_accountId"], row["m_accountNo"], row["m_memberName"]
                        r.hset(cache_key, mapping={"acc_id": acc_id, "acc_no": acc_no, "membername": membername})
                        r.expire(cache_key, 3600)

                    # cache call metadata so ACTIVE/HANGUP can reuse it
                    r.hset(f"call:{uuid}", mapping={
                        "acc_id": acc_id, "acc_no": acc_no, "cli_number": cli_number,
                        "customer_number": cust_number, "server_ip": server_ip,
                        "agent": agent, "direction": "OUTBOUND",
                    })
                    r.expire(f"call:{uuid}", 3600)

                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO p_liveCallStatus
                                (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                                 l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtension)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (acc_id, acc_no, cli_number, cust_number,
                              "OUTBOUND", "RINGING", server_ip, uuid, agent))
                    logger.info(f"[DB] liveCallStatus OUTBOUND INSERTED (RINGING) uuid={uuid}")
                    logger.info(f"[event] event:{event}")
                    safe_emit(SOCKET_CALL_UPDATE, {
                        "type":            "CallInsertData",
                        "l_CliNumber":     cli_number,
                        "l_CustomerNumber": cust_number,
                        "l_callDirection": "OUTBOUND",
                        "l_callStatus":    "RINGING",
                        "l_callServerIP": server_ip,
                        "l_callUUID": uuid,
                        "m_memberName": membername,
                    }, agent)

                elif call_state == "ACTIVE":
                    # ── resolve account — prefer Redis call cache, fall back to
                    #    agent cache, then DB.  RINGING may never have fired.  ──
                    call_cache = r.hgetall(f"call:{uuid}")
                    if call_cache:
                        acc_id     = call_cache.get("acc_id")
                        acc_no     = call_cache.get("acc_no")
                        cli_number = call_cache.get("cli_number", cli_number)
                    else:
                        agent_cache = r.hgetall(f"agent:account:{agent}")
                        if agent_cache:
                            acc_id, acc_no, membername = agent_cache.get("acc_id"), agent_cache.get("acc_no"), agent_cache.get("membername")
                        else:
                            with db.get_conn() as conn:
                                cur = conn.cursor(dictionary=True)
                                cur.execute(
                                    "SELECT m_accountId, m_accountNo, m_memberName FROM p_members "
                                    "WHERE m_memberExtensionNo = %s", (agent,))
                                row = cur.fetchone()
                            if not row:
                                logger.warning(f"[DB] No account for agent={agent}, skipping ACTIVE")
                                return True
                            acc_id, acc_no, membername = row["m_accountId"], row["m_accountNo"], row["m_memberName"]
                            r.hset(f"agent:account:{agent}",
                                   mapping={"acc_id": acc_id, "acc_no": acc_no, "membername": membername})
                            r.expire(f"agent:account:{agent}", 3600)

                        # Write call cache so HANGUP can clean up properly
                        r.hset(f"call:{uuid}", mapping={
                            "acc_id": acc_id, "acc_no": acc_no, "cli_number": cli_number,
                            "customer_number": cust_number, "server_ip": server_ip,
                            "agent": agent, "direction": "OUTBOUND",
                        })
                        r.expire(f"call:{uuid}", 3600)

                    # Upsert: insert the row if RINGING never fired, otherwise
                    # just flip the status to INCALL.
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO p_liveCallStatus
                                (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                                 l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtension)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE
                                l_callStatus = 'ONCALL'
                        """, (acc_id, acc_no, cli_number, cust_number,
                              "OUTBOUND", "ONCALL", server_ip, uuid, agent))
                    logger.info(f"[DB] liveCallStatus OUTBOUND UPSERT ONCALL uuid={uuid}")

                    safe_emit(SOCKET_CALL_UPDATE, {
                        "type":            "CallInsertData",
                        "l_CliNumber":     cli_number,
                        "l_CustomerNumber": cust_number,
                        "l_callDirection": "OUTBOUND",
                        "l_callStatus":    "ONCALL",
                        "l_callServerIP": server_ip,
                        "l_callUUID": uuid,
                        "m_memberName": membername,
                    }, agent)

                elif call_state == "HANGUP":
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            "DELETE FROM p_liveCallStatus WHERE l_callUUID = %s", (uuid,))
                    r.delete(f"call:{uuid}")
                    logger.info(f"[DB] liveCallStatus OUTBOUND DELETED uuid={uuid}")


                    safe_emit(SOCKET_CALL_UPDATE, {
                        "type": "CallCompletedData",
                        "l_callUUID": uuid,
                        "l_callStatus": "COMPLETED",
                    }, agent)

            except Exception as exc:
                logger.error(f"[DB] liveCallStatus OUTBOUND uuid={uuid}: {exc}")
                return False

        else:
            logger.debug(f"[CHANNEL] Skipped: channel={channel_name!r} dest={destination!r}")

        return True

    # ─── Cache helpers ────────────────────────────────────────────────────────
    def _get_queue_info(self, queue_id: str):
        try:
            r         = cache._client()
            cache_key = f"queue:account:{queue_id}"
            cached    = r.hgetall(cache_key)
            if cached:
                return cached.get("acc_id"), cached.get("acc_no"), cached.get("queue_name")

            with db.get_conn() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("""
                    SELECT q_accountId, q_accountNo, q_queuegroupName
                    FROM   p_queuegroups WHERE q_queuegroupId = %s LIMIT 1
                """, (queue_id,))
                row = cursor.fetchone()

            if not row:
                logger.warning(f"[CC] No queue found id={queue_id}")
                return None, None, None

            acc_id, acc_no, queue_name = (
                row["q_accountId"], row["q_accountNo"], row["q_queuegroupName"])
            r.hset(cache_key, mapping={"acc_id": acc_id, "acc_no": acc_no,
                                        "queue_name": queue_name})
            r.expire(cache_key, 3600)
            return acc_id, acc_no, queue_name
        except Exception as exc:
            logger.error(f"[CC] _get_queue_info failed queue={queue_id}: {exc}")
            return None, None, None

    def _get_agent_queue_ids(self, agent_ext: str) -> List[str]:
        r         = cache._client()
        cache_key = f"agent:queues:{agent_ext}"
        try:
            cached = r.smembers(cache_key)
            if cached:
                return list(cached)
        except Exception:
            pass
        try:
            with db.get_conn() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("""
                    SELECT DISTINCT q_queuegroupId FROM p_queuegroups
                    WHERE q_memberExtensionNo LIKE %s
                """, (f"{agent_ext}@%",))
                rows = cursor.fetchall()
            queue_ids = [str(rw["q_queuegroupId"]) for rw in rows]
            if queue_ids:
                try:
                    r.sadd(cache_key, *queue_ids)
                    r.expire(cache_key, 3600)
                except Exception:
                    pass
            return queue_ids
        except Exception as exc:
            logger.error(f"[CC] _get_agent_queue_ids failed agent={agent_ext}: {exc}")
            return []

    # ─── Batch flush ──────────────────────────────────────────────────────────
    def flush(self) -> int:
        with self._lock:
            if not self.pending:
                return 0
            batch = self.pending.copy()
            self.pending = []
            self.last_flush_time = time.time()

        inserted = 0
        try:
            with db.get_conn() as conn:
                cur = conn.cursor()
                for query, params, socket_event, socket_payload in batch:
                    try:
                        cur.execute(query, params)
                        inserted += 1
                        if socket_event:
                            safe_emit(socket_event, socket_payload)
                    except Exception as exc:
                        logger.error(f"Batch execute failed: {exc}")
                        metrics.increment_db_errors()
                cur.close()
            if inserted:
                metrics.increment_processed(inserted)
        except Exception as exc:
            logger.error(f"Batch flush error: {exc}", exc_info=True)
            metrics.increment_db_errors()
        return inserted

    def force_flush(self):
        count = self.flush()
        if count:
            logger.info(f"Final flush: {count} records written")


processor = EventProcessor(
    batch_size=settings.BATCH_SIZE,
    batch_timeout=settings.BATCH_TIMEOUT_SECONDS,
)


# ─────────────────────────────────────────
# Kafka consumer loop
# ─────────────────────────────────────────
def run_consumer() -> int:
    retry_count = 0
    consumer    = None

    while not shutdown_event.is_set() and retry_count < settings.MAX_RETRIES:
        try:
            consumer = KafkaConsumer(
                settings.KAFKA_TOPIC,
                bootstrap_servers=[f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"],
                group_id=settings.KAFKA_GROUP_ID,
                enable_auto_commit=True,
                auto_commit_interval_ms=5000,
                auto_offset_reset=settings.KAFKA_AUTO_OFFSET_RESET,
                session_timeout_ms=settings.KAFKA_SESSION_TIMEOUT_MS,
                heartbeat_interval_ms=settings.KAFKA_HEARTBEAT_INTERVAL_MS,
                max_poll_interval_ms=settings.KAFKA_MAX_POLL_INTERVAL_MS,
                max_poll_records=settings.KAFKA_MAX_POLL_RECORDS,
                value_deserializer=lambda m: m.decode("utf-8", errors="ignore") if m else None,
            )
            logger.info(
                f"✅ Kafka ready  topic={settings.KAFKA_TOPIC}  group={settings.KAFKA_GROUP_ID}")
            retry_count = 0

            while not shutdown_event.is_set():
                try:
                    message_batch = consumer.poll(timeout_ms=1000)
                    if not message_batch:
                        if processor.pending:
                            processor.flush()
                        continue
                    for _tp, messages in message_batch.items():
                        for msg in messages:
                            if shutdown_event.is_set():
                                break
                            if not msg.value:
                                continue
                            event = safe_json_loads(msg.value)
                            if event:
                                processor.process(event)
                        if shutdown_event.is_set():
                            break
                except Exception as exc:
                    logger.error(f"Poll error: {exc}", exc_info=True)
                    metrics.increment_errors()
                    time.sleep(1)
            break

        except NoBrokersAvailable:
            retry_count += 1
            backoff = settings.RETRY_BACKOFF_SECONDS * retry_count
            logger.error(
                f"❌ No Kafka broker  attempt={retry_count}/{settings.MAX_RETRIES}"
                f"  retry in {backoff}s")
            if not shutdown_event.is_set():
                time.sleep(backoff)
        except KafkaError as exc:
            logger.error(f"Kafka error: {exc}", exc_info=True)
            retry_count += 1
            if not shutdown_event.is_set():
                time.sleep(settings.RETRY_BACKOFF_SECONDS)
        except Exception as exc:
            logger.error(f"Unexpected consumer error: {exc}", exc_info=True)
            retry_count += 1
            if not shutdown_event.is_set():
                time.sleep(settings.RETRY_BACKOFF_SECONDS)
        finally:
            if consumer:
                try:
                    consumer.close()
                except Exception as exc:
                    logger.error(f"Error closing consumer: {exc}")
                consumer = None

    processor.force_flush()
    stats = metrics.get_stats()
    logger.info("📊 Final Statistics")
    for k, v in stats.items():
        logger.info(f"  {k}: {v}")

    if retry_count >= settings.MAX_RETRIES:
        logger.error("❌ Max retries exceeded — exiting")
        return 1

    logger.info("✅ Consumer shutdown complete")
    return 0


# ─────────────────────────────────────────
# Background threads
# ─────────────────────────────────────────
def _periodic_flush():
    while not shutdown_event.is_set():
        time.sleep(settings.BATCH_TIMEOUT_SECONDS)
        if processor.pending:
            processor.flush()


def _stats_reporter():
    while not shutdown_event.is_set():
        time.sleep(settings.STATS_REPORT_INTERVAL)
        if shutdown_event.is_set():
            break
        stats = metrics.get_stats()
        logger.info("📊 Periodic Stats")
        for k, v in stats.items():
            logger.info(f"  {k}: {v}")


# ─────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────
if __name__ == "__main__":
    logger.info(
        f"FreeSWITCH ESL Kafka Consumer starting"
        f"  broker={settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
        f"  topic={settings.KAFKA_TOPIC}"
        f"  group={settings.KAFKA_GROUP_ID}"
    )
    start_health_server(settings.HEALTH_CHECK_PORT)
    threading.Thread(target=_periodic_flush, daemon=True, name="PeriodicFlush").start()
    threading.Thread(target=_stats_reporter,  daemon=True, name="StatsReporter").start()

    token = socket_manager.get_access_token()
    if token:
        socket_manager.set_access_token(token)
        threading.Thread(target=socket_manager.connect, daemon=True, name="SocketConnect").start()
        logger.info("✅ Socket manager thread started")
    else:
        logger.warning("⚠️  Could not obtain socket token — socket events will be dropped")

    exit_code = run_consumer()
    time.sleep(1)
    exit(exit_code)