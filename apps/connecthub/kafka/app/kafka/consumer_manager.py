import asyncio
import json
import os
import sys
import time
import logging
from aiokafka import AIOKafkaConsumer
from services import campaign_service
from ESL import ESLconnection
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stderr)
logging.getLogger("aiokafka").setLevel(logging.WARNING)
logging.getLogger("kafka").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka-service:9092")
CONSUMERS = {"campaign_requests": "process_campaign_call"}
FS_SERVER = os.getenv("FS_SERVER")
FS_PORT = os.getenv("FS_PORT")
FS_PASSWORD = os.getenv("FS_PASSWORD")

dialed_calls_count = 0
last_reset_time = 0

# Concurrency limit
CONCURRENT_DIAL_LIMIT = 10
semaphore = asyncio.Semaphore(CONCURRENT_DIAL_LIMIT)

async def dial_number(lead_number, campaign_id, callerId, carrierName, carrierPrefix, campaignName, database, c_Id):
    """Send originate command to FreeSWITCH asynchronously"""
    async with semaphore:
        start_time = time.time()
        conn = None
        try:
            logging.debug(f"Creating ESL connection for c_Id: {c_Id}")
            conn = ESLconnection(FS_SERVER, FS_PORT, FS_PASSWORD)
            if not conn.connected():
                logging.error(f"❌ Failed to connect to FreeSWITCH for c_Id: {c_Id}.")
                return
            """Old"""
            # dial_cmd = (
            #     f"originate {{customerNumber={lead_number},carrierName={carrierName},campaignName={campaignName},"
            #     f"campaignId={campaign_id},database={database},session_in_hangup_hook=true,"
            #     f"api_hangup_hook='lua orient_hanup.lua {campaign_id} {lead_number}'}}"
            #     f"sofia/gateway/{carrierName}/{carrierPrefix}{lead_number} &transfer(ivr_flow XML default)"
            # )
            """Dynamic CallerID"""
            dial_cmd = (
                f"originate {{customerNumber={lead_number},origination_caller_id_number={callerId},carrierName={carrierName},campaignName={campaignName},"
                f"campaignId={campaign_id},database={database},session_in_hangup_hook=true,"
                f"api_hangup_hook='lua orient_hangup.lua {campaign_id} {lead_number}'}}"
                f"sofia/gateway/{carrierName}/{carrierPrefix}{lead_number} &transfer(ivr_flow XML default)"
            )

            conn.bgapi(dial_cmd)
            logging.info(f"📲 Dial Command Sent: {dial_cmd} for c_Id: {c_Id} (took {time.time() - start_time:.3f}s)")
        except Exception as e:
            logging.error(f"⚠️ Error dialing call for c_Id: {c_Id}: {e} (took {time.time() - start_time:.3f}s)")
        finally:
            if conn:
                conn.disconnect()
        # Yield control to event loop
        await asyncio.sleep(0)

async def process_campaign_call(data):
    """Handles incoming campaign calls asynchronously"""
    global dialed_calls_count, last_reset_time
    logging.info(f"🔥 Received message: {data}")

    lead_number = data.get("lead_number")
    campaign_id = data.get("campaign_id")
    carrierName = data.get("carrierName")
    callerId = data.get("callerId")
    carrierPrefix = data.get("carrierPrefix", "")
    campaignName = data.get("campaignName")
    database = data.get("database")
    c_Id = data.get("c_Id")

    if not lead_number or not carrierName:
        logging.warning(f"⚠️ Missing 'lead_number' or 'carrierName' in message! c_Id: {c_Id}")
        return

    try:
        campaign_status = campaign_service.getCampaignStatus(campaign_id, database)
        if campaign_status == "stopped":
            logging.info(f"⏹ Campaign {campaign_id} is stopped. Ignoring lead {lead_number} (c_Id: {c_Id}).")
            return

        if data.get("reset_count"):
            current_time = time.time()
            if current_time - last_reset_time > 10:
                dialed_calls_count = 0
                last_reset_time = current_time
                logging.info("🔄 Call count manually reset via Kafka message.")

        logging.info(f"📞 Queuing Dial: {lead_number} via {carrierName} ({carrierPrefix}) for c_Id: {c_Id}...")
        task = asyncio.create_task(dial_number(lead_number, campaign_id, callerId, carrierName, carrierPrefix, campaignName, database, c_Id))
        # Yield control to allow task to start
        await asyncio.sleep(0)
        dialed_calls_count += 1
        logging.info(f"📊 Total calls dialed in this run: {dialed_calls_count}")
    
    except Exception as e:
        logging.error(f"⚠️ Error processing call for c_Id: {c_Id}: {e}")

async def consume(topic):
    """Kafka consumer that listens for messages asynchronously"""
    while True:
        try:
            logging.info(f"🚀 Starting Kafka consumer for topic: {topic}")
            consumer = AIOKafkaConsumer(
                topic,
                bootstrap_servers=KAFKA_BROKER,
                auto_offset_reset="latest",
                enable_auto_commit=True,
                fetch_max_bytes=1048576,
                max_partition_fetch_bytes=1048576,
                consumer_timeout_ms=500
            )
            await consumer.start()
            logging.info(f"✅ Kafka consumer connected to topic: {topic}")
            
            try:
                async for msg in consumer:
                    raw_msg = msg.value.decode("utf-8")
                    logging.debug(f"📩 Raw message received: {raw_msg}")
                    data = json.loads(raw_msg)
                    logging.debug(f"🔍 Parsed data: {data}")

                    processor_name = CONSUMERS.get(topic)
                    processor = globals().get(processor_name)

                    if processor and callable(processor):
                        await processor(data)  # Process one message at a time
                        await asyncio.sleep(0)  # Yield control
                    else:
                        logging.warning(f"⚠️ No valid processor found for topic {topic}")

            finally:
                logging.info("🛑 Stopping consumer...")
                await consumer.stop()

        except Exception as e:
            logging.error(f"⚠️ Kafka down, retrying in 5 seconds... Error: {e}")
            await asyncio.sleep(5)

async def start_consumers():
    """Start all Kafka consumers"""
    logging.info("🚀 Starting Kafka consumers...")
    tasks = [asyncio.create_task(consume(topic)) for topic in CONSUMERS.keys()]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    logging.info("🔥 Consumer script started...")
    asyncio.run(start_consumers())