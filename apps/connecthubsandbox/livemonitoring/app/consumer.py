#!/usr/bin/env python3
"""
FreeSWITCH ESL Kafka Consumer → MySQL  (Production)
======================================================

Event strategy (based on FreeSWITCH official event docs):
──────────────────────────────────────────────────────────
INBOUND CALLS
  Primary:  CHANNEL_ANSWER            → authoritative "call answered" signal
            CHANNEL_HANGUP_COMPLETE   → authoritative cleanup (all vars populated)
  Support:  CHANNEL_CALLSTATE RINGING → early RINGING insert (UI feedback only)
  Leg:      sofia/internal, Call-Direction=outbound, dest≠pulse*
  Fields:   Unique-ID (stable leg key)
            Caller-Caller-ID-Number  (customer / incoming number)
            Caller-Callee-ID-Number  (agent extension)
            FreeSWITCH-IPv4          (server ip)

OUTBOUND CALLS
  Primary:  CHANNEL_ANSWER            → call answered
            CHANNEL_HANGUP_COMPLETE   → cleanup
  Support:  CHANNEL_CALLSTATE RINGING → early RINGING insert
  Leg:      sofia/external, dest≠pulseInbound (PSTN leg)
  Fields:   Unique-ID
            Caller-Username          (agent extension)
            Caller-Destination-Number (customer number)
            Caller-Caller-ID-Number  (CLI / outbound caller id)
            FreeSWITCH-IPv4

WHY CHANNEL_ANSWER not CHANNEL_CALLSTATE ACTIVE:
  CHANNEL_ANSWER fires exactly once per answered call — unambiguous.
  CHANNEL_CALLSTATE ACTIVE can fire on early-media transitions too.

WHY CHANNEL_HANGUP_COMPLETE not CHANNEL_CALLSTATE HANGUP:
  CHANNEL_HANGUP_COMPLETE fires after ALL teardown is done — CDR written,
  all channel variables fully populated (Hangup-Cause, Other-Leg-* fields).
  CHANNEL_CALLSTATE HANGUP fires mid-teardown; Channel-Call-UUID switches
  to bridged partner UUID making leg identification unreliable

AGENT PRESENCE:
  sofia::register, sofia::unregister, sofia::expire CUSTOM events.

QUEUE MONITORING:
  callcenter::info CUSTOM events (CC-Action header).

Socket.IO events emitted:
  agent:register  agent:unregister  agent:expire  agent:status
  queue:update    call:update

RECONCILER:
  Every RECONCILE_INTERVAL seconds (default 300 / 5 min) a background
  thread opens an ESL connection to each FreeSWITCH server IP found in
  p_liveCallStatus, runs "show channels as json", and purges any
  DB rows whose UUID is absent from FreeSWITCH (ghost calls).
"""

import json
import logging
import signal
import threading
import time
from contextlib import contextmanager
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Optional, Set, Tuple
from zoneinfo import ZoneInfo
import ESL
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
                    "database":   "connected" if db.pool else "disconnected",
                    "socket":     "connected" if socket_manager.is_connected else "disconnected",
                    "reconciler": reconciler.status() if reconciler else "not_started",
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


def ist_str() -> str:
    return datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")


def safe_emit(event_name: str, payload: Dict[str, Any], agent_ext=None) -> None:
    """
    Fire-and-forget socket emit — never raises.
    agent_ext may be a str extension ("1951004") or an int admin-ext
    (acc_id + 1000).  Both are coerced to str before use.
    """
    if agent_ext is None or agent_ext == "":
        logger.warning(f"[SOCKET] emit skipped [{event_name}]: empty agent_ext")
        return
    try:
        ext_str = str(agent_ext)
        # Strip last 4 digits to derive the account-level room id.
        # e.g. "1951004" -> "195",  "1001195" -> "100"
        ext_id  = ext_str[:-4] if len(ext_str) > 4 else ext_str
        data    = {"data": payload, "extension": ext_str, "id": ext_id}
        socket_manager.emit("message", data)
        logger.debug(f"[SOCKET] emitted {event_name} agent={ext_str}")
    except Exception as exc:
        logger.warning(f"[SOCKET] emit failed [{event_name}]: {exc}")


def _fetch_queue_snapshot(cursor, queue_id: str) -> Optional[Dict[str, Any]]:
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


def _resolve_account(agent: str, r: redis_lib.Redis) -> Optional[Tuple[str, str, str]]:
    """
    Return (acc_id, acc_no, member_name) for an agent extension.
    Redis hash cache first; DB fallback.
    """
    cache_key = f"agent:account:{agent}"
    try:
        cached = r.hgetall(cache_key)
        if cached and cached.get("acc_id") and cached.get("acc_no") and cached.get("membername"):
            return cached["acc_id"], cached["acc_no"], cached["membername"]
    except Exception as exc:
        logger.warning(f"[CACHE] account lookup failed agent={agent}: {exc}")

    try:
        with db.get_conn() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT m_accountId, m_accountNo, m_memberName FROM p_members "
                "WHERE m_memberExtensionNo = %s LIMIT 1", (agent,))
            row = cur.fetchone()
        if not row:
            logger.warning(f"[DB] No p_members row for agent={agent!r}")
            return None
        acc_id     = str(row["m_accountId"])
        acc_no     = str(row["m_accountNo"])
        membername = row["m_memberName"] or agent
        try:
            r.hset(cache_key, mapping={"acc_id": acc_id, "acc_no": acc_no, "membername": membername})
            r.expire(cache_key, 3600)
        except Exception:
            pass
        return acc_id, acc_no, membername
    except Exception as exc:
        logger.error(f"[DB] _resolve_account failed agent={agent}: {exc}")
        return None


def _classify_leg(event: Dict[str, Any]) -> str:
    """
    Classify a CHANNEL event into one of five leg types.

    INBOUND_AGENT  — sofia/internal, Call-Direction=outbound, dest≠pulse*
    OUTBOUND_AGENT — sofia/internal, dest=pulseOutbound
    INBOUND_DID    — dest=pulseInbound (any profile)
    OUTBOUND_EXT   — sofia/external, dest≠pulseInbound
    UNKNOWN        — anything else
    """
    channel_name = event.get("Channel-Name", "")
    destination  = event.get("Caller-Destination-Number", "")
    call_dir     = event.get("Call-Direction", "")

    is_internal = "sofia/internal" in channel_name
    is_external = "sofia/external" in channel_name

    if destination == "pulseInbound":
        return "INBOUND_DID"
    if is_internal and destination == "pulseOutbound":
        return "OUTBOUND_AGENT"
    if is_internal and call_dir == "outbound" and not destination.startswith("pulse"):
        return "INBOUND_AGENT"
    if is_external and not destination.startswith("pulse"):
        return "OUTBOUND_EXT"
    return "UNKNOWN"


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

            if   routing_key == "sofia::register":        return self._handle_register(event)
            elif routing_key == "sofia::unregister":       return self._handle_unregister(event)
            elif routing_key == "sofia::expire":           return self._handle_expire(event)
            elif event_sub   == "callcenter::info":        return self._handle_callcenter_info(event)
            elif event_name  == "CHANNEL_CALLSTATE":       return self._handle_channel_callstate(event)
            elif event_name  == "CHANNEL_ANSWER":          return self._handle_channel_answer(event)
            elif event_name  == "CHANNEL_HANGUP_COMPLETE": return self._handle_channel_hangup_complete(event)
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
            "type":                 "AgentPresence",
            "extension":            agent_ext,
            "status":               "AVAILABLE",
            "memberCustomerNumber": "",
            "memberCliNumberId":    "",
            "memberCallDirection":  "",
            "memberServerIp":       "",
            "nowIst":               ist_str(),
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
            "type":                 "AgentPresence",
            "extension":            agent_ext,
            "status":               "UNAVAILABLE",
            "memberCustomerNumber": "",
            "memberCliNumberId":    "",
            "memberCallDirection":  "",
            "memberServerIp":       "",
            "nowIst":               ist_str(),
        }, agent_ext)
        return True

    def _handle_unregister(self, event: Dict[str, Any]) -> bool:
        return self._handle_logout(event, "UNREGISTER", SOCKET_AGENT_UNREGISTER)

    def _handle_expire(self, event: Dict[str, Any]) -> bool:
        return self._handle_logout(event, "EXPIRE", SOCKET_AGENT_EXPIRE)

    # ─── CHANNEL_CALLSTATE ────────────────────────────────────────────────────
    def _handle_channel_callstate(self, event: Dict[str, Any]) -> bool:
        call_state = event.get("Channel-Call-State")
        leg        = _classify_leg(event)
        uuid       = event.get("Unique-ID", "")
        server_ip  = event.get("FreeSWITCH-IPv4", "")

        # ── OUTBOUND_AGENT: RINGING or ACTIVE → update p_liveMonitoring ───────
        if leg == "OUTBOUND_AGENT":
            agent = event.get("Caller-Username", "")
            if call_state not in ("RINGING", "ACTIVE"):
                return True
            live_status = "RINGING" if call_state == "RINGING" else "ONCALL"
            logger.info(f"[OUTBOUND-AGENT-{live_status}] Agent={agent} UUID={uuid}")
            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = 'OUTBOUND',
                               l_memberuuid          = %s,
                               l_memberStatus        = %s,
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, (uuid, live_status, server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring OUTBOUND-AGENT-{live_status} agent={agent}: {exc}")
                return False
            safe_emit(SOCKET_CALL_UPDATE, {
                "type":                 "AgentPresence",
                "extension":            agent,
                "status":               live_status,
                "memberCustomerNumber": "",
                "memberCliNumberId":    "",
                "memberCallDirection":  "OUTBOUND",
                "memberServerIp":       server_ip,
                "nowIst":               ist_str(),
            }, agent)
            return True

        if call_state != "RINGING":
            return True

        ts = now_ist().isoformat()

        # ── INBOUND: FS is ringing the agent ──────────────────────────────────
        if leg == "INBOUND_AGENT":
            agent       = event.get("Caller-Callee-ID-Number") or event.get("Caller-Destination-Number", "")
            cust_number = event.get("Caller-Caller-ID-Number", "")
            cust_short  = cust_number[-10:] if cust_number else ""

            cli_number = ""
            if cust_short:
                try:
                    cli_number = cache._client().get(f"inbound_cli:{cust_short}") or ""
                except Exception:
                    pass
            if not cli_number:
                cli_number = event.get("variable_sip_h_X-cliphonenumber") or ""

            if not agent:
                logger.warning(f"[INBOUND-RINGING] No agent extension uuid={uuid}")
                return True

            logger.info(f"[INBOUND-RINGING] Agent={agent} Customer={cust_short} CLI={cli_number} UUID={uuid}")

            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = 'INBOUND',
                               l_memberuuid          = %s,
                               l_memberStatus        = 'RINGING',
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, (uuid, server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring INBOUND-RINGING agent={agent}: {exc}")
                return False

            r       = cache._client()
            account = _resolve_account(agent, r)

            if account:
                acc_id, acc_no, membername = account
                try:
                    r.hset(f"call:{uuid}", mapping={
                        "acc_id": acc_id, "acc_no": acc_no, "agent": agent,
                        "server_ip": server_ip, "customer_number": cust_short,
                        "cli_number": cli_number, "direction": "INBOUND",
                    })
                    r.expire(f"call:{uuid}", 3600)
                except Exception:
                    pass
                try:
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO p_liveCallStatus
                                (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                                 l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtention)
                            VALUES (%s, %s, %s, %s, 'INBOUND', 'RINGING', %s, %s, %s)
                        """, (acc_id, acc_no, cli_number, cust_short, server_ip, uuid, agent))
                    logger.info(f"[DB] liveCallStatus INBOUND RINGING uuid={uuid}")
                    safe_emit(SOCKET_CALL_UPDATE, {
                        "type":             "CallInsertData",
                        "l_CliNumber":      cli_number,
                        "l_CustomerNumber": cust_short,
                        "l_callDirection":  "INBOUND",
                        "l_callStatus":     "RINGING",
                        "l_callServerIP":   server_ip,
                        "l_callUUID":       uuid,
                        "m_memberName":     membername,
                    }, agent)
                except Exception as exc:
                    logger.error(f"[DB] liveCallStatus INBOUND-RINGING uuid={uuid}: {exc}")
                    return False
            else:
                logger.warning(f"[INBOUND-RINGING] No account for agent={agent} — skipping liveCallStatus")

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":                 "AgentPresence",
                "extension":            agent,
                "status":               "RINGING",
                "memberCustomerNumber": cust_short,
                "memberCliNumberId":    cli_number,
                "memberCallDirection":  "INBOUND",
                "memberServerIp":       server_ip,
                "nowIst":               ist_str(),
            }, agent)

        elif leg == "OUTBOUND_AGENT":
            # Duplicate guard — already handled above before the RINGING check
            pass

        elif leg == "OUTBOUND_EXT":
            agent       = event.get("Caller-Username", "")
            cli_number  = event.get("Caller-Caller-ID-Number", "")
            cust_number = (event.get("Caller-Destination-Number") or "")[-10:]

            logger.info(f"[OUTBOUND-RINGING] Agent={agent} Customer={cust_number} UUID={uuid}")

            r       = cache._client()
            account = _resolve_account(agent, r)
            if not account:
                logger.warning(f"[OUTBOUND-RINGING] No account for agent={agent}, skipping")
                return True
            acc_id, acc_no, membername = account

            try:
                r.hset(f"call:{uuid}", mapping={
                    "acc_id": acc_id, "acc_no": acc_no,
                    "cli_number": cli_number, "customer_number": cust_number,
                    "server_ip": server_ip, "agent": agent, "direction": "OUTBOUND",
                })
                r.expire(f"call:{uuid}", 3600)
            except Exception as exc:
                logger.warning(f"[CACHE] call cache set failed uuid={uuid}: {exc}")

            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT IGNORE INTO p_liveCallStatus
                            (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                             l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtention)
                        VALUES (%s, %s, %s, %s, 'OUTBOUND', 'RINGING', %s, %s, %s)
                    """, (acc_id, acc_no, cli_number, cust_number, server_ip, uuid, agent))
                    if cursor.rowcount == 0:
                        logger.info(f"[DB] liveCallStatus OUTBOUND RINGING duplicate — skipped uuid={uuid}")
                        return True
                logger.info(f"[DB] liveCallStatus OUTBOUND RINGING uuid={uuid}")
                safe_emit(SOCKET_CALL_UPDATE, {
                    "type":             "CallInsertData",
                    "l_CliNumber":      cli_number,
                    "l_CustomerNumber": cust_number,
                    "l_callDirection":  "OUTBOUND",
                    "l_callStatus":     "RINGING",
                    "l_callServerIP":   server_ip,
                    "l_callUUID":       uuid,
                    "m_memberName":     membername,
                }, agent)
            except Exception as exc:
                logger.error(f"[DB] liveCallStatus OUTBOUND-RINGING uuid={uuid}: {exc}")
                return False

        elif leg == "INBOUND_DID" and call_state == "RINGING":
            cli_number  = (
                event.get("variable_sip_h_X-cliphonenumber") or
                event.get("variable_sip_to_user") or
                ""
            )
            cust_number = (event.get("Caller-Caller-ID-Number") or "")[-10:]
            if cli_number and cust_number:
                try:
                    r = cache._client()
                    r.setex(f"inbound_cli:{cust_number}", 7200, cli_number)
                    logger.info(f"[INBOUND-DID-RINGING] Cached CLI={cli_number} keyed by customer={cust_number}")
                except Exception as exc:
                    logger.warning(f"[CACHE] inbound_cli set failed: {exc}")

        return True

    # ─── CHANNEL_ANSWER ───────────────────────────────────────────────────────
    def _handle_channel_answer(self, event: Dict[str, Any]) -> bool:
        leg       = _classify_leg(event)
        uuid      = event.get("Unique-ID", "")
        server_ip = event.get("FreeSWITCH-IPv4", "")
        ts        = now_ist().isoformat()

        if leg == "INBOUND_DID":
            cli_number  = (
                event.get("variable_sip_h_X-cliphonenumber") or
                event.get("variable_sip_to_user") or
                ""
            )
            cust_number = (event.get("Caller-Caller-ID-Number") or "")[-10:]
            logger.info(f"[INBOUND-DID-ANSWER] Caching CLI={cli_number!r} keyed by customer={cust_number}")
            if cli_number and cust_number:
                try:
                    cache._client().setex(f"inbound_cli:{cust_number}", 7200, cli_number)
                except Exception as exc:
                    logger.warning(f"[CACHE] inbound_cli set failed: {exc}")
            return True

        if leg == "INBOUND_AGENT":
            agent       = event.get("Caller-Callee-ID-Number") or event.get("Caller-Destination-Number", "")
            cust_number = event.get("Caller-Caller-ID-Number", "")
            cust_short  = cust_number[-10:] if cust_number else ""

            r          = cache._client()
            call_cache = {}
            try:
                call_cache = r.hgetall(f"call:{uuid}") or {}
            except Exception:
                pass
            cli_number = call_cache.get("cli_number") or ""
            if not cli_number and cust_short:
                try:
                    cli_number = r.get(f"inbound_cli:{cust_short}") or ""
                except Exception:
                    pass
            if not cli_number:
                cli_number = event.get("variable_sip_h_X-cliphonenumber") or ""

            if not agent:
                logger.warning(f"[INBOUND-ANSWER] No agent extension uuid={uuid}")
                return True

            logger.info(f"[INBOUND-ANSWER] Agent={agent} Customer={cust_short} CLI={cli_number} UUID={uuid}")

            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = 'INBOUND',
                               l_memberuuid          = %s,
                               l_memberStatus        = 'ONCALL',
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, (uuid, server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring INBOUND-ANSWER agent={agent}: {exc}")
                return False

            account = _resolve_account(agent, r)

            if account:
                acc_id, acc_no, membername = account
                try:
                    r.hset(f"call:{uuid}", mapping={
                        "acc_id": acc_id, "acc_no": acc_no, "agent": agent,
                        "server_ip": server_ip, "customer_number": cust_short,
                        "cli_number": cli_number, "direction": "INBOUND",
                    })
                    r.expire(f"call:{uuid}", 3600)
                except Exception:
                    pass

                try:
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            "UPDATE p_liveCallStatus SET l_callStatus = 'ONCALL', l_CliNumber = %s "
                            "WHERE l_callUUID = %s", (cli_number, uuid))
                        if cursor.rowcount == 0:
                            cursor.execute("""
                                INSERT INTO p_liveCallStatus
                                    (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                                     l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtention)
                                VALUES (%s, %s, %s, %s, 'INBOUND', 'ONCALL', %s, %s, %s)
                            """, (acc_id, acc_no, cli_number, cust_short, server_ip, uuid, agent))
                            logger.info(f"[DB] liveCallStatus INBOUND ONCALL (fallback insert) uuid={uuid}")
                            safe_emit(SOCKET_CALL_UPDATE, {
                                "type":             "CallInsertData",
                                "l_CliNumber":      cli_number,
                                "l_CustomerNumber": cust_short,
                                "l_callDirection":  "INBOUND",
                                "l_callStatus":     "ONCALL",
                                "l_callServerIP":   server_ip,
                                "l_callUUID":       uuid,
                                "m_memberName":     membername,
                            }, agent)
                        else:
                            logger.info(f"[DB] liveCallStatus INBOUND ONCALL (updated) uuid={uuid}")
                            safe_emit(SOCKET_CALL_UPDATE, {
                                "type":              "CallUpdateData",
                                "l_callUUID":        uuid,
                                "l_memberExtention": agent,
                                "l_CliNumber":       cli_number,
                                "l_callStatus":      "ONCALL",
                            }, agent)
                except Exception as exc:
                    logger.error(f"[DB] liveCallStatus INBOUND-ANSWER uuid={uuid}: {exc}")
                    return False
            else:
                logger.warning(f"[INBOUND-ANSWER] No account for agent={agent} — skipping liveCallStatus")

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":                 "AgentPresence",
                "extension":            agent,
                "status":               "INCALL",
                "memberCustomerNumber": cust_short,
                "memberCliNumberId":    cli_number,
                "memberCallDirection":  "INBOUND",
                "memberServerIp":       server_ip,
                "nowIst":               ist_str(),
            }, agent)

        elif leg == "OUTBOUND_AGENT":
            agent = event.get("Caller-Username", "")
            logger.info(f"[OUTBOUND-AGENT-ANSWER] Agent={agent} UUID={uuid}")
            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = 'OUTBOUND',
                               l_memberuuid          = %s,
                               l_memberStatus        = 'INCALL',
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, (uuid, server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring OUTBOUND-AGENT-ANSWER agent={agent}: {exc}")
                return False

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":                 "AgentPresence",
                "extension":            agent,
                "status":               "INCALL",
                "memberCustomerNumber": "",
                "memberCliNumberId":    "",
                "memberCallDirection":  "OUTBOUND",
                "memberServerIp":       server_ip,
                "nowIst":               ist_str(),
            }, agent)

        elif leg == "OUTBOUND_EXT":
            agent       = event.get("Caller-Username", "")
            cli_number  = event.get("Caller-Caller-ID-Number", "")
            cust_number = (event.get("Caller-Destination-Number") or "")[-10:]

            logger.info(f"[OUTBOUND-ANSWER] Agent={agent} Customer={cust_number} UUID={uuid}")

            r          = cache._client()
            call_cache = {}
            try:
                call_cache = r.hgetall(f"call:{uuid}") or {}
            except Exception:
                pass

            membername = agent
            if call_cache.get("acc_id"):
                acc_id     = call_cache["acc_id"]
                acc_no     = call_cache["acc_no"]
                cli_number = call_cache.get("cli_number", cli_number)
            else:
                account = _resolve_account(agent, r)
                if not account:
                    logger.warning(f"[OUTBOUND-ANSWER] No account for agent={agent}, skipping")
                    return True
                acc_id, acc_no, membername = account
                try:
                    r.hset(f"call:{uuid}", mapping={
                        "acc_id": acc_id, "acc_no": acc_no,
                        "cli_number": cli_number, "customer_number": cust_number,
                        "server_ip": server_ip, "agent": agent, "direction": "OUTBOUND",
                    })
                    r.expire(f"call:{uuid}", 3600)
                except Exception:
                    pass

            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE p_liveCallStatus SET l_callStatus = 'ONCALL' "
                        "WHERE l_callUUID = %s", (uuid,))
                    if cursor.rowcount == 0:
                        cursor.execute("""
                            INSERT INTO p_liveCallStatus
                                (l_accountId, l_accountNo, l_CliNumber, l_CustomerNumber,
                                 l_callDirection, l_callStatus, l_callServerIP, l_callUUID, l_memberExtention)
                            VALUES (%s, %s, %s, %s, 'OUTBOUND', 'ONCALL', %s, %s, %s)
                        """, (acc_id, acc_no, cli_number, cust_number, server_ip, uuid, agent))
                        logger.info(f"[DB] liveCallStatus OUTBOUND ONCALL (fallback insert) uuid={uuid}")
                        safe_emit(SOCKET_CALL_UPDATE, {
                            "type":             "CallInsertData",
                            "l_CliNumber":      cli_number,
                            "l_CustomerNumber": cust_number,
                            "l_callDirection":  "OUTBOUND",
                            "l_callStatus":     "ONCALL",
                            "l_callServerIP":   server_ip,
                            "l_callUUID":       uuid,
                            "m_memberName":     membername,
                        }, agent)
                    else:
                        logger.info(f"[DB] liveCallStatus OUTBOUND INCALL (updated) uuid={uuid}")
            except Exception as exc:
                logger.error(f"[DB] liveCallStatus OUTBOUND-ANSWER uuid={uuid}: {exc}")
                return False

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":              "CallUpdateData",
                "l_callUUID":        uuid,
                "l_memberExtention": agent,
                "l_callStatus":      "ONCALL",
            }, agent)

        return True

    # ─── CHANNEL_HANGUP_COMPLETE ──────────────────────────────────────────────
    def _handle_channel_hangup_complete(self, event: Dict[str, Any]) -> bool:
        leg          = _classify_leg(event)
        uuid         = event.get("Unique-ID", "")
        server_ip    = event.get("FreeSWITCH-IPv4", "")
        hangup_cause = event.get("Hangup-Cause", "")
        ts           = now_ist().isoformat()

        if leg == "INBOUND_AGENT":
            agent      = event.get("Caller-Callee-ID-Number") or event.get("Caller-Destination-Number", "")
            cust_short = (event.get("Caller-Caller-ID-Number") or "")[-10:]

            if not agent:
                logger.warning(f"[INBOUND-HANGUP] No agent extension uuid={uuid}")
                return True

            logger.info(f"[INBOUND-HANGUP] Agent={agent} UUID={uuid} Cause={hangup_cause}")

            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = 'INBOUND',
                               l_memberuuid          = '',
                               l_memberStatus        = 'AVAILABLE',
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, (server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring INBOUND-HANGUP agent={agent}: {exc}")
                return False

            try:
                r = cache._client()
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "DELETE FROM p_liveCallStatus WHERE l_callUUID = %s", (uuid,))
                try:
                    r.delete(f"call:{uuid}")
                    safe_emit(SOCKET_CALL_UPDATE, {
                        "type":         "CallCompletedData",
                        "l_callUUID":   uuid,
                        "l_callStatus": "COMPLETED",
                    }, agent)
                except Exception:
                    pass
                logger.info(f"[DB] liveCallStatus INBOUND DELETED uuid={uuid}")
            except Exception as exc:
                logger.error(f"[DB] liveCallStatus INBOUND-HANGUP uuid={uuid}: {exc}")
                return False

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":                 "AgentPresence",
                "extension":            agent,
                "status":               "AVAILABLE",
                "memberCustomerNumber": "",
                "memberCliNumberId":    "",
                "memberCallDirection":  "INBOUND",
                "memberServerIp":       server_ip,
                "nowIst":               ist_str(),
            }, agent)

        elif leg == "INBOUND_DID":
            real_agent = event.get("Caller-Callee-ID-Number", "")
            logger.info(f"[INBOUND-DID-HANGUP] Agent={real_agent} UUID={uuid} Cause={hangup_cause}")

            if real_agent:
                try:
                    with db.get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE p_liveMonitoring
                            SET    l_memberCallDirection = 'INBOUND',
                                   l_memberuuid          = '',
                                   l_memberStatus        = 'AVAILABLE',
                                   l_memberServerIp      = %s
                            WHERE  l_memberExtention = %s
                              AND  l_memberStatus   != 'AVAILABLE'
                        """, (server_ip, real_agent))
                except Exception as exc:
                    logger.error(f"[DB] liveMonitoring INBOUND-DID-HANGUP agent={real_agent}: {exc}")
                    return False

                safe_emit(SOCKET_CALL_UPDATE, {
                    "type":                 "AgentPresence",
                    "extension":            real_agent,
                    "status":               "AVAILABLE",
                    "memberCustomerNumber": "",
                    "memberCliNumberId":    "",
                    "memberCallDirection":  "INBOUND",
                    "memberServerIp":       server_ip,
                    "nowIst":               ist_str(),
                }, real_agent)

        elif leg == "OUTBOUND_EXT":
            agent = event.get("Caller-Username", "")
            logger.info(f"[OUTBOUND-HANGUP] Agent={agent} UUID={uuid} Cause={hangup_cause}")

            try:
                r = cache._client()
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "DELETE FROM p_liveCallStatus WHERE l_callUUID = %s", (uuid,))
                try:
                    r.delete(f"call:{uuid}")
                except Exception:
                    pass
                logger.info(f"[DB] liveCallStatus OUTBOUND DELETED uuid={uuid}")
            except Exception as exc:
                logger.error(f"[DB] liveCallStatus OUTBOUND-HANGUP uuid={uuid}: {exc}")
                return False

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":         "CallCompletedData",
                "l_callUUID":   uuid,
                "l_callStatus": "COMPLETED",
            }, agent)

        elif leg == "OUTBOUND_AGENT":
            agent = event.get("Caller-Username", "")
            logger.info(f"[OUTBOUND-AGENT-HANGUP] Agent={agent} UUID={uuid}")

            try:
                with db.get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberCallDirection = 'OUTBOUND',
                               l_memberuuid          = '',
                               l_memberStatus        = 'AVAILABLE',
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                    """, (server_ip, agent))
            except Exception as exc:
                logger.error(f"[DB] liveMonitoring OUTBOUND-AGENT-HANGUP agent={agent}: {exc}")
                return False

            safe_emit(SOCKET_CALL_UPDATE, {
                "type":                 "AgentPresence",
                "extension":            agent,
                "status":               "AVAILABLE",
                "memberCustomerNumber": "",
                "memberCliNumberId":    "",
                "memberCallDirection":  "OUTBOUND",
                "memberServerIp":       server_ip,
                "nowIst":               ist_str(),
            }, agent)

        return True

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
            # Queue socket events are broadcast to the account admin room.
            # acc_id e.g. "195" → safe_emit ext_str[:-4] hits the else branch
            # (len<=4) and keeps "195" as-is — matching what the frontend expects.
            adminext = str(acc_id)
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
                    logger.info(f"[CC] Queue={queue_id} Terminated — handled by bridge-agent-start")

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
# FreeSWITCH ESL Reconciler
# ─────────────────────────────────────────
# Every RECONCILE_INTERVAL seconds this background thread:
#   1. Loads all rows from p_liveCallStatus
#   2. Groups them by l_callServerIP
#   3. Opens an ESL connection to each FS server and runs:
#        show channels as json
#   4. Any UUID present in the DB but absent from FS is a ghost call
#      and is cleaned up identically to a CHANNEL_HANGUP_COMPLETE event.
#
# ESL library usage (ESL.ESLconnection):
#   conn = ESL.ESLconnection(host, port, password)
#   conn.connected()           → bool (auth + connect result)
#   conn.api("show channels as json")  → ESLevent
#   esl_event.getBody()        → str  (JSON payload)
#   conn.disconnect()          → cleanup
# ─────────────────────────────────────────

# ── ESL tunables (override via settings / env vars) ──────────────────────────
_ESL_PORT     = getattr(settings, "FREESWITCH_ESL_PORT",     8021)
_ESL_PASSWORD = getattr(settings, "FREESWITCH_ESL_PASSWORD", "Pulse#$2024")
_ESL_TIMEOUT  = getattr(settings, "FREESWITCH_ESL_TIMEOUT",  10)
_RECONCILE_INTERVAL = getattr(settings, "RECONCILE_INTERVAL", 300)

# Per-server ESL password overrides.
# When a FreeSWITCH server uses a different password than the global default,
# add it here:  { "10.0.4.90": "ServerSpecificPass", ... }
# Sourced from settings.FREESWITCH_ESL_PASSWORDS (dict) if present, else {}.
_ESL_PASSWORDS: Dict[str, str] = getattr(settings, "FREESWITCH_ESL_PASSWORDS", {})


def _esl_password_for(fs_ip: str) -> str:
    """Return the ESL password for fs_ip, falling back to the global default."""
    return _ESL_PASSWORDS.get(fs_ip, _ESL_PASSWORD)


def _get_fs_active_uuids(fs_ip: str) -> Optional[Set[str]]:
    """
    Connect to FreeSWITCH ESL at fs_ip using the ESL library and return
    the set of active channel UUIDs.  Returns None if the server is
    unreachable so the caller can skip that server without false-positive
    ghost detection.

    Command used: show channels as json
    ─────────────────────────────────────────
    NOTE: When using ESL.ESLconnection.api(), do NOT prefix with "api" —
    the library handles the ESL wire protocol prefix automatically.
    At the FS console: show channels as json
    Via ESL library:   conn.api("show channels as json")

    Response when channels exist
    ────────────────────────────
    {
      "row_count": 2,
      "rows": [
        {"uuid": "462cba02-...", "direction": "inbound", "callstate": "ACTIVE", ...},
        {"uuid": "4ee27517-...", "direction": "outbound", "callstate": "DOWN",  ...}
      ]
    }

    Response when no channels exist
    ────────────────────────────────
    {"row_count": 0}   OR   empty body

    We collect ALL UUIDs regardless of callstate — even DOWN/RINGING legs
    are still FreeSWITCH-managed; only rows completely absent from the
    response are true ghosts.
    """
    conn = None
    try:
        conn = ESL.ESLconnection(fs_ip, str(_ESL_PORT), _esl_password_for(fs_ip))

        if not conn.connected():
            logger.warning(f"[ESL:{fs_ip}] Connection failed (not connected)")
            return None

        esl_event = conn.api("show channels as json")

        if esl_event is None:
            logger.warning(f"[ESL:{fs_ip}] api() returned None — treating as no channels")
            return set()

        body = esl_event.getBody()

        if not body or not body.strip():
            logger.info(f"[ESL:{fs_ip}] Empty response body — no active channels")
            return set()

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            logger.warning(
                f"[ESL:{fs_ip}] Non-JSON response (treating as no channels): "
                f"{body[:200]!r}"
            )
            return set()

        rows = data.get("rows") or []
        uuids: Set[str] = set()
        for row in rows:
            uid = row.get("uuid") or row.get("UUID") or ""
            if uid:
                uuids.add(uid)

        logger.info(
            f"[ESL:{fs_ip}] {len(uuids)} channel(s) active "
            f"(row_count={data.get('row_count', '?')})"
        )
        return uuids

    except Exception as exc:
        logger.error(f"[ESL:{fs_ip}] Unexpected error: {exc}", exc_info=True)
        return None
    finally:
        if conn is not None:
            try:
                conn.disconnect()
            except Exception:
                pass


class FreeSwitchReconciler:
    """
    Background ghost-call reconciler.

    Parameters
    ----------
    interval : int
        Seconds between reconciliation passes (default: _RECONCILE_INTERVAL).
    """

    def __init__(self, interval: int = _RECONCILE_INTERVAL):
        self.interval      = interval
        self._lock         = threading.Lock()   # serialise overlapping runs
        self._last_run_ts: Optional[float] = None
        self._ghost_total  = 0

    # ── Public API ────────────────────────────────────────────────────────────

    def start(self):
        """Spawn the daemon thread."""
        t = threading.Thread(target=self._loop, daemon=True, name="FSReconciler")
        t.start()
        logger.info(
            f"✅ FSReconciler started  interval={self.interval}s  "
            f"esl_port={_ESL_PORT}  first_run_in={self.interval // 2}s")

    def run_once(self) -> int:
        """Run one reconciliation pass immediately (thread-safe)."""
        with self._lock:
            return self._reconcile()

    def status(self) -> Dict[str, Any]:
        return {
            "last_run_ts":  self._last_run_ts,
            "ghost_total":  self._ghost_total,
            "interval_sec": self.interval,
            "esl_port":     _ESL_PORT,
        }

    # ── Internal loop ─────────────────────────────────────────────────────────

    def _loop(self):
        # Stagger first run so we don't hammer FS immediately at boot
        shutdown_event.wait(timeout=self.interval // 2)
        while not shutdown_event.is_set():
            try:
                self.run_once()
            except Exception as exc:
                logger.error(f"[FSReconciler] Unhandled error: {exc}", exc_info=True)
            shutdown_event.wait(timeout=self.interval)

    # ── Core logic ────────────────────────────────────────────────────────────

    def _reconcile(self) -> int:
        self._last_run_ts = time.time()
        logger.info("[FSReconciler] ── Starting reconciliation pass ─────────────────")

        # Step 1: snapshot DB
        try:
            db_rows = self._fetch_live_calls()
        except Exception as exc:
            logger.error(f"[FSReconciler] Could not load p_liveCallStatus: {exc}")
            return 0

        if not db_rows:
            logger.info("[FSReconciler] p_liveCallStatus is empty — nothing to reconcile")
            return 0

        logger.info(f"[FSReconciler] {len(db_rows)} call(s) tracked in p_liveCallStatus")

        # Step 2: group by server IP
        by_server: Dict[str, List[Dict]] = {}
        for row in db_rows:
            ip = row.get("l_callServerIP") or ""
            by_server.setdefault(ip, []).append(row)

        # Step 3 & 4: query each FS in parallel, detect ghosts
        # Sequential queries block for _ESL_TIMEOUT per unreachable server.
        # Parallel queries cap total wait to _ESL_TIMEOUT regardless of server count.
        import concurrent.futures

        ghost_count = 0
        valid_servers = {ip: calls for ip, calls in by_server.items() if ip}
        skipped_no_ip = sum(len(c) for ip, c in by_server.items() if not ip)
        if skipped_no_ip:
            logger.warning(f"[FSReconciler] {skipped_no_ip} row(s) with no l_callServerIP — skipping")

        # Query all servers concurrently
        fs_results: Dict[str, Optional[Set[str]]] = {}
        with concurrent.futures.ThreadPoolExecutor(
                max_workers=len(valid_servers) or 1,
                thread_name_prefix="ESLQuery") as pool:
            future_to_ip = {
                pool.submit(_get_fs_active_uuids, fs_ip): fs_ip
                for fs_ip in valid_servers
            }
            for future in concurrent.futures.as_completed(future_to_ip):
                fs_ip = future_to_ip[future]
                try:
                    fs_results[fs_ip] = future.result()
                except Exception as exc:
                    logger.error(f"[FSReconciler] ESL query thread error {fs_ip}: {exc}")
                    fs_results[fs_ip] = None

        for fs_ip, calls in valid_servers.items():
            active_uuids = fs_results.get(fs_ip)
            logger.info(f"[FSReconciler] Checking FS at {fs_ip} for {len(calls)} tracked call(s)")
            if active_uuids is None:
                logger.warning(
                    f"[FSReconciler] ESL unreachable at {fs_ip} — skipping to avoid false positives")
                continue

            for call in calls:
                uuid = call.get("l_callUUID") or ""
                if uuid and uuid not in active_uuids:
                    logger.warning(
                        f"[FSReconciler] 👻 Ghost detected  uuid={uuid}  "
                        f"agent={call.get('l_memberExtention', '')}  "
                        f"dir={call.get('l_callDirection', '')}  "
                        f"status={call.get('l_callStatus', '')}  "
                        f"server={fs_ip}")
                    if self._cleanup_ghost(call, fs_ip):
                        ghost_count += 1

        self._ghost_total += ghost_count
        logger.info(
            f"[FSReconciler] Pass complete — "
            f"ghosts_this_pass={ghost_count}  lifetime_total={self._ghost_total}")
        return ghost_count

    # ── DB snapshot ───────────────────────────────────────────────────────────

    def _fetch_live_calls(self) -> List[Dict[str, Any]]:
        with db.get_conn() as conn:
            cur = conn.cursor(dictionary=True)
            cur.execute("""
                SELECT l_callUUID, l_callServerIP, l_callDirection,
                       l_memberExtention, l_CliNumber, l_CustomerNumber,
                       l_accountId, l_accountNo, l_callStatus
                FROM   p_liveCallStatus
            """)
            return cur.fetchall() or []

    # ── Ghost cleanup ─────────────────────────────────────────────────────────

    def _cleanup_ghost(self, call: Dict[str, Any], fs_ip: str) -> bool:
        """
        Mirrors the CHANNEL_HANGUP_COMPLETE cleanup path exactly:
          1. DELETE from p_liveCallStatus
          2. Conditional UPDATE on p_liveMonitoring (only if uuid still matches)
          3. Redis call cache eviction
          4. Socket.IO CallCompletedData + AgentPresence AVAILABLE
        """
        uuid      = call.get("l_callUUID",       "")
        agent_ext = call.get("l_memberExtention", "")
        direction = call.get("l_callDirection",   "")
        server_ip = call.get("l_callServerIP",    fs_ip)

        try:
            # 1. Remove from p_liveCallStatus
            with db.get_conn() as conn:
                cur = conn.cursor()
                cur.execute(
                    "DELETE FROM p_liveCallStatus WHERE l_callUUID = %s", (uuid,))
                deleted = cur.rowcount
            logger.info(
                f"[FSReconciler] Deleted {deleted} p_liveCallStatus row(s) uuid={uuid}")

            # 2. Reset p_liveMonitoring — conditional on uuid still matching
            #    to protect a new call that started between snapshot and now.
            if agent_ext:
                with db.get_conn() as conn:
                    cur = conn.cursor()
                    cur.execute("""
                        UPDATE p_liveMonitoring
                        SET    l_memberStatus        = 'AVAILABLE',
                               l_memberuuid          = '',
                               l_memberCallDirection = %s,
                               l_memberServerIp      = %s
                        WHERE  l_memberExtention = %s
                          AND  l_memberuuid      = %s
                    """, (direction, server_ip, agent_ext, uuid))
                    updated = cur.rowcount
                logger.info(
                    f"[FSReconciler] liveMonitoring rows reset={updated}  agent={agent_ext}")

            # 3. Redis eviction
            try:
                cache._client().delete(f"call:{uuid}")
            except Exception as rexc:
                logger.warning(f"[FSReconciler] Redis delete failed uuid={uuid}: {rexc}")

            # 4. Socket.IO events
            if agent_ext:
                safe_emit(SOCKET_CALL_UPDATE, {
                    "type":         "CallCompletedData",
                    "l_callUUID":   uuid,
                    "l_callStatus": "COMPLETED",
                    "source":       "reconciler",
                }, agent_ext)

                safe_emit(SOCKET_CALL_UPDATE, {
                    "type":                 "AgentPresence",
                    "extension":            agent_ext,
                    "status":               "AVAILABLE",
                    "memberCustomerNumber": "",
                    "memberCliNumberId":    "",
                    "memberCallDirection":  direction,
                    "memberServerIp":       server_ip,
                    "nowIst":               ist_str(),
                    "source":               "reconciler",
                }, agent_ext)

            metrics.increment_processed()
            return True

        except Exception as exc:
            logger.error(
                f"[FSReconciler] cleanup_ghost failed uuid={uuid}: {exc}", exc_info=True)
            metrics.increment_db_errors()
            return False


# Singleton — created before start_health_server so /health can reference it
reconciler = FreeSwitchReconciler(interval=_RECONCILE_INTERVAL)


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
        f"FreeSWITCH ESL Kafka Consumer starting "
        f"  broker={settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
        f"  topic={settings.KAFKA_TOPIC}"
        f"  group={settings.KAFKA_GROUP_ID}"
    )

    start_health_server(settings.HEALTH_CHECK_PORT)
    threading.Thread(target=_periodic_flush, daemon=True, name="PeriodicFlush").start()
    threading.Thread(target=_stats_reporter,  daemon=True, name="StatsReporter").start()

    # ── FreeSWITCH ghost-call reconciler ─────────────────────────────────────
    reconciler.start()

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
