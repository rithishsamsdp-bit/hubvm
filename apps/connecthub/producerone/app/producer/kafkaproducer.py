# producer/kafkaproducer.py
import asyncio
import logging
import json
from aiokafka import AIOKafkaProducer
from aiokafka.admin import AIOKafkaAdminClient, NewTopic

logger = logging.getLogger("kafka-producer")
_bootstrap_servers = "kafka-service:9092"
_producer: AIOKafkaProducer | None = None

async def start_producer():
    """Start Kafka producer on FastAPI startup"""
    global _producer
    if _producer is None:
        loop = asyncio.get_event_loop()
        _producer = AIOKafkaProducer(
            loop=loop,
            bootstrap_servers=_bootstrap_servers,
            linger_ms=5,
            acks="all"
        )
        await _producer.start()
        logger.info("✅ Kafka producer started")

async def get_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        await start_producer()
    return _producer

async def create_topic_if_not_exists(topic_name: str):
    admin_client = AIOKafkaAdminClient(bootstrap_servers=_bootstrap_servers)
    await admin_client.start()
    try:
        topics = await admin_client.list_topics()
        if topic_name not in topics:
            new_topic = NewTopic(name=topic_name, num_partitions=1, replication_factor=1)
            await admin_client.create_topics([new_topic])
            logger.info(f"✅ Topic '{topic_name}' created")
        else:
            logger.info(f"ℹ Topic '{topic_name}' already exists")
    finally:
        await admin_client.close()

async def send_message(topic: str, key: str | None, value: dict):
    await create_topic_if_not_exists(topic)
    producer = await get_producer()
    key_bytes = key.encode("utf-8") if key else None
    value_bytes = json.dumps(value).encode("utf-8")
    try:
        await producer.send_and_wait(topic, key=key_bytes, value=value_bytes)
        logger.info(f"📤 Message sent to {topic} (key={key})")
    except Exception as e:
        logger.error(f"❌ Failed to send message to {topic}: {e}")
        raise
