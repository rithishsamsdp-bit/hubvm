"""
Predictive Dialer – Logic Consumer
Consumes dialer.dial_result / dialer.dial_start from Kafka,
drives lead selection and dial-command publishing.
"""

import asyncio
import inspect
import json
import logging
import signal
import sys
import threading
import time
import platform
from datetime import datetime, time as dt_time, timedelta
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

#Global function
def delivery_report(err, msg):
    if err:
        logger.error(f"Delivery failed: {err}")
    else:
        logger.info(f"Delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}")
# ---------------------------------------------------------------------------
# Predictive Dialer Consumer
# ---------------------------------------------------------------------------
class PredictiveDialerConsumer:
    def __init__(self):
        self.consumer: Optional[Consumer] = None
        self.producer: Optional[Producer] = None
        self.running = False

        # MongoDB (async via Motor – driven from a dedicated background loop)
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None

        # Dedicated asyncio event loop in a background thread so that
        # Motor coroutines can be called safely from synchronous code.
        # FIX: Loop is started BEFORE Motor client is created so that
        # AsyncIOMotorClient is bound to self._loop, not the main thread loop.
        self._loop = asyncio.new_event_loop()
        self._loop_thread = threading.Thread(
            target=self._loop.run_forever, daemon=True, name="motor-loop"
        )
        self._loop_thread.start()

        # MySQL
        self.mysql_pool: Optional[pooling.MySQLConnectionPool] = None

        # Redis
        self.redis: Optional[Redis] = None

    # -----------------------------------------------------------------------
    # Async bridge
    # -----------------------------------------------------------------------
    def _run_async(self, coro, timeout: int = 30):
        """
        Submit a coroutine to the background Motor loop and block until done.
        Only accepts objects produced by calling an `async def` function.
        Never pass cursor chains or awaitables directly — wrap them in async def.
        """
        if not inspect.iscoroutine(coro):
            raise TypeError(
                f"_run_async received a {type(coro).__name__}, not a coroutine. "
                "Wrap Motor calls in an async def function."
            )
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result(timeout=timeout)

    # -----------------------------------------------------------------------
    # MongoDB helpers — every Motor call wrapped in async def
    # so _run_async always receives a guaranteed coroutine object.
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
        # FIX: Chain .sort() separately — Motor's find() does not accept sort as a kwarg
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
        # FIX: Create the Motor client INSIDE self._loop via run_coroutine_threadsafe
        # so it is bound to the correct event loop, not the main thread's loop.
        async def _setup():
            client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                maxPoolSize=10,
                minPoolSize=2,
                serverSelectionTimeoutMS=3000,
            )
            # Ping to verify the connection is alive on the correct loop
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
        self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.redis.ping()
        logger.info("Redis ready")

    def _init_kafka(self):
        bootstrap = f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}"

        # Auto-create required topics
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
                    "MySQL OperationalError (attempt %d/%d): %s", attempt + 1, retries, exc
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
            return self._process_dial_result(payload)

        if event_type == "DIAL_START":
            logger.info("Starting campaign: %s", payload)
            campaign_id = payload.get("campaign_id")
            accountid   = payload.get("accountid")
            campaign    = self._get_campaign(campaign_id, accountid)
            if not campaign:
                logger.warning("Campaign not found: %s", campaign_id)
                return False
            logger.info("Starting campaign: %s", campaign_id)
            self._generate_next_dial_command(campaign, accountid)
            return True

        logger.warning("Unknown event type: %s", event_type)
        return False

    # -----------------------------------------------------------------------
    # Process DIAL_RESULT
    # -----------------------------------------------------------------------
    def _process_dial_result(self, payload) -> bool:
        call_uuid = payload["callUuid"]

        # Atomic idempotency — SET NX EX is a single Redis command (no race window)
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
            # FIX: Return False so the Kafka offset is NOT committed and the
            # message can be retried, rather than silently losing it.
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
        self._generate_next_dial_command(campaign, accountid)
        return True

    # -----------------------------------------------------------------------
    # Generate next dial commands
    # -----------------------------------------------------------------------
    def _generate_next_dial_command(self, campaign, accountid):
        lock_key = f"dial-lock:{campaign['c_campaignId']}"
        # Atomic distributed lock — prevents concurrent over-dialling
        if not self.redis.set(lock_key, "1", ex=10, nx=True):
            return

        campaign_rules       = json.loads(campaign["c_campaignRules"])
        # Support both key names used across campaign configs
        dial_ratio           = campaign_rules.get("ratio", campaign_rules.get("dialRatio", 1))
        limits               = campaign_rules.get("limits", {})
        max_total_attempts   = limits.get("maxtotalattempts", 5)
        max_attempts_per_day = limits.get("maxattemptsper_day", 2)
        calling_hours        = campaign_rules.get("callinghours", {})
        max_channels         = int(limits.get("maxChannels", 0))

        if not self._is_campaign_active(campaign):
            logger.info("Campaign inactive: %s", campaign.get("c_campaignStatus"))
            return

        if not self._is_within_date_range(campaign_rules):
            return

        if not self._is_within_calling_hours(calling_hours):
            return

        agents       = self._get_available_agents(campaign)
        logger.info("Available agents: %d", agents)
        stats        = self._get_campaign_stats(campaign["c_campaignId"], accountid)
        active_calls = stats["active_calls"]
        target       = int(agents * dial_ratio)

        if max_channels and active_calls >= max_channels:
            logger.info("Max channels reached: %d/%d", active_calls, max_channels)
            return

        remaining_capacity = (max_channels - active_calls) if max_channels else target
        needed = min(target - active_calls, remaining_capacity)
        if needed <= 0:
            logger.info("No new dials needed (needed=%d, target=%d, remaining_capacity=%d, max_channels=%d, active_calls=%d)", needed, target, remaining_capacity, max_channels, active_calls)
            return

        leads = self._get_next_eligible_leads(
            campaign["c_campaignId"], campaign, accountid,
            needed, max_total_attempts, max_attempts_per_day,
        )
        for lead in leads:
            logger.info("lead %s", lead)
            self._increment_active_calls(
                campaign["c_campaignId"], accountid, lead["p_leadaccountNo"]
            )
            self._publish_dial_command(campaign, lead)

    # -----------------------------------------------------------------------
    # Publish DIAL_COMMAND
    # -----------------------------------------------------------------------
    def _publish_dial_command(self, campaign, lead):
        accountdetails = self._get_accountdetails(campaign["c_accountId"])

        # FIX: Guard against None accountdetails to prevent AttributeError crash
        if not accountdetails:
            logger.error(
                "No account details found for account %s — skipping dial command",
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
            "calllimit":       calllimit,
            "lead_id":         lead["p_leadID"],
            "phone_number":    lead["p_leadPhoneNumber"],
            "timestamp":       datetime.utcnow().isoformat(),
        }
        self.producer.produce(
            "dialer.dial_command",
            key=str(campaign["c_campaignId"]).encode(),
            value=json.dumps(event).encode(),
            callback=delivery_report
        )
        # Trigger delivery callbacks immediately; prevents silent buffering on errors.
        self.producer.poll(0)
        

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
        WHERE p.c_campaignId = %s AND p.c_accountId = %s
        LIMIT 1
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
        self._execute_mysql(
            """
            INSERT INTO p_predictiveCampaignStats
            (p_predictiveCampaignId, p_predictiveaccountid, p_predictiveaccountno,
             p_predictiveactiveCalls, p_predictiveCallsToday, p_predictiveTotalCalls)
            VALUES (%s,%s,%s,0,1,1)
            ON DUPLICATE KEY UPDATE
                p_predictiveactiveCalls = GREATEST(p_predictiveactiveCalls - 1, 0),
                p_predictiveCallsToday  = p_predictiveCallsToday + 1,
                p_predictiveTotalCalls  = p_predictiveTotalCalls + 1
            """,
            (campaign_id, accountid, accountno),
            fetch=False,
        )

    def _update_lead_after_call(self, lead: dict, result: str, campaign: dict, accountid: str):
        now              = int(time.time())
        leads_collection = self.db[str(accountid)]

        update: dict = {
            "p_leadLastResult":      result,
            "p_leadlastAttemptDate": now,
            "p_updatedAt":           now,
        }
        inc = {"p_totalAttempts": 1, "p_todayAttempts": 1}

        campaign_rules = json.loads(campaign["c_campaignRules"])
        retry_rules    = campaign_rules.get("retryrules", {})

        if result in ("BUSY", "NO_ANSWER") and retry_rules.get(result, {}).get("enabled", False):
            intervals     = retry_rules[result].get("intervalsminutes", [10])
            attempt_index = min(lead.get("p_totalAttempts", 0), len(intervals) - 1)
            update["p_leadnextCallTime"] = now + intervals[attempt_index] * 60
            update["p_leadStatus"]       = "FAILED"
        elif result == "ANSWERED":
            update["p_leadStatus"]       = "COMPLETED"
            update["p_leadnextCallTime"] = None
        else:
            update["p_leadStatus"]       = "FAILED"
            update["p_leadnextCallTime"] = now + 600

        self._mongo_update_one(
            leads_collection,
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
            end_str   = calling_hours.get("end", "23:59")
            start     = dt_time(*map(int, start_str.split(":")))
            end       = dt_time(*map(int, end_str.split(":")))
            if start <= end:
                return start <= now <= end
            return now >= start or now <= end   # overnight span e.g. 22:00–06:00
        except Exception as exc:
            logger.error("Calling-hours check failed: %s", exc)
            return True  # fail-open

    def _is_within_date_range(self, campaign_rules) -> bool:
        """
        Evaluate today's date against the campaign's configured date range.

        Rules:
          • Dates are compared as plain calendar dates — no UTC conversion.
          • endDate is INCLUSIVE (a campaign ending on the 25th runs all day on the 25th).
          • If endDate is absent but campaignlifetimedays is set, end = start + lifetime.
          • If neither endDate nor lifetime is set, the campaign is open-ended (no expiry).
          • On any config error, fails OPEN so a bad date string never silently kills calls.
        """
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
                logger.debug(
                    "End date derived from lifetime: %s + %d days = %s",
                    start, int(lifetime), end,
                )
            else:
                # Open-ended — only block if campaign hasn't started yet
                if today < start:
                    logger.info(
                        "Campaign has not started yet | today=%s startDate=%s", today, start
                    )
                    return False
                return True

            if start > end:
                logger.error(
                    "Invalid date range: startDate %s is after endDate %s", start, end
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
            return True  # fail-open

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
        self, campaign_id, campaign, accountid, limit,
        max_total_attempts, max_attempts_per_day,
    ) -> list:
        now              = int(time.time())
        logger.info(
            "Querying leads — collection: %s, campaign_id: %s, "
            "max_total_attempts: %s, max_attempts_per_day: %s, limit: %s",
            str(accountid), campaign_id,
            max_total_attempts, max_attempts_per_day, limit,
        )
        leads_collection = self.db[str(accountid)]

        leads = self._mongo_find_list(
            collection=leads_collection,
            query={
                "p_leadCampaignID":  campaign_id,
                "p_leadStatus":      {"$in": ["NEW", "FAILED"]},
                "p_totalAttempts":   {"$lt": max_total_attempts},
                "p_todayAttempts":   {"$lt": max_attempts_per_day},
                "$or": [
                    {"p_leadnextCallTime": None},
                    {"p_leadnextCallTime": {"$lte": now}},
                ],
            },
            sort=[("p_leadnextCallTime", 1), ("p_createdAt", 1)],
            limit=limit,
        )

        logger.info("Leads count: %s", len(leads))
        if not leads:
            logger.info("No leads to dial for campaign %s", campaign_id)
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
    # Daily attempt reset — call this from a scheduler at midnight
    # FIX: p_todayAttempts must be reset daily or leads are permanently blocked
    # -----------------------------------------------------------------------
    def reset_today_attempts(self, accountid: str):
        """
        Reset p_todayAttempts to 0 for all leads in the given account's collection.
        Should be triggered once per day at midnight (e.g. via APScheduler or cron).
        """
        leads_collection = self.db[str(accountid)]
        result = self._mongo_update_many(
            collection=leads_collection,
            query={"p_todayAttempts": {"$gt": 0}},
            update={"$set": {"p_todayAttempts": 0}},
        )
        logger.info(
            "Daily reset: cleared p_todayAttempts for account %s (matched=%s modified=%s)",
            accountid,
            result.matched_count,
            result.modified_count,
        )

    # -----------------------------------------------------------------------
    # Main loop
    # -----------------------------------------------------------------------
    def start(self):
        self.initialize()
        self.consumer.subscribe(["dialer.dial_result", "dialer.dial_start"])
        self.running = True
        logger.info("Predictive dialer consumer started")

        # FIX: Use signal.signal() consistently on all platforms instead of
        # attaching to asyncio.get_event_loop() which is NOT self._loop.
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