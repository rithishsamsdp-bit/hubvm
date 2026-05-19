from fastapi import APIRouter, status, Response, HTTPException
from pydantic import BaseModel
from aiokafka import AIOKafkaProducer
from fastapi import APIRouter
from models.dto import LivemonitorRequest,LiveMonitoringSchema,LiveMonitoringMetric, LiveMonitoringMetricMain, MemberStatusCount, livemonitorcallsrequest, livemonitorforcelogutrequest
from producer.kafkaproducer import send_message
from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from services import livemonitor_service
from socketconnect import socketmanager
from typing import List, Optional, Dict
import asyncio
import uvicorn
import logging
import json
import os
import threading
import time

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

    
@router.get("/select", status_code=status.HTTP_200_OK, response_model=List[LiveMonitoringSchema])
async def peerFetch(tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = livemonitor_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await livemonitor_service.fetch(data.m_accountId, data.m_accountNo, data.accountEncryption, data.m_memberRole, data.m_memberId)
        return result
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.get("/metrics", status_code=status.HTTP_200_OK, response_model=List[LiveMonitoringMetric])
async def metrics(tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = livemonitor_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await livemonitor_service.metrics(data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole)
        return result
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.get("/mainmetrics", status_code=status.HTTP_200_OK, response_model=List[LiveMonitoringMetricMain])
async def mainmetrics(tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = livemonitor_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await livemonitor_service.mainmetrics(data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole, data.m_memberId)
        return result
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.get("/agentlivemetrics", status_code=status.HTTP_200_OK, response_model=dict)
async def agentlivemetrics(tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = livemonitor_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await livemonitor_service.agentlivemetrics(data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole)
        return result
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.post("/livecallmonitoring", status_code=status.HTTP_200_OK, response_model=dict)
async def livecallmonitoring(request: livemonitorcallsrequest,tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = livemonitor_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await livemonitor_service.livecallmonitoring(data.m_accountId,data.m_accountNo,data.accountEncryption,data.m_memberRole,request.limit,request.offset ,data.m_memberId)
        return result
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.post("/forcelogout", status_code=status.HTTP_200_OK, response_model=dict)
async def forcelogout(request: livemonitorforcelogutrequest,tokenRequest: Request) -> dict:

    try:
        token = tokenRequest.cookies.get("accessToken")
        data = livemonitor_service.decode(token)
        if isinstance(data, JSONResponse):
            return data
        socketmanager.socket_manager.set_token(token)
        if not socketmanager.socket_manager._connected:
            thread = threading.Thread(target=socketmanager.socket_manager.connect, daemon=True)
            thread.start()
            time.sleep(1)
            
        payload = {
            
            "extention": request.extention,
            "data": {"action": "force_logout",}
        }
        socketmanager.socket_manager.emit("message", payload)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Logged out successfully"}
        )
    
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )
        
