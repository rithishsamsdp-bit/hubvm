#!/usr/bin/env python3
"""
Production-grade FreeSWITCH ESL Event Listener
Using Official ESL Library with threading and queue management  
"""

import os
import sys
import time
import signal
import json
import logging
from queue import Queue
from threading import Thread, Event
from datetime import datetime
from kafka import KafkaProducer
from config import settings

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka-service:9092")
KAFKA_TOPIC_CONF = os.getenv("KAFKA_TOPIC", "eslconferenceEvent")
KAFKA_TOPIC_QUEUE = os.getenv("KAFKA_TOPIC", "esqueueevents")
KAFKA_TOPIC_livemonitoring = os.getenv("KAFKA_TOPIC", "livemonitoring")
SERVICE_NAME = os.getenv("SERVICE_NAME", "esl-listener-1")

producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    retries=5
)

try:
    sys.path.append(os.path.dirname(__file__))

    import ESL
    logger = logging.getLogger('ESL')
    logger.info("ESL module imported successfully")
except ImportError as e:
    print(f"ERROR: ESL module not found: {e}")
    print("Make sure ESL.py and _ESL.so are in the same directory")
    sys.exit(1)

# Configuration
FREESWITCH_HOST = settings.FREESWITCH_HOST
FREESWITCH_PORT = settings.FREESWITCH_PORT
FREESWITCH_PASSWORD = settings.FREESWITCH_PASSWORD
RECONNECT_DELAY = int(os.getenv('RECONNECT_DELAY', 5))
EVENT_QUEUE_SIZE = int(os.getenv('EVENT_QUEUE_SIZE', 10000))
WORKER_THREADS = int(os.getenv('WORKER_THREADS', 4))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class ESLEventListener:
    """Production-grade ESL Event Listener with connection management"""
    
    def __init__(self, host, port, password):
        self.host = host
        self.port = str(port)
        self.password = password
        self.connection = None
        self.event_queue = Queue(maxsize=EVENT_QUEUE_SIZE)
        self.shutdown_event = Event()
        self.workers = []
        self.stats = {
            'events_received': 0,
            'events_processed': 0,
            'errors': 0,
            'reconnects': 0,
            'start_time': time.time()
        }
        
    def connect(self):
        """Establish connection to FreeSWITCH"""
        try:
            logger.info(f"Connecting to FreeSWITCH at {self.host}:{self.port}")
            self.connection = ESL.ESLconnection(self.host, self.port, self.password)
            
            if self.connection.connected():
                logger.info("✓ Connected to FreeSWITCH successfully!")
                return True
            else:
                logger.error("Failed to connect to FreeSWITCH")
                return False
                
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
    
    def subscribe_events(self):
        """Subscribe to FreeSWITCH events"""
        try:
            # Subscribe to all events (or specific ones for production)
            # For production, consider subscribing to specific events:
            # CHANNEL_CREATE CHANNEL_ANSWER CHANNEL_HANGUP CHANNEL_BRIDGE etc.
            self.connection.events("plain", "CHANNEL_CREATE CHANNEL_ANSWER CHANNEL_HANGUP_COMPLETE CHANNEL_BRIDGE CHANNEL_HANGUP CHANNEL_CALLSTATE CHANNEL_STATE CUSTOM sofia::register sofia::unregister sofia::expire  callcenter::info conference::maintenance"
            )
            logger.info("✓ Subscribed to events")
            return True
        except Exception as e:
            logger.error(f"Failed to subscribe to events: {e}")
            return False
    
    def event_receiver(self):
        """Receive events from FreeSWITCH and queue them"""
        logger.info("Event receiver thread started")
        
        while not self.shutdown_event.is_set():
            if not self.connection or not self.connection.connected():
                logger.warning("Connection lost, attempting to reconnect...")
                self.stats['reconnects'] += 1
                
                if self.connect() and self.subscribe_events():
                    logger.info("Reconnected successfully")
                else:
                    logger.error(f"Reconnection failed, retrying in {RECONNECT_DELAY}s")
                    time.sleep(RECONNECT_DELAY)
                    continue
            
            try:
                # Receive event with timeout
                event = self.connection.recvEvent()
                
                if event:
                    self.stats['events_received'] += 1
                    
                    # Add to queue for processing
                    try:
                        self.event_queue.put(event, block=False)
                    except:
                        logger.warning("Event queue full, dropping event")
                        self.stats['errors'] += 1
                        
            except Exception as e:
                logger.error(f"Error receiving event: {e}")
                self.stats['errors'] += 1
                time.sleep(0.1)
        
        logger.info("Event receiver thread stopped")
    
    def event_processor(self, worker_id):
        """Process events from the queue"""
        logger.info(f"Worker {worker_id} started")
        
        while not self.shutdown_event.is_set():
            try:
                # Get event from queue with timeout
                event = self.event_queue.get(timeout=1)
                
                # Process the event
                self.handle_event(event)
                self.stats['events_processed'] += 1
                
                self.event_queue.task_done()
                
            except:
                # Queue timeout, continue
                continue
        
        logger.info(f"Worker {worker_id} stopped")
    
    def handle_event(self, event):
        event_subclass = event.getHeader("Event-Subclass") or ""
        event_name = event.getHeader("Event-Name") or ""

        raw_headers = event.serialize("json")
        logger.info(raw_headers)
        
        if event_subclass.startswith('conference::'):
            self._send_to_kafka(raw_headers, KAFKA_TOPIC_CONF)

        elif event_subclass.startswith('callcenter::'):
            self._send_to_kafka(raw_headers, KAFKA_TOPIC_QUEUE)
            self._send_to_kafka(raw_headers, KAFKA_TOPIC_livemonitoring)

        elif event_subclass.startswith('sofia::'):
            self._send_to_kafka(raw_headers, KAFKA_TOPIC_livemonitoring)

        elif event_name == 'CHANNEL_CALLSTATE':
            self._send_to_kafka(raw_headers, KAFKA_TOPIC_livemonitoring)

        elif event_name == 'CHANNEL_ANSWER':
            self._send_to_kafka(raw_headers, KAFKA_TOPIC_livemonitoring)
            
        elif event_name == 'CHANNEL_HANGUP_COMPLETE':
            self._send_to_kafka(raw_headers, KAFKA_TOPIC_livemonitoring)
            
    def _send_to_kafka(self, data, topic):
        """Helper method to send data to Kafka"""
        try:
            logger.info(f"Sending event to Kafka topic '{topic}'")
            a = producer.send(topic, data)
            logger.info(f"Event sent to Kafka topic '{topic}': {a}")
            producer.flush()
        except Exception as e:
            logger.error(f"Failed to send to Kafka: {e}")
        
    
    def stats_reporter(self):
        """Periodically report statistics"""
        logger.info("Stats reporter started")
        
        while not self.shutdown_event.is_set():
            time.sleep(30)  # Report every 30 seconds
            
            uptime = time.time() - self.stats['start_time']
            queue_size = self.event_queue.qsize()
            
            logger.info(
                f"STATS - Uptime: {uptime:.0f}s | "
                f"Received: {self.stats['events_received']} | "
                f"Processed: {self.stats['events_processed']} | "
                f"Queue: {queue_size} | "
                f"Errors: {self.stats['errors']} | "
                f"Reconnects: {self.stats['reconnects']}"
            )
    
    def start(self):
        """Start the event listener with worker threads"""
        logger.info("Starting ESL Event Listener")
        
        # Connect to FreeSWITCH
        if not self.connect():
            logger.error("Failed to establish initial connection")
            return False
        
        if not self.subscribe_events():
            logger.error("Failed to subscribe to events")
            return False
        
        # Start event receiver thread
        receiver_thread = Thread(target=self.event_receiver, daemon=True)
        receiver_thread.start()
        
        # Start worker threads for event processing
        for i in range(WORKER_THREADS):
            worker = Thread(target=self.event_processor, args=(i,), daemon=True)
            worker.start()
            self.workers.append(worker)
        
        # Start stats reporter
        stats_thread = Thread(target=self.stats_reporter, daemon=True)
        stats_thread.start()
        
        logger.info(f"✓ Started with {WORKER_THREADS} worker threads")
        return True
    
    def stop(self):
        """Gracefully stop the event listener"""
        logger.info("Stopping ESL Event Listener...")
        self.shutdown_event.set()
        
        # Wait for queue to empty
        if not self.event_queue.empty():
            logger.info("Waiting for event queue to empty...")
            self.event_queue.join()
        
        # Disconnect
        if self.connection:
            try:
                self.connection.disconnect()
            except:
                pass
        
        logger.info("ESL Event Listener stopped")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    if listener:
        listener.stop()
    sys.exit(0)

# Global listener instance
listener = None

def main():
    """Main entry point"""
    global listener
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("="*60)
    logger.info("FreeSWITCH ESL Event Listener - Production Edition")
    logger.info("="*60)
    logger.info(f"Host: {FREESWITCH_HOST}:{FREESWITCH_PORT}")
    logger.info(f"Workers: {WORKER_THREADS}")
    logger.info(f"passwork: {FREESWITCH_PASSWORD}")
    logger.info(f"Queue Size: {EVENT_QUEUE_SIZE}")
    logger.info("="*60)
    
    # Create and start listener
    listener = ESLEventListener(FREESWITCH_HOST, FREESWITCH_PORT, FREESWITCH_PASSWORD)
    
    if not listener.start():
        logger.error("Failed to start event listener")
        sys.exit(1)
    
    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        if listener:
            listener.stop()

if __name__ == "__main__":
    main()
