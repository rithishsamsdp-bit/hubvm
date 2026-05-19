"""
Predictive Dialer – Monitor
===========================

Four independent watch-loops run in background threads:

Task 1 – Stale-call watcher  (default: every 60 s)
    • Fetches every MongoDB lead whose p_leadStatus == "CALLING".
    • Looks up the call UUID in MySQL p_predictiveActiveCalls.
    • Asks FreeSWITCH "uuid_exists <uuid>" via ESL.
    • If the call is NOT found in either → marks the lead FAILED in Mongo
      and decrements p_predictiveactiveCalls in MySQL stats.
    • If a UUID IS found in MySQL, FreeSWITCH is checked IMMEDIATELY
      (no grace period) — if the call is gone it is recovered right away.
    • Grace period only applies when no UUID exists yet (originate in-flight).

Task 2 – Campaign scheduler  (default: every 30 s)
    • Queries MySQL for all ACTIVE campaigns.
    • Checks each campaign's date range and calling-hours window.
    • If a campaign is due to run and no DIAL_START is in-flight,
      publishes a DIAL_START event to Kafka → Predectivelogic picks it up.

Task 3 – Campaign analyzer  (every 15 s)
    • Aggregates ASR, drop-rate, and live queue depth for ADAPTIVE campaigns.
    • Caches metrics in Redis so Predectivelogic can read them without a
      blocking DB call inside _generate_next_dial_command.

Task 4 – Daily attempt reset  (runs once per calendar day at midnight)
    • Resets p_todayAttempts = 0 for every lead in every active account's
      MongoDB collection so the per-day call quota refreshes correctly.
    • Uses a Redis key (monitor-daily-reset:<YYYY-MM-DD>) as an idempotency
      guard so only one monitor replica performs the reset per calendar day.

KEY FIXES vs previous version:
  • Task 4 (daily reset) added — without it maxattemptsper_day permanently
    blocks leads after the first day, breaking all multi-day retry scenarios.
  • Stale-watcher recovery marks leads FAILED (not EXHAUSTED) so they remain
    eligible for future attempts within lifetime limits.
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
# Tunables
# ---------------------------------------------------------------------------
STALE_CHECK_INTERVAL    = int(getattr(settings, "MONITOR_STALE_INTERVAL",    60))
SCHEDULE_CHECK_INTERVAL = int(getattr(settings, "MONITOR_SCHEDULE_INTERVAL", 30))
CALLING_TIMEOUT_SECS    = int(getattr(settings, "MONITOR_CALLING_TIMEOUT",  300))

_FS_SERVERS_RAW: List[dict] = json.loads(
    os.getenv(
        "FS_SERVERS",
        json.dumps([
            {
                "host":     settings.FS_HOST_MID_1,
                "port":     int(os.getenv("FS_PORT_MID_1", 8021)),
                "password": "#Pulse#$2024",
            },
            {
                "host":     settings.FS_HOST_MID_2,
                "port":     int(os.getenv("FS_PORT_MID_2", 8021)),
                "password": "#Pulse#$2024",
            },
        ]),
    )
)


# ---------------------------------------------------------------------------
# Lightweight FreeSWITCH UUID checker
# ---------------------------------------------------------------------------
class FreeSwitchChecker:
    """
    Maintains one ESL connection per FreeSWITCH node.
    Fail-open: if ALL servers are unreachable we return True so we never
    wrongly kill a live call during a transient ESL network outage.
    """

    def __init__(self, servers: List[dict]):
        self._servers: List[dict]                    = servers
        self._conns:   List[Optional[ESLconnection]] = [None] * len(servers)
        self._lock     = threading.Lock()

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

    def uuid_exists(self, call_uuid: str) -> bool:
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
                    "[FS-checker] uuid_exists error on %s:%s – %s; will reconnect",
                    srv["host"], srv["port"], exc,
                )
                with self._lock:
                    self._conns[idx] = None

        if not any_reachable:
            logger.error(
                "[FS-checker] ALL FreeSWITCH servers unreachable — "
                "failing OPEN (UUID %s treated as alive)", call_uuid,
            )
            return True

        return False

    def get_queue_wait_count(self, queue_id: str) -> int:
        for idx in range(len(self._servers)):
            conn = self._get_conn(idx)
            if conn is None:
                continue
            try:
                resp = conn.api("callcenter_config", f"queue count members {queue_id}")
                body = (resp.getBody() or "").strip() if resp else "0"
                if body.isdigit():
                    return int(body)
                logger.debug("[FS-checker] Non-numeric queue count response: %s", body)
            except Exception as exc:
                srv = self._servers[idx]
                logger.warning(
                    "[FS-checker] get_queue_wait_count error on %s:%s – %s",
                    srv["host"], srv["port"], exc,
                )
                with self._lock:
                    self._conns[idx] = None
        return 0


# ---------------------------------------------------------------------------
# Main Monitor
# ---------------------------------------------------------------------------
class PredictiveMonitor:

    def __init__(self):
        self.running = False

        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self._loop = asyncio.new_event_loop()
        self._loop_thread = threading.Thread(
            target=self._loop.run_forever,
            daemon=True,
            name="monitor-motor-loop",
        )
        self._loop_thread.start()

        self.mysql_pool: Optional[pooling.MySQLConnectionPool] = None
        self.redis:      Optional[Redis]                       = None
        self.producer    = None
        self.fs_checker  = FreeSwitchChecker(_FS_SERVERS_RAW)

    # -----------------------------------------------------------------------
    # Async bridge
    # -----------------------------------------------------------------------
    def _run_async(self, coro, timeout: int = 30):
        if not inspect.iscoroutine(coro):
            raise TypeError(
                f"_run_async received a {type(coro).__name__}, not a coroutine."
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

    def _mongo_update_many(self, collection, query: dict, update: dict):
        async def _inner():
            return await collection.update_many(query, update)
        return self._run_async(_inner())

    # -----------------------------------------------------------------------
    # MySQL helpers
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
        url = settings.REDIS_URL
        if not url.startswith(("redis://", "rediss://", "unix://")):
            url = f"redis://{url}"
        self.redis = Redis.from_url(url, decode_responses=True)
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
        rows = self._execute_mysql(
            "SELECT DISTINCT c_accountId FROM p_campaigns "
            "WHERE c_campaignStatus = 'ACTIVE' AND c_dialerType = 'PREDICTIVE'",
            fetch=True,
        )
        return [r["c_accountId"] for r in rows] if rows else []

    def _get_calling_leads(self, accountid) -> list:
        return self._mongo_find_list_all(
            self.db[str(accountid)],
            {"p_leadStatus": "CALLING"},
        )

    def _mark_lead_failed(self, accountid, lead_id, call_uuid: Optional[str]):
        """
        Recover a stale lead: set FAILED in Mongo and remove the MySQL active-call row.
        Uses FAILED (not EXHAUSTED) so the lead remains eligible for future retries
        within its lifetime limit — the retry logic in Predectivelogic handles exhaustion.
        """
        now = int(time.time())
        self._mongo_update_one(
            self.db[str(accountid)],
            {"p_leadID": lead_id, "p_leadStatus": "CALLING"},
            {
                "$set": {
                    "p_leadStatus":       "FAILED",
                    "p_leadLastResult":   "STALE_CALL",
                    "p_leadnextCallTime": now + 600,
                    "p_updatedAt":        now,
                },
                "$inc": {"p_totalAttempts": 1, "p_todayAttempts": 1},
            },
        )
        logger.info(
            "[stale-watcher] Lead %s → FAILED (stale CALLING; uuid=%s)",
            lead_id, call_uuid or "none",
        )

        if call_uuid:
            self._execute_mysql(
                "DELETE FROM p_predictiveActiveCalls WHERE p_activeCallUuid = %s",
                (call_uuid,),
                fetch=False,
            )

    def _decrement_active_calls(self, campaign_id, accountid):
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
        logger.info("[stale-watcher] Scan started")
        recovered = 0

        account_ids = self._get_all_active_account_ids()
        if not account_ids:
            logger.info("[stale-watcher] No active accounts — nothing to scan")
            return

        now_ts = int(time.time())

        for accountid in account_ids:
            lock_key = f"monitor-stale-lock:{accountid}"
            lock_ttl = STALE_CHECK_INTERVAL + 5
            if not self.redis.set(lock_key, "1", ex=lock_ttl, nx=True):
                logger.debug(
                    "[stale-watcher] Account %s — lock held; skipping", accountid
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

            # Batch fetch active-call UUIDs from MySQL
            lead_ids = [str(lead.get("p_leadID")) for lead in leads if lead.get("p_leadID")]
            uuid_map = {}
            if lead_ids:
                fmt = ",".join(["%s"] * len(lead_ids))
                rows = self._execute_mysql(
                    f"SELECT p_activeCallLeadId, p_activeCallUuid "
                    f"FROM p_predictiveActiveCalls "
                    f"WHERE p_activeCallLeadId IN ({fmt})",
                    params=tuple(lead_ids),
                    fetch=True,
                )
                if rows:
                    uuid_map = {
                        str(r["p_activeCallLeadId"]): r["p_activeCallUuid"]
                        for r in rows
                    }

            for lead in leads:
                lead_id     = lead.get("p_leadID")
                campaign_id = lead.get("p_leadCampaignID")

                try:
                    call_uuid = uuid_map.get(str(lead_id))

                    if call_uuid:
                        # UUID registered — check FreeSWITCH immediately
                        if self.fs_checker.uuid_exists(call_uuid):
                            logger.debug(
                                "[stale-watcher] Lead %s — UUID %s alive; skipping",
                                lead_id, call_uuid,
                            )
                            continue

                        logger.warning(
                            "[stale-watcher] Lead %s — UUID %s NOT in FreeSWITCH; "
                            "recovering immediately",
                            lead_id, call_uuid,
                        )
                        self._mark_lead_failed(accountid, lead_id, call_uuid)
                        if campaign_id:
                            self._decrement_active_calls(campaign_id, accountid)
                        recovered += 1

                    else:
                        # No UUID yet — apply grace period (originate may be in-flight)
                        updated_at = lead.get("p_updatedAt", 0)
                        age_secs   = now_ts - int(updated_at) if updated_at else now_ts

                        if age_secs < CALLING_TIMEOUT_SECS:
                            logger.debug(
                                "[stale-watcher] Lead %s no UUID, age=%ds < grace=%ds; waiting",
                                lead_id, age_secs, CALLING_TIMEOUT_SECS,
                            )
                            continue

                        logger.warning(
                            "[stale-watcher] Lead %s no UUID after %ds — recovering",
                            lead_id, age_secs,
                        )
                        self._mark_lead_failed(accountid, lead_id, None)
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
        try:
            now       = datetime.now().time()
            start_str = calling_hours.get("start", "00:00")
            end_str   = calling_hours.get("end",   "23:59")
            start     = dt_time(*map(int, start_str.split(":")))
            end       = dt_time(*map(int, end_str.split(":")))
            if start <= end:
                return start <= now <= end
            return now >= start or now <= end
        except Exception as exc:
            logger.error("[scheduler] Calling-hours check failed: %s", exc)
            return True

    def _is_within_date_range(self, campaign_rules: dict) -> bool:
        try:
            today  = datetime.now().date()
            limits = campaign_rules.get("limits", {})

            start_str = limits.get("startDate")
            end_str   = limits.get("endDate")
            lifetime  = limits.get("campaignlifetimedays")

            if not start_str:
                logger.warning("[scheduler] No startDate — treating as always in range")
                return True

            start = datetime.strptime(start_str, "%Y-%m-%d").date()

            if end_str:
                end = datetime.strptime(end_str, "%Y-%m-%d").date()
            elif lifetime is not None:
                end = start + timedelta(days=int(lifetime))
            else:
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
            return True

    def _should_auto_start(self, campaign: dict) -> bool:
        if campaign.get("c_campaignStatus", "").upper() != "ACTIVE":
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
                "[scheduler] Campaign %s outside calling hours (%s – %s); skipping",
                campaign.get("c_campaignId"),
                calling_hours.get("start", "?"),
                calling_hours.get("end",   "?"),
            )
            return False

        return True

    def _fetch_active_campaigns(self) -> list:
        return self._execute_mysql(
            """
            SELECT
                c_campaignId,
                c_accountId,
                c_accountNo,
                c_campaignStatus,
                c_campaignRules,
                c_queuegroupId
            FROM   p_campaigns
            WHERE  c_campaignStatus = 'ACTIVE' AND c_dialerType = 'PREDICTIVE'
            """,
            fetch=True,
        ) or []

    def _publish_dial_start(self, campaign: dict):
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
        self.producer.poll(0)
        logger.info(
            "[scheduler] DIAL_START published → campaign %s (account %s)",
            campaign["c_campaignId"], campaign["c_accountId"],
        )

    def run_campaign_scheduler(self):
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

            lock_key = f"monitor-sched-lock:{campaign_id}"
            lock_ttl = SCHEDULE_CHECK_INTERVAL + 5
            if not self.redis.set(lock_key, "1", ex=lock_ttl, nx=True):
                logger.debug(
                    "[scheduler] Campaign %s — lock held; skipping", campaign_id
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
                self.redis.delete(lock_key)

        logger.info(
            "[scheduler] Schedule check done — %d campaign(s) auto-started", started
        )

    # =======================================================================
    #  TASK 3 — Campaign analyzer (adaptive dialing metrics)
    # =======================================================================

    def run_campaign_analyzer(self):
        campaigns = self._fetch_active_campaigns()
        if not campaigns:
            return

        for campaign in campaigns:
            campaign_id = campaign["c_campaignId"]
            queue_group = campaign.get("c_queuegroupId")
            queue_id    = (
                f"{queue_group}@{campaign.get('c_accountId')}" if queue_group else None
            )

            waiting_calls = self.fs_checker.get_queue_wait_count(queue_id) if queue_id else 0

            stats = self._execute_mysql_one(
                """
                SELECT
                    COUNT(*) AS total_attempts,
                    SUM(CASE WHEN p_callAttemptResult = 'ANSWERED' THEN 1 ELSE 0 END) AS answered,
                    SUM(CASE WHEN p_callAttemptResult = 'ANSWERED'
                                  AND p_callAttemptDurationSeconds < 10 THEN 1 ELSE 0 END) AS dropped
                FROM p_predictiveCallAttempts
                WHERE p_callAttemptCampaignid = %s
                  AND p_callAttemptInitiatedAt >= NOW() - INTERVAL 10 MINUTE
                """,
                (campaign_id,),
            )

            total_attempts = (stats.get("total_attempts") or 0) if stats else 0
            answered       = (stats.get("answered")       or 0) if stats else 0
            dropped        = (stats.get("dropped")        or 0) if stats else 0

            asr       = (answered / total_attempts) if total_attempts > 0 else 0.0
            drop_rate = (dropped  / answered)        if answered > 0       else 0.0

            metrics_payload = {
                "asr":                float(asr),
                "drop_rate":          float(drop_rate),
                "waiting_calls":      int(waiting_calls),
                "total_attempts_10m": int(total_attempts),
                "timestamp":          int(time.time()),
            }
            cache_key = f"campaign-metrics:{campaign_id}"
            self.redis.set(cache_key, json.dumps(metrics_payload), ex=30)

            logger.debug(
                "[analyzer] Campaign %s → ASR=%.2f%% Drops=%.2f%% Waiting=%d",
                campaign_id, asr * 100, drop_rate * 100, waiting_calls,
            )

    # =======================================================================
    #  TASK 4 — Daily attempt reset
    #
    #  Resets p_todayAttempts = 0 for all leads in all active accounts.
    #  This is the mechanism that makes maxattemptsper_day renew every day.
    #
    #  Without this reset, a lead that reaches its daily quota on Day 1 will
    #  never be selected again even if maxtotalattempts allows further calls.
    #
    #  Uses a Redis key keyed to today's date as an idempotency guard so
    #  only one monitor replica performs the reset per calendar day, and
    #  a restart within the same day does not double-reset.
    # =======================================================================

    def run_daily_reset(self):
        today_str  = datetime.now().strftime("%Y-%m-%d")
        lock_key   = f"monitor-daily-reset:{today_str}"
        # TTL 25 h: slightly more than one day so the key is always present
        # during its own calendar day but auto-expires before the next day's run.
        lock_ttl   = 25 * 3600

        if not self.redis.set(lock_key, "1", ex=lock_ttl, nx=True):
            logger.debug("[daily-reset] Already ran today (%s) — skipping", today_str)
            return

        logger.info("[daily-reset] Running daily p_todayAttempts reset for %s", today_str)

        account_ids = self._get_all_active_account_ids()
        if not account_ids:
            logger.info("[daily-reset] No active accounts to reset")
            return

        total_modified = 0
        for accountid in account_ids:
            try:
                result = self._mongo_update_many(
                    self.db[str(accountid)],
                    {"p_todayAttempts": {"$gt": 0}},
                    {"$set": {"p_todayAttempts": 0}},
                )
                modified = result.modified_count
                total_modified += modified
                logger.info(
                    "[daily-reset] Account %s — reset %d lead(s)", accountid, modified
                )
            except Exception as exc:
                logger.error(
                    "[daily-reset] Error resetting account %s: %s",
                    accountid, exc, exc_info=True,
                )

        logger.info(
            "[daily-reset] Complete — %d lead(s) reset across %d account(s)",
            total_modified, len(account_ids),
        )

    # =======================================================================
    #  Background thread loops
    # =======================================================================

    def _stale_watcher_loop(self):
        logger.info(
            "[stale-watcher] Thread started (interval=%ds, grace=%ds)",
            STALE_CHECK_INTERVAL, CALLING_TIMEOUT_SECS,
        )
        while self.running:
            try:
                self.run_stale_call_check()
            except Exception as exc:
                logger.error(
                    "[stale-watcher] Unhandled loop error: %s", exc, exc_info=True
                )
            for _ in range(STALE_CHECK_INTERVAL * 2):
                if not self.running:
                    break
                time.sleep(0.5)

    def _campaign_scheduler_loop(self):
        logger.info("[scheduler] Thread started (interval=%ds)", SCHEDULE_CHECK_INTERVAL)
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

    def _campaign_analyzer_loop(self):
        analyzer_interval = 15
        logger.info("[analyzer] Thread started (interval=%ds)", analyzer_interval)
        while self.running:
            try:
                if self.redis.set(
                    "monitor-analyzer-lock", "1", ex=analyzer_interval, nx=True
                ):
                    self.run_campaign_analyzer()
            except Exception as exc:
                logger.error(
                    "[analyzer] Unhandled loop error: %s", exc, exc_info=True
                )
            for _ in range(analyzer_interval * 2):
                if not self.running:
                    break
                time.sleep(0.5)

    def _daily_reset_loop(self):
        """
        Polls every 60 seconds and triggers the daily reset once per calendar day.
        The Redis idempotency key inside run_daily_reset() ensures the reset
        is safe to call frequently — it simply exits immediately after the first run.
        """
        logger.info("[daily-reset] Thread started (checking every 60s)")
        while self.running:
            try:
                self.run_daily_reset()
            except Exception as exc:
                logger.error(
                    "[daily-reset] Unhandled loop error: %s", exc, exc_info=True
                )
            # Check every 60 s so the reset fires within 1 minute of midnight
            for _ in range(120):
                if not self.running:
                    break
                time.sleep(0.5)

    # =======================================================================
    #  Lifecycle
    # =======================================================================

    def start(self):
        self.initialize()
        self.running = True

        signal.signal(signal.SIGINT,  lambda s, f: self.stop())
        signal.signal(signal.SIGTERM, lambda s, f: self.stop())

        stale_thread    = threading.Thread(
            target=self._stale_watcher_loop,
            daemon=True, name="stale-watcher",
        )
        sched_thread    = threading.Thread(
            target=self._campaign_scheduler_loop,
            daemon=True, name="campaign-scheduler",
        )
        analyzer_thread = threading.Thread(
            target=self._campaign_analyzer_loop,
            daemon=True, name="campaign-analyzer",
        )
        reset_thread    = threading.Thread(
            target=self._daily_reset_loop,
            daemon=True, name="daily-reset",
        )

        stale_thread.start()
        sched_thread.start()
        analyzer_thread.start()
        reset_thread.start()

        logger.info(
            "PredictiveMonitor running — stale=%ds sched=%ds analyzer=15s daily-reset=60s",
            STALE_CHECK_INTERVAL, SCHEDULE_CHECK_INTERVAL,
        )

        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()

        stale_thread.join(timeout=10)
        sched_thread.join(timeout=10)
        analyzer_thread.join(timeout=10)
        reset_thread.join(timeout=10)

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