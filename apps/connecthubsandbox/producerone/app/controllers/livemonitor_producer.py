from fastapi import APIRouter, status, Response, HTTPException
from pydantic import BaseModel
from aiokafka import AIOKafkaProducer
from fastapi import APIRouter
from models.dto import LivemonitorRequest
from producer.kafkaproducer import send_message
import asyncio
import uvicorn
import logging
import json
import os


router = APIRouter(
    prefix="/producerone/livemonitor",
    tags=["livemonitor"]
)


KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "livemonitor-topic")
logger = logging.getLogger("livemonitor")

@router.post("/produce", status_code=status.HTTP_200_OK, response_model=dict)
async def produce_message(request: LivemonitorRequest, response: Response):
    try:
        await send_message(KAFKA_TOPIC, request.key, request.value)
        logger.info(f"📤 Produced livemonitor message: key={request.key}, value={request.value}")
        return {"status": "success", "topic": KAFKA_TOPIC, "key": request.key}
    except Exception as e:
        logger.error(f"❌ Error producing message: {e}")
        raise HTTPException(status_code=500, detail=f"Kafka error: {str(e)}")
