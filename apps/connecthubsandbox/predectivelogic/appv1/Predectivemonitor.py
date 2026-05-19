"""
Predictive Dialer – Monitor
===========================

Two independent watch-loops run in background threads:

Task 1 – Stale-call watcher  (default: every 60 s)
    • Fetches every MongoDB lead whose p_leadStatus == "CALLING".
    • Looks up the call UUID in MySQL p_predictiveActiveCalls.
    • Asks FreeSWITCH  "uuid_exists <uuid>" via ESL.
    • If the call is NOT found in either → marks the lead FAILED in Mongo
      and decrements p_predictiveactiveCalls in MySQL stats.

Task 2 – Campaign scheduler  (default: every 30 s)
    • Queries MySQL for all ACTIVE campaigns.
    • Checks each campaign's date range and calling-hours window
      (same logic as Predectivelogic.py).
    • If a campaign is due to run and no DIAL_START is in-flight,
      publishes a DIAL_START event to Kafka  →  Predectivelogic picks it up.
"""

import asyncio
import inspect
import json
import logging
import os
import signal
import sys
import threading
import time
from datetime import datetime, time as dt_time, timedelta
from typing import Optional, List

from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic
from motor.motor_asyncio import AsyncIOMotorClient
from redis import Redis
from mysql.connector import pooling, errors
from ESL import ESLconnection

from config import settings

# ---------------------------------------------------------------------------
# Logging (Windows-safe UTF-8)
# ---------------------------------------------------------------------------
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("predictive_monitor.log"),
    ],
)
logger = logging.getLogger("predictive-monitor")

# ---------------------------------------------------------------------------
# Tunables (override via environment / settings if desired)
# ---------------------------------------------------------------------------
STALE_CHECK_INTERVAL    = int(getattr(settings, "MONITOR_STALE_INTERVAL",   60))   # seconds
SCHEDULE_CHECK_INTERVAL = int(getattr(settings, "MONITOR_SCHEDULE_INTERVAL", 30))  # seconds
# Grace period: a lead must be in CALLING state for at least this long
# before we consider its call "stale" and check FreeSWITCH.
CALLING_TIMEOUT_SECS    = int(getattr(settings, "MONITOR_CALLING_TIMEOUT",  300))  # 5 min

# FreeSWITCH servers — reuse same env vars as Predectiveorginate.py
_FS_SERVERS_RAW: List[dict] = json.loads(
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


# ---------------------------------------------------------------------------
# Lightweight FreeSWITCH UUID checker
# ---------------------------------------------------------------------------
class FreeSwitchChecker:
    """
    Maintains one ESL connection per FreeSWITCH node and exposes uuid_exists().
    Connections are lazy and reconnect transparently on the next call after a
    failure.

    Fail-open policy: if ALL servers are unreachable we return True so we
    never wrongly kill a live call during a transient ESL network outage.
    """

    def __init__(self, servers: List[dict]):
        self._servers: List[dict]                      = servers
        self._conns:   List[Optional[ESLconnection]]   = [None] * len(servers)
        self._lock     = threading.Lock()

    # -- Connection helpers --------------------------------------------------

    def _try_connect(self, idx: int) -> Optional[ESLconnection]:
        srv = self._servers[idx]
        try:
            conn = ESLconnection(srv["host"], srv["port"], srv["password"])
            if conn.connected():
                logger.info(
                    "[FS-checker] Connected to %s:%s", srv["host"], srv["port"]
                )
                return conn
        except Exception as exc:
            logger.warning(
                "[FS-checker] Cannot connect to %s:%s – %s",
                srv["host"], srv["port"], exc,
            )
        return None

    def _get_conn(self, idx: int) -> Optional[ESLconnection]:
        with self._lock:
            conn = self._conns[idx]
            if conn and conn.connected():
                return conn
            conn = self._try_connect(idx)
            self._conns[idx] = conn
            return conn

    # -- Public API ----------------------------------------------------------

    def uuid_exists(self, call_uuid: str) -> bool:
        """
        Return True if *any* FreeSWITCH node reports the UUID as active.
        Returns True (fail-open) when no server is reachable at all.
        """
        any_reachable = False

        for idx in range(len(self._servers)):
            conn = self._get_conn(idx)
            if conn is None:
                continue
            any_reachable = True
            try:
                resp = conn.api("uuid_exists", call_uuid)
                body = (resp.getBody() or "").strip().lower() if resp else ""
                if body == "true":
                    return True
            except Exception as exc:
                srv = self._servers[idx]
                logger.warning(
                    "[FS-checker] uuid_exists error on %s:%s – %s; "
                    "will reconnect next check",
                    srv["host"], srv["port"], exc,
                )
                with self._lock:
                    self._conns[idx] = None   # force reconnect next call

        if not any_reachable:
            logger.error(
                "[FS-checker] ALL FreeSWITCH servers unreachable — "
                "failing OPEN (UUID %s treated as still alive)", call_uuid,
            )
            return True   # fail-open: do NOT mark FAILED during an FS outage

        return False   # all reachable servers said the UUID is gone


# ---------------------------------------------------------------------------
# Main Monitor
# ---------------------------------------------------------------------------
class PredictiveMonitor:

    def __init__(self):
        self.running = False

        # MongoDB (async Motor, same pattern as Predectivelogic.py)
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self._loop = asyncio.new_event_loop()
        self._loop_thread = threading.Thread(
            target=self._loop.run_forever,
            daemon=True,
            name="monitor-motor-loop",
        )
        self._loop_thread.start()

        # MySQL
        self.mysql_pool: Optional[pooling.MySQLConnectionPool] = None

        # Redis (distributed lock so multiple monitor replicas don't duplicate work)
        self.redis: Optional[Redis] = None

        # Kafka producer (to publish DIAL_START events)
        self.producer = None

        # FreeSWITCH connectivity checker
        self.fs_checker = FreeSwitchChecker(_FS_SERVERS_RAW)

    # -----------------------------------------------------------------------
    # Async bridge (identical to Predectivelogic.py)
    # -----------------------------------------------------------------------
    def _run_async(self, coro, timeout: int = 30):
        if not inspect.iscoroutine(coro):
            raise TypeError(
                f"_run_async received a {type(coro).__name__}, not a coroutine. "
                "Wrap Motor calls in an async def function."
            )
        return asyncio.run_coroutine_threadsafe(coro, self._loop).result(timeout=timeout)

    # -----------------------------------------------------------------------
    # MongoDB helpers
    # -----------------------------------------------------------------------
    def _mongo_find_list_all(self, collection, query: dict) -> list:
        async def _inner():
            return await collection.find(query).to_list(length=None)
        return self._run_async(_inner())

    def _mongo_update_one(self, collection, query: dict, update: dict):
        async def _inner():
            return await collection.update_one(query, update)
        return self._run_async(_inner())

    # -----------------------------------------------------------------------
    # MySQL helpers (same retry/back-off as Predectivelogic.py)
    # -----------------------------------------------------------------------
    def _execute_mysql(self, query, params=None, fetch=True, retries=3):
        for attempt in range(retries):
            conn = cursor = None
            try:
                conn   = self.mysql_pool.get_connection()
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, params or ())
                if fetch:
                    return cursor.fetchall()
                conn.commit()
                return None
            except errors.OperationalError as exc:
                logger.warning(
                    "MySQL OperationalError (attempt %d/%d): %s",
                    attempt + 1, retries, exc,
                )
                time.sleep(2 ** attempt)
            except Exception as exc:
                logger.error("MySQL unexpected error: %s", exc)
                raise
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
        raise RuntimeError("MySQL query failed after %d retries" % retries)

    def _execute_mysql_one(self, query, params=None):
        rows = self._execute_mysql(query, params=params, fetch=True)
        return rows[0] if rows else None

    # -----------------------------------------------------------------------
    # Initialization
    # -----------------------------------------------------------------------
    def initialize(self):
        self._init_mongo()
        self._init_mysql()
        self._init_redis()
        self._init_kafka()
        logger.info("PredictiveMonitor fully initialized")

    def _init_mongo(self):
        async def _setup():
            client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                maxPoolSize=5,
                minPoolSize=1,
                serverSelectionTimeoutMS=3000,
            )
            await client.admin.command("ping")
            return client

        self.mongo_client = asyncio.run_coroutine_threadsafe(
            _setup(), self._loop
        ).result(timeout=15)
        self.db = self.mongo_client["onedbpredectiveleads"]
        logger.info("MongoDB ready (pool min=1 max=5)")

    def _init_mysql(self):
        self.mysql_pool = pooling.MySQLConnectionPool(
            pool_name="monitor_pool",
            pool_size=3,
            host=settings.MYSQL_HOST,
            port=3306,
            user=settings.MYSQL_USERNAME,
            password=settings.MYSQL_PASSWORD,
            database="onedb",
            autocommit=False,
            connection_timeout=10,
            use_pure=True,
        )
        logger.info("MySQL connection pool ready (size=3)")

    def _init_redis(self):
        self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.redis.ping()
        logger.info("Redis ready")

    def _init_kafka(self):
        bootstrap = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"
        admin     = AdminClient({"bootstrap.servers": bootstrap})
        existing  = set(admin.list_topics(timeout=10).topics.keys())
        required  = ["dialer.dial_start", "dialer.dial_command", "dialer.dial_result"]
        to_create = [
            NewTopic(t, num_partitions=3, replication_factor=1)
            for t in required
            if t not in existing
        ]
        if to_create:
            for topic, future in admin.create_topics(to_create).items():
                try:
                    future.result()
                    logger.info("Kafka topic created: %s", topic)
                except Exception as exc:
                    logger.warning("Could not create Kafka topic '%s': %s", topic, exc)
        self.producer = Producer(
            {"bootstrap.servers": bootstrap, "acks": "all"}
        )
        logger.info("Kafka producer ready")

    # =======================================================================
    #  TASK 1 — Stale-call watcher
    # =======================================================================

    def _get_all_active_account_ids(self) -> list:
        """All accountIds that have at least one ACTIVE campaign."""
        rows = self._execute_mysql(
            "SELECT DISTINCT c_accountId FROM p_campaigns "
            "WHERE c_campaignStatus = 'ACTIVE' AND c_dialerType = 'PREDICTIVE'",
            fetch=True,
        )
        return [r["c_accountId"] for r in rows] if rows else []

    def _get_calling_leads(self, accountid) -> list:
        """All leads in CALLING state inside this account's MongoDB collection."""
        return self._mongo_find_list_all(
            self.db[str(accountid)],
            {"p_leadStatus": "CALLING"},
        )

    def _get_active_call_uuid(self, lead_id, campaign_id, accountid) -> Optional[str]:
        """
        Fetch the live call UUID from MySQL p_predictiveActiveCalls for this lead.
        Returns None if no row exists (the call may have already been cleaned up).
        """
        row = self._execute_mysql_one(
            "SELECT p_activeCallUuid "
            "FROM   p_predictiveActiveCalls "
            "WHERE  p_activeCallLeadId    = %s "
            "  AND  p_activeCallCampaignId = %s "
            "LIMIT 1",
            (str(lead_id), campaign_id),
        )
        return row["p_activeCallUuid"] if row else None

    def _mark_lead_failed(self, accountid, lead_id, call_uuid: Optional[str]):
        """
        Atomically recover a stale lead:
          • Set p_leadStatus = "FAILED" in MongoDB.
          • Remove the MySQL active-call row.
        """
        now = int(time.time())
        self._mongo_update_one(
            self.db[str(accountid)],
            # Condition: still CALLING (guards against a race where the Lua
            # script posted a DIAL_RESULT between our check and this write)
            {"p_leadID": lead_id, "p_leadStatus": "CALLING"},
            {
                "$set": {
                    "p_leadStatus":       "FAILED",
                    "p_leadLastResult":   "STALE_CALL",
                    "p_leadnextCallTime": now + 600,   # retry in 10 min
                    "p_updatedAt":        now,
                },
                "$inc": {"p_totalAttempts": 1, "p_todayAttempts": 1},
            },
        )
        logger.info(
            "[stale-watcher] Lead %s → FAILED (stale CALLING; uuid=%s)",
            lead_id, call_uuid or "none",
        )

        # Clean up the MySQL active-call record
        if call_uuid:
            self._execute_mysql(
                "DELETE FROM p_predictiveActiveCalls "
                "WHERE p_activeCallUuid = %s",
                (call_uuid,),
                fetch=False,
            )

    def _decrement_active_calls(self, campaign_id, accountid):
        """
        Decrement the campaign's active-call counter after recovering a stale lead.
        GREATEST(..., 0) prevents the counter going negative on concurrent updates.
        """
        self._execute_mysql(
            """
            UPDATE p_predictiveCampaignStats
            SET    p_predictiveactiveCalls = GREATEST(p_predictiveactiveCalls - 1, 0)
            WHERE  p_predictiveCampaignId = %s
              AND  p_predictiveaccountid  = %s
            """,
            (campaign_id, accountid),
            fetch=False,
        )

    def run_stale_call_check(self):
        """
        Entry point for Task 1 — called every STALE_CHECK_INTERVAL seconds.

        Algorithm:
          For every ACTIVE account → for every lead in CALLING state:
            1. Skip if the lead just turned CALLING (within CALLING_TIMEOUT_SECS).
            2. Look up the call UUID in MySQL p_predictiveActiveCalls.
            3. Ask FreeSWITCH "uuid_exists <uuid>".
            4. If the call is gone from both → mark FAILED + decrement stats.
        """
        logger.info("[stale-watcher] Scan started")
        recovered = 0

        account_ids = self._get_all_active_account_ids()
        if not account_ids:
            logger.info("[stale-watcher] No active accounts — nothing to scan")
            return

        now_ts = int(time.time())

        for accountid in account_ids:
            # Distributed deduplication lock for stale-watcher per account
            lock_key = f"monitor-stale-lock:{accountid}"
            lock_ttl = STALE_CHECK_INTERVAL + 5
            acquired = self.redis.set(lock_key, "1", ex=lock_ttl, nx=True)
            if not acquired:
                logger.debug(
                    "[stale-watcher] Account %s — lock held by another instance; skipping",
                    accountid,
                )
                continue

            try:
                leads = self._get_calling_leads(accountid)
            except Exception as exc:
                logger.error(
                    "[stale-watcher] Failed to read leads for account %s: %s",
                    accountid, exc,
                )
                continue

            if not leads:
                continue

            logger.info(
                "[stale-watcher] Account %s — %d lead(s) in CALLING",
                accountid, len(leads),
            )

            # Batch fetch active call UUIDs
            lead_ids = [str(lead.get("p_leadID")) for lead in leads if lead.get("p_leadID")]
            uuid_map = {}
            if lead_ids:
                format_strings = ','.join(['%s'] * len(lead_ids))
                query = f"SELECT p_activeCallLeadId, p_activeCallUuid FROM p_predictiveActiveCalls WHERE p_activeCallLeadId IN ({format_strings})"
                rows = self._execute_mysql(query, params=tuple(lead_ids), fetch=True)
                if rows:
                    uuid_map = {str(row["p_activeCallLeadId"]): row["p_activeCallUuid"] for row in rows}

            for lead in leads:
                lead_id     = lead.get("p_leadID")
                campaign_id = lead.get("p_leadCampaignID")

                # -- Grace period: skip leads that just transitioned to CALLING --
                updated_at = lead.get("p_updatedAt", 0)
                age_secs   = now_ts - int(updated_at) if updated_at else now_ts
                if age_secs < CALLING_TIMEOUT_SECS:
                    logger.debug(
                        "[stale-watcher] Lead %s is only %ds old — skipping",
                        lead_id, age_secs,
                    )
                    continue

                try:
                    # Step 1 — get the call UUID from MySQL
                    call_uuid = uuid_map.get(str(lead_id))

                    # Step 2 — verify with FreeSWITCH
                    if call_uuid:
                        call_alive = self.fs_checker.uuid_exists(call_uuid)
                    else:
                        # No MySQL row → call was never properly registered
                        # OR was already cleaned up; treat as gone
                        call_alive = False
                        logger.warning(
                            "[stale-watcher] Lead %s has no active-call row in MySQL",
                            lead_id,
                        )

                    if call_alive:
                        logger.debug(
                            "[stale-watcher] Lead %s — UUID %s is alive in FS; skipping",
                            lead_id, call_uuid,
                        )
                        continue

                    # Step 3 — recover the lead
                    logger.warning(
                        "[stale-watcher] Lead %s — call NOT in FreeSWITCH "
                        "(uuid=%s); marking FAILED",
                        lead_id, call_uuid or "none",
                    )
                    self._mark_lead_failed(accountid, lead_id, call_uuid)
                    if campaign_id:
                        self._decrement_active_calls(campaign_id, accountid)
                    recovered += 1

                except Exception as exc:
                    logger.error(
                        "[stale-watcher] Error processing lead %s: %s",
                        lead_id, exc, exc_info=True,
                    )

        logger.info(
            "[stale-watcher] Scan complete — %d stale lead(s) recovered", recovered
        )

    # =======================================================================
    #  TASK 2 — Campaign scheduler / auto-starter
    # =======================================================================

    def _is_within_calling_hours(self, calling_hours: dict) -> bool:
        """Return True if the current wall-clock time is inside the campaign window."""
        try:
            now       = datetime.now().time()
            start_str = calling_hours.get("start", "00:00")
            end_str   = calling_hours.get("end",   "23:59")
            start     = dt_time(*map(int, start_str.split(":")))
            end       = dt_time(*map(int, end_str.split(":")))
            if start <= end:
                return start <= now <= end
            return now >= start or now <= end   # overnight span e.g. 22:00–06:00
        except Exception as exc:
            logger.error("[scheduler] Calling-hours check failed: %s", exc)
            return True   # fail-open

    def _is_within_date_range(self, campaign_rules: dict) -> bool:
        """
        Example scenario: startDate=2026-03-20, endDate=2026-03-26 (both inclusive).
        Supports open-ended campaigns (no endDate) and lifetime-based end dates.
        Mirrors the logic in Predectivelogic.py._is_within_date_range().
        """
        try:
            today  = datetime.now().date()
            limits = campaign_rules.get("limits", {})

            start_str = limits.get("startDate")
            end_str   = limits.get("endDate")
            lifetime  = limits.get("campaignlifetimedays")

            if not start_str:
                logger.warning(
                    "[scheduler] Campaign has no startDate — treating as always in range"
                )
                return True

            start = datetime.strptime(start_str, "%Y-%m-%d").date()

            if end_str:
                end = datetime.strptime(end_str, "%Y-%m-%d").date()
            elif lifetime is not None:
                end = start + timedelta(days=int(lifetime))
                logger.debug(
                    "[scheduler] End date derived from lifetime: %s + %d = %s",
                    start, int(lifetime), end,
                )
            else:
                # Open-ended: active once the start date is reached
                if today < start:
                    logger.info(
                        "[scheduler] Campaign not yet started | today=%s startDate=%s",
                        today, start,
                    )
                    return False
                return True

            if start > end:
                logger.error(
                    "[scheduler] Invalid date range: startDate %s after endDate %s",
                    start, end,
                )
                return False

            in_range = start <= today <= end
            if not in_range:
                logger.info(
                    "[scheduler] Outside date range | today=%s range=[%s → %s]",
                    today, start, end,
                )
            return in_range

        except Exception as exc:
            logger.error("[scheduler] Date-range check failed: %s", exc)
            return True   # fail-open

    def _should_auto_start(self, campaign: dict) -> bool:
        """
        Return True when ALL three conditions hold:
          1. c_campaignStatus == 'ACTIVE'
          2. Today is within the campaign's date range
          3. Current time is within the campaign's calling hours
        """
        status = campaign.get("c_campaignStatus", "").upper()
        if status != "ACTIVE":
            return False

        try:
            rules = json.loads(campaign.get("c_campaignRules") or "{}")
        except json.JSONDecodeError:
            logger.error(
                "[scheduler] Invalid c_campaignRules JSON for campaign %s",
                campaign.get("c_campaignId"),
            )
            return False

        if not self._is_within_date_range(rules):
            return False

        calling_hours = rules.get("callinghours", {})
        if not self._is_within_calling_hours(calling_hours):
            logger.info(
                "[scheduler] Campaign %s — outside calling hours (%s – %s); skipping",
                campaign.get("c_campaignId"),
                calling_hours.get("start", "?"),
                calling_hours.get("end",   "?"),
            )
            return False

        return True

    def _fetch_active_campaigns(self) -> list:
        """
        Load all ACTIVE campaigns from MySQL, including the campaign rules
        so the schedule can be evaluated without a second query.
        """
        return self._execute_mysql(
            """
            SELECT
                c_campaignId,
                c_accountId,
                c_accountNo,
                c_campaignStatus,
                c_campaignRules
            FROM   p_campaigns
            WHERE  c_campaignStatus = 'ACTIVE' AND c_dialerType = 'PREDICTIVE'
            """,
            fetch=True,
        ) or []

    def _publish_dial_start(self, campaign: dict):
        """
        Emit a DIAL_START event onto Kafka.
        Predectivelogic.py's process_kafka_event() will consume it and
        call _generate_next_dial_command() to begin dialling eligible leads.
        """
        event = {
            "event_type":   "DIAL_START",
            "campaign_id":  campaign["c_campaignId"],
            "accountid":    campaign["c_accountId"],
            "accountno":    campaign.get("c_accountNo"),
            "timestamp":    datetime.utcnow().isoformat(),
            "triggered_by": "monitor-auto-scheduler",
        }
        self.producer.produce(
            "dialer.dial_start",
            key=str(campaign["c_campaignId"]).encode(),
            value=json.dumps(event).encode(),
        )
        self.producer.poll(0)   # trigger delivery callbacks without blocking
        logger.info(
            "[scheduler] DIAL_START published → campaign %s (account %s)",
            campaign["c_campaignId"], campaign["c_accountId"],
        )

    def run_campaign_scheduler(self):
        """
        Entry point for Task 2 — called every SCHEDULE_CHECK_INTERVAL seconds.

        Uses a Redis NX key as a distributed lock so that when multiple monitor
        replicas are running, only one fires DIAL_START per campaign per cycle.
        TTL is set to SCHEDULE_CHECK_INTERVAL + 5 s so the lock auto-expires
        before the next cycle, allowing the campaign to be re-started if needed.
        """
        logger.info("[scheduler] Checking campaign schedules…")

        campaigns = self._fetch_active_campaigns()
        if not campaigns:
            logger.info("[scheduler] No ACTIVE campaigns in MySQL")
            return

        started = 0
        for campaign in campaigns:
            campaign_id = campaign["c_campaignId"]

            if not self._should_auto_start(campaign):
                continue

            # Distributed deduplication lock:
            # prevents N monitor replicas all publishing DIAL_START at once
            lock_key = f"monitor-sched-lock:{campaign_id}"
            lock_ttl = SCHEDULE_CHECK_INTERVAL + 5
            acquired = self.redis.set(lock_key, "1", ex=lock_ttl, nx=True)
            if not acquired:
                logger.debug(
                    "[scheduler] Campaign %s — lock held by another instance; skipping",
                    campaign_id,
                )
                continue

            try:
                self._publish_dial_start(campaign)
                started += 1
            except Exception as exc:
                logger.error(
                    "[scheduler] Failed to publish DIAL_START for campaign %s: %s",
                    campaign_id, exc, exc_info=True,
                )
                # Release lock so the next cycle can retry
                self.redis.delete(lock_key)

        logger.info(
            "[scheduler] Schedule check done — %d campaign(s) auto-started", started
        )

    # =======================================================================
    #  Background thread loops
    # =======================================================================

    def _stale_watcher_loop(self):
        logger.info(
            "[stale-watcher] Thread started "
            "(interval=%ds, grace_period=%ds)",
            STALE_CHECK_INTERVAL, CALLING_TIMEOUT_SECS,
        )
        while self.running:
            try:
                self.run_stale_call_check()
            except Exception as exc:
                logger.error(
                    "[stale-watcher] Unhandled loop error: %s", exc, exc_info=True
                )
            # Sleep in small ticks so stop() is responsive
            for _ in range(STALE_CHECK_INTERVAL * 2):
                if not self.running:
                    break
                time.sleep(0.5)

    def _campaign_scheduler_loop(self):
        logger.info(
            "[scheduler] Thread started (interval=%ds)", SCHEDULE_CHECK_INTERVAL
        )
        while self.running:
            try:
                self.run_campaign_scheduler()
            except Exception as exc:
                logger.error(
                    "[scheduler] Unhandled loop error: %s", exc, exc_info=True
                )
            for _ in range(SCHEDULE_CHECK_INTERVAL * 2):
                if not self.running:
                    break
                time.sleep(0.5)

    # =======================================================================
    #  Lifecycle
    # =======================================================================

    def start(self):
        self.initialize()
        self.running = True

        # Graceful shutdown on SIGINT / SIGTERM
        signal.signal(signal.SIGINT,  lambda s, f: self.stop())
        signal.signal(signal.SIGTERM, lambda s, f: self.stop())

        stale_thread = threading.Thread(
            target=self._stale_watcher_loop,
            daemon=True,
            name="stale-watcher",
        )
        sched_thread = threading.Thread(
            target=self._campaign_scheduler_loop,
            daemon=True,
            name="campaign-scheduler",
        )

        stale_thread.start()
        sched_thread.start()

        logger.info(
            "PredictiveMonitor running — "
            "stale-watcher every %ds | campaign-scheduler every %ds",
            STALE_CHECK_INTERVAL, SCHEDULE_CHECK_INTERVAL,
        )

        # Block the main thread so daemon threads stay alive and signals work
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()

        stale_thread.join(timeout=10)
        sched_thread.join(timeout=10)

    def stop(self):
        logger.info("PredictiveMonitor stopping…")
        self.running = False
        if self.producer:
            self.producer.flush(timeout=5)
        if self.redis:
            self.redis.close()
        if self.mongo_client:
            self.mongo_client.close()
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._loop_thread.join(timeout=5)
        logger.info("PredictiveMonitor stopped")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
def main():
    monitor = PredictiveMonitor()
    monitor.start()


if __name__ == "__main__":
    main()