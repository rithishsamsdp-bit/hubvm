"""
Production-ready Kafka Consumer with MySQL + MongoDB + Task Tracking
Handles 1M+ CSV rows efficiently
Install:
pip install confluent-kafka mysql-connector-python pymongo requests
"""

import json
import logging
import signal
import sys
import time
import io
import csv
from typing import Optional, Dict, Any
from confluent_kafka import Consumer, KafkaError
import mysql.connector
from mysql.connector import pooling
from pymongo import MongoClient
import requests
from bson import ObjectId
from datetime import datetime
from PredectiveLeadUpload import handle_predective_lead_upload
from config import settings

# -------------------------------------------------------------------
# Logging
# -------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# Constants
# -------------------------------------------------------------------
BATCH_SIZE = 5000
KAFKA_COMMIT_BATCH = 100  # commit every N messages

# -------------------------------------------------------------------
# Kafka Consumer Service
# -------------------------------------------------------------------
class KafkaConsumerService:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.consumer: Optional[Consumer] = None
        self.running = False
        self.message_count = 0
        self.error_count = 0
        self.uncommitted_count = 0

        # DB handles
        self.mysql_pool: Optional[pooling.MySQLConnectionPool] = None
        self.mongo_client: Optional[MongoClient] = None
        self.mongo_db = None

    # ----------------------------------------------------------------
    # Kafka
    # ----------------------------------------------------------------
    def create_consumer(self) -> Consumer:
        logger.info("Creating Kafka consumer...")
        consumer_config = {
            'bootstrap.servers': self.config['bootstrap_servers'],
            'group.id': self.config['group_id'],
            'auto.offset.reset': self.config.get('auto_offset_reset', 'earliest'),
            'enable.auto.commit': False,
            'max.poll.interval.ms': 300000,
            'session.timeout.ms': 45000,
            'heartbeat.interval.ms': 3000,
        }
        return Consumer(consumer_config)

    # ----------------------------------------------------------------
    # MySQL
    # ----------------------------------------------------------------
    def init_mysql(self):
        logger.info("Initializing MySQL connection pool")
        try:
            self.mysql_pool = pooling.MySQLConnectionPool(
                pool_name="kafka_mysql_pool",
                pool_size=self.config['mysql']['pool_size'],
                host=self.config['mysql']['host'],
                user=self.config['mysql']['user'],
                password=self.config['mysql']['password'],
                database=self.config['mysql']['database'],
                port=self.config['mysql'].get('port', 3306),
                autocommit=False,
                connection_timeout=10,
                use_pure=True,
            )
            conn = self.mysql_pool.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT DATABASE(), VERSION()")
            db, version = cursor.fetchone()
            logger.info(f"MySQL pool test successful: database={db}, version={version}")
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to initialize MySQL pool: {e}", exc_info=True)
            raise

    def get_mysql_conn(self):
        return self.mysql_pool.get_connection()

    # ----------------------------------------------------------------
    # MongoDB
    # ----------------------------------------------------------------
    def init_mongo(self):
        logger.info("Initializing MongoDB connection")
        try:
            self.mongo_client = MongoClient(
                self.config['mongodb']['uri'],
                maxPoolSize=self.config['mongodb'].get('max_pool_size', 2),
                serverSelectionTimeoutMS=5000
            )
            self.mongo_db = self.mongo_client[self.config['mongodb']['database']]
            self.mongo_client.server_info()
            logger.info("MongoDB connection initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MongoDB: {e}", exc_info=True)
            raise

    # ----------------------------------------------------------------
    # Record task in p_backgroundtasks
    # ----------------------------------------------------------------
    def insert_task_record(self, mysql_cursor, accountId, accountNo, status='PENDING', message=None):
        now_ts = int(time.time())
        query = """
            INSERT INTO p_backgroundtasks 
            (b_accountId, b_accountNo, b_status, b_message, started_at) 
            VALUES (%s, %s, %s, %s, %s)
        """
        mysql_cursor.execute(query, (accountId, accountNo, status, message, now_ts))
        return mysql_cursor.lastrowid

    def update_task_record(self, mysql_cursor, task_id, status, message=None):
        finished_ts = int(time.time())
        query = """
            UPDATE p_backgroundtasks
            SET b_status=%s, b_message=%s, finished_at=%s
            WHERE b_id=%s
        """
        mysql_cursor.execute(query, (status, message, finished_ts, task_id))

    # ----------------------------------------------------------------
    # Message Processing
    # ----------------------------------------------------------------
    def process_message(self, msg) -> bool:
        mysql_conn = None
        mysql_cursor = None
        task_id = None

        try:
            key = msg.key().decode() if msg.key() else None
            payload = json.loads(msg.value().decode())
            logger.info(f"Processing offset {msg.offset()} | key={key}")

            accountId = payload.get("accountId")
            accountNo = payload.get("accountNo")

            mysql_conn = self.get_mysql_conn()
            mysql_cursor = mysql_conn.cursor(dictionary=True)

            # Insert task record as PENDING
            message = "Leading upload started"
            status = 'PENDING'
            task_id = self.insert_task_record(mysql_cursor, accountId, accountNo, status, message)
            mysql_conn.commit()

            tasktype = payload.get("type")
            if tasktype == "PredectiveLeadUpload":
                handle_predective_lead_upload(
                    payload=payload,
                    mysql_conn=mysql_conn,
                    mysql_cursor=mysql_cursor,
                    mongo_db=self.mongo_db,
                    logger=logger
                )

            # Update task as SUCCESS
            self.update_task_record(mysql_cursor, task_id, 'SUCCESS', 'Leads uploaded successfully')
            mysql_conn.commit()
            return True

        except Exception as e:
            logger.error(f"Processing failed for offset {msg.offset()}: {e}", exc_info=True)
            if mysql_conn:
                mysql_conn.rollback()
                if task_id:
                    # update task as FAILED
                    try:
                        self.update_task_record(mysql_cursor, task_id, 'FAILED', str(e))
                        mysql_conn.commit()
                    except:
                        logger.exception("Failed to update task as FAILED")
            return False

        finally:
            if mysql_cursor:
                mysql_cursor.close()
            if mysql_conn:
                mysql_conn.close()
            if self.consumer:
                self.consumer.commit(message=msg, asynchronous=False)

    # ----------------------------------------------------------------
    # Error Handling
    # ----------------------------------------------------------------
    def handle_error(self, msg):
        error = msg.error()
        if error.code() == KafkaError._PARTITION_EOF:
            logger.debug(f"End of partition {msg.partition()}")
        else:
            logger.error(f"Kafka error: {error}")
            self.error_count += 1

    # ----------------------------------------------------------------
    # Lifecycle
    # ----------------------------------------------------------------
    def start(self):
        try:
            logger.info("=" * 70)
            logger.info("Starting Kafka Consumer Service")
            logger.info("=" * 70)

            self.init_mysql()
            self.init_mongo()

            self.consumer = self.create_consumer()
            logger.info(f"Subscribing to topics: {self.config['topics']}")
            self.consumer.subscribe(self.config['topics'])
            self.running = True

            poll_count = 0
            last_message_time = time.time()

            while self.running:
                msg = self.consumer.poll(0.5)
                poll_count += 1

                if poll_count % 30 == 0:
                    elapsed = int(time.time() - last_message_time)
                    logger.info(
                        f"Consumer alive | Messages: {self.message_count} | "
                        f"Errors: {self.error_count} | Last message: {elapsed}s ago"
                    )

                if msg is None:
                    continue

                if msg.error():
                    self.handle_error(msg)
                    continue

                success = self.process_message(msg)
                self.message_count += 1
                self.uncommitted_count += 1
                last_message_time = time.time()

                if self.uncommitted_count >= KAFKA_COMMIT_BATCH:
                    self.consumer.commit(asynchronous=False)
                    self.uncommitted_count = 0

        except KeyboardInterrupt:
            logger.info("Shutdown requested by user")
        except Exception:
            logger.exception("Fatal consumer error")
        finally:
            self.stop()

    def stop(self):
        logger.info("Stopping consumer gracefully...")

        self.running = False

        if self.consumer and self.uncommitted_count > 0:
            self.consumer.commit(asynchronous=False)

        if self.consumer:
            logger.info("Closing Kafka consumer")
            self.consumer.close()

        if self.mongo_client:
            logger.info("Closing MongoDB connection")
            self.mongo_client.close()

        logger.info(f"Consumer stopped | Messages: {self.message_count} | Errors: {self.error_count}")

# -------------------------------------------------------------------
# Signal Handling
# -------------------------------------------------------------------
consumer_service = None
def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}")
    if consumer_service:
        consumer_service.stop()
    sys.exit(0)

# -------------------------------------------------------------------
# Main
# -------------------------------------------------------------------
def main():
    global consumer_service
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    config = {
        "bootstrap_servers":  f"{settings.KAFKA_HOST}:{settings.KAFKA_PORT}",
        "group_id": "telephony-consumer-group",
        "topics": ["longrunning-topic"],

        "mysql": {
            "host": settings.MYSQL_HOST,
            "user": settings.MYSQL_USERNAME,
            "password": settings.MYSQL_PASSWORD,
            "database": "onedb",
            "pool_size": 2
        },

        "mongodb": {
            "uri": settings.MONFO_URI,
            "database": "onedbpredectiveleads",
            "max_pool_size": 2
        }
    }

    consumer_service = KafkaConsumerService(config)
    consumer_service.start()

if __name__ == "__main__":
    main()
