"""
Main entry point for EmergencyIVR pod.
Runs both:
  1. Kafka consumer (emergency-ivr-calls) — existing IVR call origination
  2. FastAPI server — new external APIs for customer frontend (IVR, WhatsApp, SMS)
"""

import threading
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from controllers import emergency_ext_controller

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("emergency-ivr-main")

# Silence noisy external libraries
logging.getLogger("pymongo").setLevel(logging.INFO)
logging.getLogger("httpcore").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.INFO)
logging.getLogger("botocore").setLevel(logging.INFO)
logging.getLogger("boto3").setLevel(logging.INFO)
# =====================================================
# Startup — launch Kafka consumer in background thread
# =====================================================

def start_kafka_consumer():
    """Run the existing Kafka consumer in a background thread."""
    from emergency_consumer import consume
    logger.info("🚀 Starting Kafka consumer thread...")
    consume()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Kafka consumer
    consumer_thread = threading.Thread(target=start_kafka_consumer, daemon=True)
    consumer_thread.start()
    logger.info("🚀 EmergencyIVR Pod — API server + Kafka consumer started")
    

    yield
    # Shutdown logic can go here if needed

# =====================================================
# FastAPI App
# =====================================================

app = FastAPI(
    title="EmergencyIVR Service",
    description="Emergency IVR Pod — Kafka consumer + External APIs",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(emergency_ext_controller.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "EmergencyIVR"}


# =====================================================
# Direct run
# =====================================================

if __name__ == "__main__":
    import uvicorn
    logger.info(f"🚀 Starting EmergencyIVR on port {settings.API_PORT}...")
    uvicorn.run("main:app", host="0.0.0.0", port=settings.API_PORT, log_level="info")


