"""
Predictive Dialer – Originate Consumer
Consumes dialer.dial_command from Kafka and fires calls via FreeSWITCH ESL.

KEY FIXES vs previous version:
  • Missing comma between campaignName and clinumberId variables corrected —
    the previous version concatenated them into one malformed channel variable,
    silently breaking every originate string.
  • campaign_cps field from the DIAL_COMMAND event is now used by the per-
    campaign RateLimiter so CPS limits configured in campaign rules are honoured.
  • _connect deadline threading propagated correctly through ensure_connected
    and get_connection so pool timeouts are always respected.
"""

import json
import logging
import os
import random
import signal
import sys
import threading
import time
from typing import Dict, List, Optional
import uuid

from confluent_kafka import Consumer, Producer, KafkaError
from confluent_kafka.admin import AdminClient, NewTopic
from xmlrpc.client import ServerProxy
from urllib.parse import quote
from config import settings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

KAFKA_TOPIC           = os.getenv("KAFKA_TOPIC", "dialer.dial_command")
DLQ_TOPIC             = os.getenv("DLQ_TOPIC",   "dialer.dial_command.dlq")

_FS_SERVERS_RAW: List[Dict] = json.loads(
    os.getenv(
        "FS_SERVERS",
        json.dumps([
            {
                "host":     settings.FS_HOST_1,
                "port":     int(os.getenv("FS_PORT_1", 8021)),
                "password": settings.FS_PASSWORD_1,
            },
            {
                "host":     settings.FS_HOST_2,
                "port":     int(os.getenv("FS_PORT_2", 8021)),
                "password": settings.FS_PASSWORD_2,
            },
        ]),
    )
)

DEFAULT_CAMPAIGN_CPS      = int(os.getenv("DEFAULT_CAMPAIGN_CPS", 5))
MAX_RETRIES               = int(os.getenv("MAX_RETRIES", 3))
XMLRPC_CONNECT_TIMEOUT    = int(os.getenv("XMLRPC_CONNECT_TIMEOUT", 5))
XMLRPC_CONNECT_RETRIES    = int(os.getenv("XMLRPC_CONNECT_RETRIES", 3))
HEALTH_CHECK_INTERVAL     = int(os.getenv("HEALTH_CHECK_INTERVAL", 30))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("dialer-originate")

# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------
_stop_event = threading.Event()


def _shutdown_handler(sig, frame):
    logger.info("Shutdown signal received, stopping consumer…")
    _stop_event.set()


signal.signal(signal.SIGINT,  _shutdown_handler)
signal.signal(signal.SIGTERM, _shutdown_handler)


# ---------------------------------------------------------------------------
# Kafka topic bootstrap
# ---------------------------------------------------------------------------
def ensure_topics_exist():
    bootstrap = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
    admin     = AdminClient({"bootstrap.servers": bootstrap})
    required  = [KAFKA_TOPIC, DLQ_TOPIC]
    existing  = set(admin.list_topics(timeout=10).topics.keys())
    to_create = [
        NewTopic(t, num_partitions=3, replication_factor=1)
        for t in required
        if t not in existing
    ]
    if not to_create:
        logger.info("All topics already exist: %s", required)
        return
    for topic, future in admin.create_topics(to_create).items():
        try:
            future.result()
            logger.info("Kafka topic created: %s", topic)
        except Exception as exc:
            logger.info("Could not create topic '%s': %s", topic, exc)


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------
class CircuitBreaker:
    def __init__(self, max_failures: int = 10, reset_timeout: int = 30):
        self.max_failures  = max_failures
        self.reset_timeout = reset_timeout
        self._lock           = threading.Lock()
        self._failures       = 0
        self._total_failures = 0
        self._last_failure   = 0.0

    def allow(self) -> bool:
        with self._lock:
            if self._failures < self.max_failures:
                return True
            if (time.monotonic() - self._last_failure) > self.reset_timeout:
                logger.info("Circuit breaker reset for server")
                self._failures = 0
                return True
            return False

    def success(self):
        with self._lock:
            self._failures     = 0
            self._last_failure = 0.0

    def failure(self):
        with self._lock:
            self._failures      += 1
            self._total_failures += 1
            self._last_failure   = time.monotonic()
            if self._failures >= self.max_failures:
                logger.warning(
                    "Circuit breaker opened (failures=%d, total=%d)",
                    self._failures, self._total_failures,
                )

    @property
    def failures(self) -> int:
        return self._failures

    @property
    def total_failures(self) -> int:
        return self._total_failures


# ---------------------------------------------------------------------------
# XML-RPC Wrapper
# ---------------------------------------------------------------------------
class XMLRPCWrapper:
    def __init__(self, host: str, port: int, password: str, max_calls: int = 20):
        self.host     = host
        self.port     = port
        self.password = password

        self._conn:      Optional[ServerProxy] = None
        self._lock       = threading.Lock()
        self._semaphore  = threading.Semaphore(max_calls)

        self.breaker            = CircuitBreaker()
        self._last_health_check = 0.0
        self._is_connected      = False
        self.success_count      = 0
        self.failure_count      = 0

        logger.info(
            "FreeSWITCH wrapper initialised for XML-RPC to %s:8080 (lazy connect)", host
        )

    def _make_proxy(self) -> ServerProxy:
        password   = quote(self.password, safe="")
        xmlrpc_url = f"http://admin:{password}@{self.host}:8080"
        return ServerProxy(xmlrpc_url, use_datetime=False)

    def _connect(self, deadline: Optional[float] = None, max_attempts: int = XMLRPC_CONNECT_RETRIES):
        import socket

        for attempt in range(max_attempts):
            if deadline is not None and time.monotonic() >= deadline:
                raise TimeoutError(
                    f"Connection deadline exceeded for {self.host} before attempt {attempt + 1}"
                )

            try:
                logger.info(
                    "Connecting to FreeSWITCH XML-RPC %s (attempt %d/%d)",
                    self.host, attempt + 1, max_attempts,
                )
                conn = self._make_proxy()

                old_timeout = socket.getdefaulttimeout()
                socket.setdefaulttimeout(XMLRPC_CONNECT_TIMEOUT)
                try:
                    response = conn.freeswitch.api("status", "")
                finally:
                    socket.setdefaulttimeout(old_timeout)

                if response:
                    self._conn              = conn
                    self._is_connected      = True
                    self._last_health_check = time.monotonic()
                    logger.info("Connected to FreeSWITCH XML-RPC %s", self.host)
                    return
                else:
                    logger.warning(
                        "Empty status response from %s (attempt %d/%d)",
                        self.host, attempt + 1, max_attempts,
                    )

            except (OSError, TimeoutError, Exception) as exc:
                logger.warning(
                    "ESL connection error %s:%s (attempt %d/%d): %s",
                    self.host, self.port, attempt + 1, max_attempts, exc,
                )

            if attempt < max_attempts - 1:
                sleep_time = min(2 ** attempt, 8)
                if deadline is not None:
                    remaining  = deadline - time.monotonic()
                    sleep_time = min(sleep_time, remaining)
                    if sleep_time <= 0:
                        break
                logger.info("Waiting %.1fs before retry…", sleep_time)
                time.sleep(sleep_time)

        self._is_connected = False
        raise ConnectionError(
            f"ESL connection to {self.host}:{self.port} failed after {max_attempts} attempts"
        )

    def health_check(self) -> bool:
        import socket
        try:
            with self._lock:
                if not self._conn:
                    return False
                conn = self._conn

            old_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(XMLRPC_CONNECT_TIMEOUT)
            try:
                response = conn.freeswitch.api("status", "")
            finally:
                socket.setdefaulttimeout(old_timeout)

            if response:
                self._last_health_check = time.monotonic()
                return True
            return False
        except Exception as exc:
            logger.warning("Health check failed for %s:%s: %s", self.host, self.port, exc)
            return False

    def ensure_connected(self, deadline: Optional[float] = None):
        if self._is_connected and self._conn:
            if time.monotonic() - self._last_health_check > HEALTH_CHECK_INTERVAL:
                if not self.health_check():
                    logger.warning("Health check failed for %s, reconnecting…", self.host)
                    with self._lock:
                        self._is_connected = False
                        self._conn         = None
                    self._connect(deadline=deadline)
            return

        with self._lock:
            if self._is_connected and self._conn:
                return
            status             = "lost" if self._conn else "new"
            self._is_connected = False
            self._conn         = None
            logger.info("%s connection for XML-RPC %s, connecting…", status, self.host)

        self._connect(deadline=deadline)

    def get_connection(self, deadline: Optional[float] = None) -> ServerProxy:
        if not self.breaker.allow():
            raise RuntimeError(
                f"Circuit breaker open for {self.host} "
                f"(failures: {self.breaker.failures}/{self.breaker.max_failures})"
            )
        self.ensure_connected(deadline=deadline)
        if self._conn is None:
            raise ConnectionError(f"No connection available for {self.host}")
        return self._conn

    @property
    def semaphore(self):
        return self._semaphore

    def record_success(self):
        self.success_count += 1
        self.breaker.success()

    def record_failure(self):
        self.failure_count += 1
        self.breaker.failure()

    def get_stats(self) -> dict:
        return {
            "host":                           self.host,
            "port":                           self.port,
            "success_count":                  self.success_count,
            "failure_count":                  self.failure_count,
            "circuit_breaker_failures":       self.breaker.failures,
            "circuit_breaker_total_failures": self.breaker.total_failures,
            "is_available":                   self.breaker.allow(),
            "last_health_check":              self._last_health_check,
        }


# ---------------------------------------------------------------------------
# FreeSWITCH Pool
# ---------------------------------------------------------------------------
class FreeSwitchPool:
    def __init__(self, servers: List[XMLRPCWrapper]):
        self.servers = servers
        self._lock   = threading.Lock()

    def get(self, timeout: int = 15) -> XMLRPCWrapper:
        deadline      = time.monotonic() + timeout
        attempt_count = 0
        last_log      = time.monotonic()

        logger.info(
            "FreeSwitchPool.get called | servers=%d timeout=%ds",
            len(self.servers), timeout,
        )

        while time.monotonic() < deadline:
            if _stop_event.is_set():
                raise RuntimeError("Pool.get aborted: shutdown in progress")

            attempt_count += 1
            remaining     = deadline - time.monotonic()

            with self._lock:
                available = [s for s in self.servers if s.breaker.allow()]

            if not available:
                if time.monotonic() - last_log >= 1.0:
                    logger.warning(
                        "No servers available (attempt %d, %.1fs remaining)",
                        attempt_count, remaining,
                    )
                    last_log = time.monotonic()
                sleep = min(1.0, max(0.0, deadline - time.monotonic()))
                if sleep > 0:
                    time.sleep(sleep)
                continue

            random.shuffle(available)

            for server in available:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break

                try:
                    conn = server.get_connection(deadline=deadline)
                    if conn:
                        return server

                except ConnectionError as exc:
                    logger.warning(
                        "FS %s:%s connection failed: %s (CB: %d/%d)",
                        server.host, server.port, exc,
                        server.breaker.failures, server.breaker.max_failures,
                    )
                    server.record_failure()

                except RuntimeError:
                    pass  # Circuit breaker open — skip silently

                except Exception as exc:
                    logger.warning("FS %s:%s unexpected error: %s", server.host, server.port, exc)
                    server.record_failure()

            sleep = min(0.25, max(0.0, deadline - time.monotonic()))
            if sleep > 0:
                time.sleep(sleep)

        self.log_stats()
        raise RuntimeError(
            f"No FreeSWITCH servers available after {timeout}s ({attempt_count} attempts)"
        )

    def log_stats(self):
        logger.info("=== FreeSWITCH Pool Statistics ===")
        for s in self.servers:
            st = s.get_stats()
            logger.info(
                "Server %s:%s | success=%d failures=%d CB=%d/%d available=%s",
                st["host"], st["port"],
                st["success_count"], st["failure_count"],
                st["circuit_breaker_failures"], st["circuit_breaker_total_failures"],
                st["is_available"],
            )

    def get_available_count(self) -> int:
        return sum(1 for s in self.servers if s.breaker.allow())


# ---------------------------------------------------------------------------
# Rate Limiter (token-bucket, per campaign)
# ---------------------------------------------------------------------------
class RateLimiter:
    def __init__(self, cps: int):
        self.cps     = cps
        self._tokens = float(cps)
        self._last   = time.monotonic()
        self._lock   = threading.Lock()

    def allow(self) -> bool:
        with self._lock:
            now          = time.monotonic()
            self._tokens = min(self.cps, self._tokens + (now - self._last) * self.cps)
            self._last   = now
            if self._tokens < 1:
                return False
            self._tokens -= 1
            return True

    def wait_if_needed(self, max_wait: float = 1.0) -> bool:
        deadline = time.monotonic() + max_wait
        while time.monotonic() < deadline:
            if self.allow():
                return True
            time.sleep(0.01)
        return False


_campaign_limiters: Dict[str, RateLimiter] = {}
_campaign_limiter_lock = threading.Lock()


def get_campaign_limiter(campaign_id: str, cps: int) -> RateLimiter:
    with _campaign_limiter_lock:
        if campaign_id not in _campaign_limiters:
            _campaign_limiters[campaign_id] = RateLimiter(cps)
        return _campaign_limiters[campaign_id]


# ---------------------------------------------------------------------------
# Pool initialisation
# ---------------------------------------------------------------------------
fs_pool = FreeSwitchPool([XMLRPCWrapper(**cfg) for cfg in _FS_SERVERS_RAW])


# ---------------------------------------------------------------------------
# Business logic
# ---------------------------------------------------------------------------
_REQUIRED_FIELDS = frozenset([
    "event_type", "campaign_id", "lead_id",
    "account_id", "account_no", "phone_number", "timestamp",
])


def process_dial_command(event: dict):
    missing = _REQUIRED_FIELDS - event.keys()
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(sorted(missing))}")


def originate_call(event: dict):
    """Originate a call through FreeSWITCH with retry + rate limiting."""
    campaign_id  = str(event["campaign_id"])
    # Honour per-campaign CPS forwarded by Predectivelogic; fall back to default
    cps          = int(event.get("campaign_cps", DEFAULT_CAMPAIGN_CPS))
    limiter      = get_campaign_limiter(campaign_id, cps)

    logger.info(
        "Originating call | lead=%s campaign=%s cps=%d",
        event["lead_id"], campaign_id, cps,
    )

    for attempt in range(MAX_RETRIES):
        if not limiter.wait_if_needed(max_wait=2.0):
            logger.warning(
                "Rate limit exceeded for campaign %s (CPS=%d), attempt %d/%d",
                campaign_id, cps, attempt + 1, MAX_RETRIES,
            )
            if attempt < MAX_RETRIES - 1:
                time.sleep(0.1)
                continue
            raise RuntimeError(f"Rate limit timeout for campaign {campaign_id}")

        try:
            server = fs_pool.get(timeout=15)
        except RuntimeError as exc:
            logger.warning("Failed to get FreeSWITCH server: %s", exc)
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(min(2 ** attempt, 8))
            continue

        try:
            with server.semaphore:
                conn      = server.get_connection()
                call_uuid = str(uuid.uuid4())

                country_prefix = getattr(settings, "COUNTRY_PREFIX", "91")

                # -----------------------------------------------------------------
                # FIX: each variable is a SEPARATE list element with its own comma.
                # Previously campaignName and clinumberId were accidentally
                # concatenated into one string (missing comma), producing a
                # malformed variable that FreeSWITCH silently ignores — both
                # values were lost from the channel.
                # -----------------------------------------------------------------
                variables = [
                    f"sip_h_X-uniqueId={call_uuid}",
                    f"sip_req_user=pulseOutboundPredictive",
                    f"sip_to_user=pulseOutboundPredictive",
                    f"accountPrefix={event['c_accountPrefix']}",
                    f"peerName={event['p_peerName']}",
                    f"customerNumber={event['phone_number']}",
                    f"callerid={event['c_clinumberName']}",
                    f"accountid={event['account_id']}",
                    f"accountno={event['account_no']}",
                    f"campaignid={event['campaign_id']}",
                    f"campaignName={event['c_campaignName'].replace(' ', '')}",   # FIX: comma here
                    f"clinumberId={event['c_clinumberId']}",
                    f"clinumberName={event['c_clinumberName']}",
                    f"c_queuegroupId={event['c_queuegroupId']}",
                    f"Caller-Username={event['phone_number']}",
                    f"leadId={event['lead_id']}",
                    f"call_limit={event['calllimit']}",
                    f"origination_caller_id_name={country_prefix}{event['c_clinumberName']}",
                    f"sip_h_X-clicktocall=true",
                    f"origination_caller_id_number={country_prefix}{event['c_clinumberName']}",
                    f"sip_h_X-fscallerid={country_prefix}{event['c_clinumberName']}",
                    "sip_sticky_contact=true",
                    "progress_timeout=20",
                    "hangup_after_bridge=true",
                    "ignore_early_media=ring_ready",
                    "api_hangup_hook='lua /opt/freeswitch/storage/script/Predictive_inbound_post_data.lua'",
                ]

                variables_str = ",".join(variables)
                dial_string   = (
                    f"sofia/gateway/{event['p_peerName']}/"
                    f"{event['c_accountPrefix']}{country_prefix}{event['phone_number']} "
                    f"pulseOutboundPredictive XML public {event['phone_number']}"
                )
                originate_cmd = f"originate {{{variables_str}}}{dial_string}"
                logger.info(
                    "Executing originate: %s",
                    (originate_cmd[:200] + "…") if len(originate_cmd) > 200 else originate_cmd,
                )

                response = conn.freeswitch.api("bgapi", originate_cmd)
                body     = str(response)

                if not body:
                    raise RuntimeError("Empty FreeSWITCH response")
                if "-ERR" in body:
                    raise RuntimeError(f"FreeSWITCH error: {body}")

                server.record_success()
                logger.info(
                    "Call originated via %s:%s | lead=%s campaign=%s uuid=%s response=%s",
                    server.host, server.port,
                    event["lead_id"], campaign_id, call_uuid, body[:200].strip(),
                )
                return {
                    "statusCode": 200,
                    "body": json.dumps({
                        "status": "SUCCESS",
                        "code":   "200",
                        "unique_call_identifier": call_uuid,
                    }),
                    "headers": {"Content-Type": "application/json"},
                }

        except Exception as exc:
            server.record_failure()
            logger.warning(
                "Originate failed via %s:%s (attempt %d/%d): %s",
                server.host, server.port, attempt + 1, MAX_RETRIES, exc,
            )
            if attempt == MAX_RETRIES - 1:
                logger.error(
                    "All originate attempts exhausted for lead=%s campaign=%s",
                    event["lead_id"], campaign_id,
                )
                raise
            time.sleep(min(2 ** attempt, 8))


# ---------------------------------------------------------------------------
# Dead Letter Queue
# ---------------------------------------------------------------------------
def send_to_dlq(producer: Producer, msg, reason: str):
    try:
        payload = {
            "reason":           reason,
            "original_message": msg.value().decode("utf-8", errors="ignore"),
            "topic":            msg.topic(),
            "partition":        msg.partition(),
            "offset":           msg.offset(),
            "timestamp":        time.time(),
        }
        producer.produce(DLQ_TOPIC, json.dumps(payload).encode("utf-8"))
        producer.poll(0)
        logger.info("Message sent to DLQ: %s", reason)
    except Exception as exc:
        logger.error("Failed to send to DLQ: %s", exc)


# ---------------------------------------------------------------------------
# Main consume loop
# ---------------------------------------------------------------------------
def consume():
    _kafka_bootstrap = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"

    try:
        consumer = Consumer(
            {
                "bootstrap.servers":     _kafka_bootstrap,
                "group.id":              "predictive-originate-group",
                "enable.auto.commit":    False,
                "auto.offset.reset":     "earliest",
                "session.timeout.ms":    45000,
                "heartbeat.interval.ms": 15000,
                "max.poll.interval.ms":  900000,
                "api.version.request":   True,
            }
        )
        producer = Producer({"bootstrap.servers": _kafka_bootstrap})
    except Exception as exc:
        logger.error("Failed to create Kafka clients: %s", exc, exc_info=True)
        return

    try:
        ensure_topics_exist()
        consumer.subscribe([KAFKA_TOPIC])
        logger.info("Subscribed to topic: %s", KAFKA_TOPIC)

        metadata         = consumer.list_topics(timeout=10)
        available_topics = [t for t in metadata.topics if not t.startswith("_")]
        logger.info("Available topics: %s", available_topics)

        if KAFKA_TOPIC not in metadata.topics:
            logger.error("Topic '%s' not found. Aborting.", KAFKA_TOPIC)
            return

        topic_meta = metadata.topics[KAFKA_TOPIC]
        logger.info(
            "Topic '%s' has %d partition(s)", KAFKA_TOPIC, len(topic_meta.partitions)
        )
        logger.info("Available FreeSWITCH servers: %d", fs_pool.get_available_count())

    except Exception as exc:
        logger.error("Failed to initialise consumer: %s", exc, exc_info=True)
        return

    message_count    = 0
    last_stats_log   = time.monotonic()
    no_message_count = 0
    poll_timeout     = 5.0

    try:
        while not _stop_event.is_set():
            msg = consumer.poll(poll_timeout)

            if msg is None:
                no_message_count += 1
                if no_message_count % 10 == 0:
                    logger.info(
                        "No messages yet (polled %d times), still listening…",
                        no_message_count,
                    )
                    assignment = consumer.assignment()
                    if assignment:
                        logger.info("Assigned to %d partition(s)", len(assignment))
                    else:
                        logger.info("No partitions assigned yet — waiting for rebalance…")
                continue

            no_message_count = 0

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    logger.debug(
                        "Partition EOF %s[%d] offset %d",
                        msg.topic(), msg.partition(), msg.offset(),
                    )
                else:
                    logger.error("Kafka error: %s", msg.error())
                continue

            message_count += 1
            logger.info(
                "Message #%d | topic=%s partition=%d offset=%d",
                message_count, msg.topic(), msg.partition(), msg.offset(),
            )

            try:
                event = json.loads(msg.value())
                process_dial_command(event)
                originate_call(event)
                consumer.commit(message=msg)

            except json.JSONDecodeError as exc:
                logger.warning("Invalid JSON — sending to DLQ: %s", exc)
                send_to_dlq(producer, msg, f"invalid_json: {exc}")
                consumer.commit(message=msg)

            except ValueError as exc:
                logger.warning("Validation error — sending to DLQ: %s", exc)
                send_to_dlq(producer, msg, f"validation_error: {exc}")
                consumer.commit(message=msg)

            except RuntimeError as exc:
                logger.warning("Runtime error — sending to DLQ: %s", exc)
                send_to_dlq(producer, msg, f"runtime_error: {exc}")
                consumer.commit(message=msg)

            except Exception as exc:
                logger.error("Unexpected error: %s", exc, exc_info=True)
                send_to_dlq(producer, msg, f"unexpected_error: {exc}")
                consumer.commit(message=msg)

            if time.monotonic() - last_stats_log > 60:
                logger.info(
                    "Processed %d messages | available FS servers: %d",
                    message_count, fs_pool.get_available_count(),
                )
                fs_pool.log_stats()
                last_stats_log = time.monotonic()

    finally:
        logger.info("Closing consumer… (processed %d messages)", message_count)
        fs_pool.log_stats()
        consumer.close()
        producer.flush()


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logger.info("Starting predictive originate consumer…")
    logger.info("Kafka topic : %s", KAFKA_TOPIC)
    logger.info("DLQ topic   : %s", DLQ_TOPIC)
    logger.info("FS servers  : %s", [f"{s['host']}:{s['port']}" for s in _FS_SERVERS_RAW])
    logger.info("Max retries : %d", MAX_RETRIES)
    logger.info("Default CPS : %d", DEFAULT_CAMPAIGN_CPS)
    consume()