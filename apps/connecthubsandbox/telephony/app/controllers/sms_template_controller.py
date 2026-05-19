from fastapi import APIRouter, HTTPException, Request, status,UploadFile, File, Form
from fastapi.responses import JSONResponse
from config import settings
from services import sms_template_service
from datetime import datetime
from typing import Any
import traceback
import json
import urllib.parse
import boto3
import botocore

router = APIRouter(
    prefix="/telephony/sms",
    tags=["sms"]
)


    
@router.post("/callbackApi", status_code=status.HTTP_201_CREATED, response_model=Any)
async def callbackApi(request: Request):
    try:
        
        raw_body = await request.body()
        print(f"Raw Body: {raw_body}")

        # Decode to string
        body_str = raw_body.decode("utf-8")

        # Parse JSON
        body = json.loads(body_str)

        # Optional: make deep copy (just like in Lambda)
        formatted_body = json.loads(json.dumps(body))
        print(f"Formatted Body: {formatted_body}")

        # Send to your service/repo
        response = await sms_template_service.callbackApi(formatted_body)
        return response
    
    except Exception as e:
        print("❌ Exception occurred in /send_outbound_messages:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})



@router.post("/send_outbound_sms", status_code=status.HTTP_201_CREATED, response_model=Any)
async def send_outbound_sms(message: str = Form(...),dst: str = Form(...),agent: str = Form(...),tokenRequest: Request = None):    
    try:
        token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
        if not token:
            return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

        data = sms_template_service.decode(token)
        if isinstance(data, JSONResponse):
            return data
        print(data)
        response = await sms_template_service.send_outbound_sms(
            message,dst,agent,"onedb", data.m_accountId, data.m_accountNo
        )

        return response

    except Exception as e:
        print("❌ Exception occurred in /send_outbound_sms:", e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})        
