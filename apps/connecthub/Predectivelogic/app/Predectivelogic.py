"""
Predictive Dialer – Logic Consumer
Consumes dialer.dial_result / dialer.dial_start from Kafka,
drives lead selection and dial-command publishing.

KEY FIXES vs previous version:
  • _update_lead_after_call now correctly enforces maxattemptsper_day by
    scheduling next call time to the following day's midnight when today's
    quota is reached — ensuring the lead is not re-dialled until tomorrow.
  • When p_totalAttempts reaches maxtotalattempts the lead is marked
    EXHAUSTED (terminal) so it is never selected again.
  • campaign_cps is forwarded in the DIAL_COMMAND event so the originate
    consumer can honour per-campaign CPS limits.
  • dial-lock TTL raised to match worst-case _generate_next_dial_command
    execution time so concurrent lock expiry cannot cause double-dialling.
  • _get_next_eligible_leads uses p_totalAttempts/$lt so exhausted leads
    are always excluded even before their status is updated.
"""

import asyncio
import inspect
import json
import logging
import signal
import sys
import threading
import time
from datetime import datetime, date, time as dt_time, timedelta
from typing import Optional

from confluent_kafka import Consumer, Producer
from confluent_kafka.admin import AdminClient, NewTopic
from motor.motor_asyncio import AsyncIOMotorClient
from redis import Redis
from mysql.connector import pooling, errors

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
        logging.FileHandler("kafka_consumer.log"),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TOPICS_REQUIRED   = ["dialer.dial_command", "dialer.dial_result", "dialer.dial_start"]
CAMPAIGN_TIMEZONE = getattr(settings, "CAMPAIGN_TIMEZONE", "Asia/Kolkata")
DEFAULT_CAMPAIGN_CPS = int(getattr(settings, "DEFAULT_CAMPAIGN_CPS", 5))

# ---------------------------------------------------------------------------
# Delivery report callback
# ---------------------------------------------------------------------------
def delivery_report(err, msg):
    if err:
        logger.error("Kafka delivery failed: %s", err)
    else:
        logger.debug(
            "Kafka delivered to %s [%d] @ %d",
            msg.topic(), msg.partition(), msg.offset(),
        )


# ---------------------------------------------------------------------------
# Predictive Dialer Consumer
# ---------------------------------------------------------------------------
class PredictiveDialerConsumer:

    def __init__(self):
        self.consumer: Optional[Consumer] = None
        self.producer: Optional[Producer] = None
        self.running = False

        # Dedicated asyncio event loop for Motor (must be started BEFORE
        # AsyncIOMotorClient is created so the client binds to self._loop).
        self._loop = asyncio.new_event_loop()
        self._loop_thread = threading.Thread(
            target=self._loop.run_forever, daemon=True, name="motor-loop"
        )
        self._loop_thread.start()

        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.mysql_pool: Optional[pooling.MySQLConnectionPool] = None
        self.redis: Optional[Redis] = None

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
    def _mongo_find_one(self, collection, query: dict):
        async def _inner():
            return await collection.find_one(query)
        return self._run_async(_inner())

    def _mongo_update_one(self, collection, query: dict, update: dict):
        async def _inner():
            return await collection.update_one(query, update)
        return self._run_async(_inner())

    def _mongo_update_many(self, collection, query: dict, update: dict):
        async def _inner():
            return await collection.update_many(query, update)
        return self._run_async(_inner())

    def _mongo_find_list(self, collection, query: dict, sort: list, limit: int) -> list:
        async def _inner():
            return await collection.find(query).sort(sort).limit(limit).to_list(length=limit)
        return self._run_async(_inner())

    # -----------------------------------------------------------------------
    # Initialization
    # -----------------------------------------------------------------------
    def initialize(self):
        self._init_mongo()
        self._init_mysql()
        self._init_redis()
        self._init_kafka()

    def _init_mongo(self):
        async def _setup():
            client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                maxPoolSize=10,
                minPoolSize=2,
                serverSelectionTimeoutMS=3000,
            )
            await client.admin.command("ping")
            return client

        self.mongo_client = asyncio.run_coroutine_threadsafe(
            _setup(), self._loop
        ).result(timeout=15)
        self.db = self.mongo_client["onedbpredectiveleads"]
        logger.info("MongoDB ready (pool min=2 max=10)")

    def _init_mysql(self):
        self.mysql_pool = pooling.MySQLConnectionPool(
            pool_name="predictive_pool",
            pool_size=5,
            host=settings.MYSQL_HOST,
            port=3306,
            user=settings.MYSQL_USERNAME,
            password=settings.MYSQL_PASSWORD,
            database="onedb",
            autocommit=False,
            connection_timeout=10,
            use_pure=True,
        )
        logger.info("MySQL connection pool ready (size=5)")

    def _init_redis(self):
        url = settings.REDIS_URL
        if not url.startswith(("redis://", "rediss://", "unix://")):
            url = f"redis://{url}"
        self.redis = Redis.from_url(url, decode_responses=True)
        self.redis.ping()
        logger.info("Redis ready")

    def _init_kafka(self):
        bootstrap = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"

        admin    = AdminClient({"bootstrap.servers": bootstrap})
        existing = set(admin.list_topics(timeout=10).topics.keys())
        to_create = [
            NewTopic(t, num_partitions=3, replication_factor=1)
            for t in TOPICS_REQUIRED
            if t not in existing
        ]
        if to_create:
            for topic, future in admin.create_topics(to_create).items():
                try:
                    future.result()
                    logger.info("Kafka topic created: %s", topic)
                except Exception as exc:
                    logger.warning("Could not create topic '%s': %s", topic, exc)
        else:
            logger.info("All Kafka topics already exist")

        self.consumer = Consumer(
            {
                "bootstrap.servers":  bootstrap,
                "group.id":           "predictive_dialer_group",
                "enable.auto.commit": False,
                "auto.offset.reset":  "earliest",
            }
        )
        self.producer = Producer(
            {
                "bootstrap.servers": bootstrap,
                "acks":              "all",
            }
        )

    # -----------------------------------------------------------------------
    # MySQL helpers with retry + exponential back-off
    # -----------------------------------------------------------------------
    def _execute_mysql(self, query, params=None, fetch=True, retries=3):
        for attempt in range(retries):
            conn   = None
            cursor = None
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
        result = self._execute_mysql(query, params=params, fetch=True)
        return result[0] if result else None

    # -----------------------------------------------------------------------
    # Kafka event processor
    # -----------------------------------------------------------------------
    def process_kafka_event(self, msg) -> bool:
        try:
            payload = json.loads(msg.value().decode())
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            logger.error("Failed to decode Kafka message: %s", exc)
            return False

        event_type = payload.get("event_type")

        if event_type == "DIAL_RESULT":
            logger.info("DIAL_RESULT received: %s", payload)
            return self._process_dial_result(payload)

        if event_type == "DIAL_START":
            logger.info("DIAL_START received: %s", payload)
            campaign_id = payload.get("campaign_id")
            accountid   = payload.get("accountid")
            campaign    = self._get_campaign(campaign_id, accountid)
            if not campaign:
                logger.warning("Campaign not found for DIAL_START: %s", campaign_id)
                return False
            self._generate_next_dial_command(campaign, accountid)
            return True

        logger.warning("Unknown event type: %s", event_type)
        return False

    # -----------------------------------------------------------------------
    # Process DIAL_RESULT
    # -----------------------------------------------------------------------
    def _process_dial_result(self, payload) -> bool:
        call_uuid = payload.get("callUuid")
        if not call_uuid:
            logger.error("DIAL_RESULT missing callUuid — ignoring")
            return True

        # Atomic idempotency guard
        if not self.redis.set(f"processed:{call_uuid}", "1", ex=3600, nx=True):
            logger.warning("Duplicate DIAL_RESULT ignored: %s", call_uuid)
            return True

        campaign_id = payload["campaignId"]
        lead_id     = payload["leadId"]
        result      = payload["result"]
        accountid   = payload["accountid"]
        accountno   = payload["accountno"]

        campaign = self._get_campaign(campaign_id, accountid)
        if not campaign:
            logger.error(
                "Campaign %s not found for DIAL_RESULT — will not commit offset",
                campaign_id,
            )
            return False

        lead_doc = self._mongo_find_one(
            self.db[str(accountid)],
            {"p_leadID": lead_id},
        )
        if not lead_doc:
            logger.warning("Lead not found in Mongo: %s", lead_id)
            return True

        self._log_call_attempt(campaign_id, lead_id, call_uuid, payload, result, accountid, accountno)
        self._update_lead_after_call(lead_doc, result, campaign, accountid)
        self._remove_active_call(call_uuid)
        self._update_campaign_stats(campaign_id, result, accountid, accountno)

        AGENT_STATUS_SETTLE_DELAY = 1

        def _delayed_next_dial():
            logger.info(
                "Waiting %ds for agent status to settle before next dial (campaign=%s)",
                AGENT_STATUS_SETTLE_DELAY, campaign_id,
            )
            time.sleep(AGENT_STATUS_SETTLE_DELAY)
            self._generate_next_dial_command(campaign, accountid)

        threading.Thread(
            target=_delayed_next_dial, daemon=True, name=f"next-dial-{call_uuid}"
        ).start()
        return True

    # -----------------------------------------------------------------------
    # Generate next dial commands
    # -----------------------------------------------------------------------
    def _generate_next_dial_command(self, campaign, accountid):
        # Raised TTL: 30 s covers worst-case Mongo + MySQL round-trips under load
        lock_key = f"dial-lock:{campaign['c_campaignId']}"
        if not self.redis.set(lock_key, "1", ex=30, nx=True):
            return

        try:
            campaign_rules       = json.loads(campaign["c_campaignRules"])
            strategy             = campaign_rules.get("Strategy", "STATIC").upper()
            dial_ratio           = float(
                campaign_rules.get("ratio", campaign_rules.get("dialRatio", 1.0))
            )
            min_ratio            = float(campaign_rules.get("minRatio", 1.0))
            max_ratio            = float(campaign_rules.get("maxRatio", 3.0))
            limits               = campaign_rules.get("limits", {})
            max_total_attempts   = int(limits.get("maxtotalattempts", 5))
            max_attempts_per_day = int(limits.get("maxattemptsper_day", 2))
            calling_hours        = campaign_rules.get("callinghours", {})
            max_channels         = int(limits.get("maxChannels", 0))
            campaign_cps         = int(campaign_rules.get("cps", DEFAULT_CAMPAIGN_CPS))

            if not self._is_campaign_active(campaign):
                logger.info("Campaign %s inactive — skipping", campaign.get("c_campaignId"))
                return

            if not self._is_within_date_range(campaign_rules):
                return

            if not self._is_within_calling_hours(calling_hours):
                return

            agents       = self._get_available_agents(campaign)
            stats        = self._get_campaign_stats(campaign["c_campaignId"], accountid)
            active_calls = stats["active_calls"]

            logger.info(
                "Campaign %s | agents=%d active_calls=%d strategy=%s",
                campaign["c_campaignId"], agents, active_calls, strategy,
            )

            # --- ADAPTIVE DIALING ---
            if strategy == "ADAPTIVE":
                metrics_json = self.redis.get(f"campaign-metrics:{campaign['c_campaignId']}")
                if metrics_json:
                    metrics       = json.loads(metrics_json)
                    asr           = metrics.get("asr", 0.0)
                    drop_rate     = metrics.get("drop_rate", 0.0)
                    waiting_calls = metrics.get("waiting_calls", 0)

                    dial_ratio = (1.0 / asr) if asr > 0 else min_ratio
                    dial_ratio = max(min_ratio, min(dial_ratio, max_ratio))

                    if drop_rate > 0.03:
                        dial_ratio = max(min_ratio, dial_ratio - 1.0)

                    if waiting_calls >= agents and waiting_calls > 0:
                        logger.info(
                            "Queue backpressure: %d waiting >= %d agents. Pausing dials.",
                            waiting_calls, agents,
                        )
                        dial_ratio = 0.0

                    logger.info(
                        "Adaptive -> ASR=%.2f Drop=%.2f Queue=%d Ratio=%.2f",
                        asr, drop_rate, waiting_calls, dial_ratio,
                    )
                else:
                    logger.warning(
                        "No campaign metrics in Redis for %s — defaulting to minRatio",
                        campaign["c_campaignId"],
                    )
                    dial_ratio = min_ratio
            else:
                # STATIC: clamp to [min_ratio, max_ratio]
                dial_ratio = max(min_ratio, min(dial_ratio, max_ratio))

            # --- SYNC RATIO TO MYSQL (throttled to once per 10 s) ---
            sync_lock = f"ratio-sync:{campaign['c_campaignId']}"
            if self.redis.set(sync_lock, "1", ex=10, nx=True):
                self._update_campaign_ratio(
                    campaign["c_campaignId"],
                    accountid,
                    campaign["c_accountNo"],
                    dial_ratio,
                    agents,
                )
                logger.info(
                    "Synced ratio=%.2f agents=%d to MySQL for campaign %s",
                    dial_ratio, agents, campaign["c_campaignId"],
                )

            target             = int(agents * dial_ratio)
            remaining_capacity = (max_channels - active_calls) if max_channels else target
            needed             = min(target - active_calls, remaining_capacity)

            if needed <= 0:
                logger.info(
                    "No new dials needed (needed=%d target=%d active=%d max_channels=%d)",
                    needed, target, active_calls, max_channels,
                )
                return

            leads = self._get_next_eligible_leads(
                campaign["c_campaignId"],
                campaign,
                accountid,
                needed,
                max_total_attempts,
                max_attempts_per_day,
            )
            for lead in leads:
                self._increment_active_calls(
                    campaign["c_campaignId"], accountid, lead["p_leadaccountNo"]
                )
                self._publish_dial_command(campaign, lead, campaign_cps)

        finally:
            # Always release the lock so the next trigger is never blocked
            self.redis.delete(lock_key)

    # -----------------------------------------------------------------------
    # Publish DIAL_COMMAND
    # -----------------------------------------------------------------------
    def _publish_dial_command(self, campaign, lead, campaign_cps: int = DEFAULT_CAMPAIGN_CPS):
        accountdetails = self._get_accountdetails(campaign["c_accountId"])
        if not accountdetails:
            logger.error(
                "No account details for account %s — skipping dial command",
                campaign["c_accountId"],
            )
            return

        plan_details = json.loads(accountdetails.get("a_planDetails", "{}"))
        calllimit    = (
            plan_details.get("limits", {}).get("features", {}).get("CALLLIMIT", 0)
        )

        event = {
            "event_type":      "DIAL_COMMAND",
            "account_id":      campaign["c_accountId"],
            "account_no":      campaign["c_accountNo"],
            "campaign_id":     campaign["c_campaignId"],
            "c_campaignName":  campaign["c_campaignName"],
            "c_dialerType":    campaign["c_dialerType"],
            "c_campaignRules": campaign["c_campaignRules"],
            "c_accountPrefix": campaign["c_accountPrefix"],
            "c_clinumberId":   campaign["c_clinumberId"],
            "c_clinumberName": campaign["c_clinumberName"],
            "p_peerName":      campaign["p_peerName"],
            "c_queuegroupId":  campaign["c_queuegroupId"],
            "campaign_cps":    campaign_cps,
            "calllimit":       calllimit,
            "lead_id":         lead["p_leadID"],
            "phone_number":    lead["p_leadPhoneNumber"],
            "timestamp":       datetime.utcnow().isoformat(),
        }
        self.producer.produce(
            "dialer.dial_command",
            key=str(campaign["c_campaignId"]).encode(),
            value=json.dumps(event).encode(),
            callback=delivery_report,
        )
        self.producer.poll(0)
        logger.info(
            "DIAL_COMMAND published: lead=%s campaign=%s phone=%s",
            lead["p_leadID"], campaign["c_campaignId"], lead["p_leadPhoneNumber"],
        )

    # -----------------------------------------------------------------------
    # Campaign & Lead DB helpers
    # -----------------------------------------------------------------------
    _CAMPAIGN_QUERY = """
        SELECT
            p.c_campaignId, p.c_accountId, p.c_accountNo, p.c_campaignName,
            p.c_dialerType, p.c_campaignRules, p.c_campaignStatus,
            p.c_queuegroupId,
            cn.c_clinumberId, cn.c_accountPrefix, cn.c_clinumberName,
            pr.p_peerName
        FROM p_campaigns p
        LEFT JOIN p_relationaltable_campaigns_didnumbergroups rcd
               ON rcd.rcd_campaignsId = p.c_campaignId
        LEFT JOIN p_relationaltable_didnumbers_didnumbergroups rdd
               ON rdd.r_didnumbergroupId = rcd.rcd_didnumbergroupsId
        LEFT JOIN p_clinumbers cn
               ON cn.c_clinumberId = rdd.r_didnumberId
        LEFT JOIN p_peers pr
               ON pr.p_peerId = cn.c_peerId
        WHERE p.c_campaignId = %s AND p.c_accountId = %s ORDER BY RAND() LIMIT 1
    """

    def _get_campaign(self, campaign_id, accountid):
        return self._execute_mysql_one(self._CAMPAIGN_QUERY, (campaign_id, accountid))

    def _get_accountdetails(self, accountid):
        return self._execute_mysql_one(
            "SELECT a_planDetails FROM p_accounts WHERE a_accountId = %s LIMIT 1",
            (accountid,),
        )

    def _log_call_attempt(
        self, campaign_id, lead_id, call_uuid, payload, result, accountid, accountno
    ):
        self._execute_mysql(
            """
            INSERT IGNORE INTO p_predictiveCallAttempts
            (p_callAttemptCampaignid, p_callAttemptaccountId, p_callAttemptaccountNo,
             p_callAttemptLeadid, p_callAttemptCallUuid, p_callAttemptPhoneNumber,
             p_callAttemptInitiatedAt, p_callAttemptEndedAt, p_callAttemptDurationSeconds,
             p_callAttemptResult, p_callAttemptHangupCause, p_callAttemptExtention)
            VALUES (%s,%s,%s,%s,%s,%s,NOW(),NOW(),%s,%s,%s,%s)
            """,
            (
                campaign_id, accountid, accountno, str(lead_id), call_uuid,
                payload.get("phoneNumber"),
                payload.get("duration", 0),
                result,
                payload.get("hangupCause"),
                payload.get("extension"),
            ),
            fetch=False,
        )

    def _remove_active_call(self, call_uuid):
        self._execute_mysql(
            "DELETE FROM p_predictiveActiveCalls WHERE p_activeCallUuid = %s",
            (call_uuid,),
            fetch=False,
        )

    def _update_campaign_stats(self, campaign_id, result, accountid, accountno):
        connected = 1 if result == "ANSWERED" else 0
        self._execute_mysql(
            """
            INSERT INTO p_predictiveCampaignStats
            (p_predictiveCampaignId, p_predictiveaccountid, p_predictiveaccountno,
             p_predictiveactiveCalls, p_predictiveCallsToday, p_predictiveTotalCalls,
             p_predictiveCallsConnectedToday, p_predictiveTotalConnected)
            VALUES (%s,%s,%s,0,1,1,%s,%s)
            ON DUPLICATE KEY UPDATE
                p_predictiveactiveCalls         = GREATEST(p_predictiveactiveCalls - 1, 0),
                p_predictiveCallsToday          = p_predictiveCallsToday + 1,
                p_predictiveTotalCalls          = p_predictiveTotalCalls + 1,
                p_predictiveCallsConnectedToday = p_predictiveCallsConnectedToday + %s,
                p_predictiveTotalConnected      = p_predictiveTotalConnected + %s
            """,
            (campaign_id, accountid, accountno, connected, connected, connected, connected),
            fetch=False,
        )

    def _update_campaign_ratio(self, campaign_id, accountid, accountno, ratio, agents):
        self._execute_mysql(
            """
            INSERT INTO p_predictiveCampaignStats
            (p_predictiveCampaignId, p_predictiveaccountid, p_predictiveaccountno,
             p_predictiveCurrentRatio, p_predictiveAvailableAgents)
            VALUES (%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
                p_predictiveCurrentRatio    = %s,
                p_predictiveAvailableAgents = %s
            """,
            (
                campaign_id, accountid, accountno,
                float(ratio), int(agents),
                float(ratio), int(agents),
            ),
            fetch=False,
        )

    # -----------------------------------------------------------------------
    # Lead update after call — CORE RETRY LOGIC
    #
    # Attempt-limit matrix:
    #
    #   maxtotalattempts=3, maxattemptsper_day=1
    #     → 1 call/day for 3 days (next_call_time = next-day midnight after each call)
    #
    #   maxtotalattempts=5, maxattemptsper_day=5
    #     → up to 5 calls in a single day; stops when total hits 5
    #
    #   maxtotalattempts=10, maxattemptsper_day=5
    #     → 5 calls today, 5 calls tomorrow; stops at 10 total
    #
    #   maxtotalattempts=10, maxattemptsper_day=1
    #     → 1 call/day for 10 days
    # -----------------------------------------------------------------------
    def _update_lead_after_call(
        self, lead: dict, result: str, campaign: dict, accountid: str
    ):
        now            = int(time.time())
        campaign_rules = json.loads(campaign["c_campaignRules"])
        limits         = campaign_rules.get("limits", {})
        max_total      = int(limits.get("maxtotalattempts", 5))
        max_per_day    = int(limits.get("maxattemptsper_day", 2))
        retry_rules    = campaign_rules.get("retryrules", {})

        # Compute post-call counters (this call counts)
        total_after = lead.get("p_totalAttempts", 0) + 1
        today_after = lead.get("p_todayAttempts", 0) + 1

        update: dict = {
            "p_leadLastResult":      result,
            "p_leadlastAttemptDate": now,
            "p_updatedAt":           now,
        }
        inc = {"p_totalAttempts": 1, "p_todayAttempts": 1}

        logger.info(
            "Lead %s | result=%s total_after=%d/%d today_after=%d/%d",
            lead.get("p_leadID"), result,
            total_after, max_total,
            today_after, max_per_day,
        )

        if result == "ANSWERED":
            # Successful contact — no further attempts needed
            update["p_leadStatus"]       = "COMPLETED"
            update["p_leadnextCallTime"] = None

        elif total_after >= max_total:
            # All lifetime attempts exhausted — retire the lead permanently
            update["p_leadStatus"]       = "EXHAUSTED"
            update["p_leadnextCallTime"] = None
            logger.info(
                "Lead %s exhausted after %d total attempts",
                lead.get("p_leadID"), total_after,
            )

        else:
            # Still has remaining lifetime attempts — schedule next retry
            update["p_leadStatus"] = "FAILED"

            if today_after >= max_per_day:
                # ----------------------------------------------------------------
                # Daily quota reached — push next attempt to tomorrow's midnight.
                # The daily reset (p_todayAttempts = 0) runs at midnight too, so
                # by the time this lead becomes eligible the counter is cleared.
                # ----------------------------------------------------------------
                tomorrow   = datetime.now().date() + timedelta(days=1)
                next_midnight = int(
                    datetime.combine(tomorrow, dt_time(0, 0)).timestamp()
                )
                update["p_leadnextCallTime"] = next_midnight
                logger.info(
                    "Lead %s daily quota reached (%d/%d) — next call at %s",
                    lead.get("p_leadID"), today_after, max_per_day,
                    datetime.fromtimestamp(next_midnight).isoformat(),
                )
            else:
                # Daily quota not yet reached — apply intra-day retry interval
                rule_key = result.replace(" ", "_")
                rule     = retry_rules.get(rule_key, {})

                if rule.get("enabled", False):
                    intervals     = rule.get("intervalsminutes") or [10]
                    attempt_index = min(
                        lead.get("p_totalAttempts", 0), len(intervals) - 1
                    )
                    delay_secs                   = intervals[attempt_index] * 60
                    update["p_leadnextCallTime"] = now + delay_secs
                    logger.info(
                        "Lead %s retry in %d min (rule=%s interval_index=%d)",
                        lead.get("p_leadID"), intervals[attempt_index],
                        rule_key, attempt_index,
                    )
                else:
                    # No retry rule — use default 10-minute back-off
                    update["p_leadnextCallTime"] = now + 600
                    logger.info(
                        "Lead %s no retry rule for %s — default 10-min back-off",
                        lead.get("p_leadID"), result,
                    )

        self._mongo_update_one(
            self.db[str(accountid)],
            {"p_leadID": lead["p_leadID"]},
            {"$set": update, "$inc": inc},
        )

    # -----------------------------------------------------------------------
    # Guard helpers
    # -----------------------------------------------------------------------
    def _is_within_calling_hours(self, calling_hours) -> bool:
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
            logger.error("Calling-hours check failed: %s", exc)
            return True

    def _is_within_date_range(self, campaign_rules) -> bool:
        try:
            today  = datetime.now().date()
            limits = campaign_rules.get("limits", {})

            start_str = limits.get("startDate")
            end_str   = limits.get("endDate")
            lifetime  = limits.get("campaignlifetimedays")

            if not start_str:
                logger.warning("Campaign has no startDate — treating as always valid")
                return True

            start = datetime.strptime(start_str, "%Y-%m-%d").date()

            if end_str:
                end = datetime.strptime(end_str, "%Y-%m-%d").date()
            elif lifetime is not None:
                end = start + timedelta(days=int(lifetime))
            else:
                if today < start:
                    logger.info(
                        "Campaign not yet started | today=%s startDate=%s", today, start
                    )
                    return False
                return True

            if start > end:
                logger.error(
                    "Invalid date range: startDate %s after endDate %s", start, end
                )
                return False

            in_range = start <= today <= end
            if not in_range:
                logger.info(
                    "Campaign outside date range | today=%s range=[%s → %s]",
                    today, start, end,
                )
            return in_range

        except Exception as exc:
            logger.error("Date-range check failed: %s", exc)
            return True

    def _is_campaign_active(self, campaign) -> bool:
        try:
            return campaign.get("c_campaignStatus", "").upper() == "ACTIVE"
        except Exception as exc:
            logger.error("Campaign status check failed: %s", exc)
            return False

    # -----------------------------------------------------------------------
    # Campaign stats / agent helpers
    # -----------------------------------------------------------------------
    def _get_available_agents(self, campaign) -> int:
        result = self._execute_mysql_one(
            "SELECT COUNT(*) AS count FROM p_liveMonitoring "
            "WHERE l_memberAccountId = %s AND l_memberStatus = 'AVAILABLE' "
            "AND l_memberCampaignId = %s",
            (campaign["c_accountId"], campaign["c_campaignId"]),
        )
        return result["count"] if result else 0

    def _get_campaign_stats(self, campaign_id, accountid) -> dict:
        result = self._execute_mysql_one(
            "SELECT p_predictiveactiveCalls AS active_calls "
            "FROM p_predictiveCampaignStats "
            "WHERE p_predictiveCampaignId = %s AND p_predictiveaccountid = %s",
            (campaign_id, accountid),
        )
        return result or {"active_calls": 0}

    def _increment_active_calls(self, campaign_id, accountid, accountno):
        self._execute_mysql(
            """
            INSERT INTO p_predictiveCampaignStats
            (p_predictiveCampaignId, p_predictiveaccountid, p_predictiveaccountno,
             p_predictiveactiveCalls)
            VALUES (%s,%s,%s,1)
            ON DUPLICATE KEY UPDATE
                p_predictiveactiveCalls = p_predictiveactiveCalls + 1
            """,
            (campaign_id, accountid, accountno),
            fetch=False,
        )

    def _get_next_eligible_leads(
        self,
        campaign_id,
        campaign,
        accountid,
        limit,
        max_total_attempts,
        max_attempts_per_day,
    ) -> list:
        now = int(time.time())
        logger.info(
            "Querying leads | account=%s campaign=%s max_total=%s max_per_day=%s limit=%s",
            accountid, campaign_id, max_total_attempts, max_attempts_per_day, limit,
        )
        leads_collection = self.db[str(accountid)]

        leads = self._mongo_find_list(
            collection=leads_collection,
            query={
                "p_leadCampaignID": campaign_id,
                # EXHAUSTED leads are never retried
                "p_leadStatus":     {"$in": ["NEW", "FAILED"]},
                # Hard lifetime cap enforced at query time as a belt-and-suspenders
                "p_totalAttempts":  {"$lt": max_total_attempts},
                # Daily cap — reset to 0 at midnight by the monitor
                "p_todayAttempts":  {"$lt": max_attempts_per_day},
                # Respect scheduled retry / next-day timestamps
                "$or": [
                    {"p_leadnextCallTime": None},
                    {"p_leadnextCallTime": {"$lte": now}},
                ],
            },
            sort=[("p_leadnextCallTime", 1), ("p_createdAt", 1)],
            limit=limit,
        )

        logger.info(
            "Eligible leads found: %d for campaign %s", len(leads), campaign_id
        )
        if not leads:
            return []

        lead_ids = [lead["p_leadID"] for lead in leads]
        self._mongo_update_many(
            collection=leads_collection,
            query={
                "p_leadID":     {"$in": lead_ids},
                "p_leadStatus": {"$in": ["NEW", "FAILED"]},
            },
            update={"$set": {"p_leadStatus": "CALLING", "p_updatedAt": now}},
        )
        return leads

    # -----------------------------------------------------------------------
    # Daily attempt reset
    # Called by PredictiveMonitor at midnight for each active account.
    # -----------------------------------------------------------------------
    def reset_today_attempts(self, accountid: str):
        leads_collection = self.db[str(accountid)]
        result = self._mongo_update_many(
            collection=leads_collection,
            query={"p_todayAttempts": {"$gt": 0}},
            update={"$set": {"p_todayAttempts": 0}},
        )
        logger.info(
            "Daily reset: cleared p_todayAttempts for account %s (matched=%s modified=%s)",
            accountid, result.matched_count, result.modified_count,
        )

    # -----------------------------------------------------------------------
    # Main loop
    # -----------------------------------------------------------------------
    def start(self):
        self.initialize()
        self.consumer.subscribe(["dialer.dial_result", "dialer.dial_start"])
        self.running = True
        logger.info("Predictive dialer consumer started")

        signal.signal(signal.SIGINT,  lambda s, f: self.stop())
        signal.signal(signal.SIGTERM, lambda s, f: self.stop())

        try:
            while self.running:
                msg = self.consumer.poll(0.5)
                if not msg or msg.error():
                    continue
                ok = self.process_kafka_event(msg)
                if ok:
                    self.consumer.commit()
        except Exception as exc:
            logger.error("Fatal error in main loop: %s", exc, exc_info=True)
        finally:
            self.stop()

    def stop(self):
        self.running = False
        if self.consumer:
            self.consumer.close()
        if self.producer:
            self.producer.flush()
        if self.redis:
            self.redis.close()
        if self.mongo_client:
            self.mongo_client.close()
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._loop_thread.join(timeout=5)
        logger.info("Consumer stopped")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
def main():
    consumer = PredictiveDialerConsumer()
    consumer.start()


if __name__ == "__main__":
    main()