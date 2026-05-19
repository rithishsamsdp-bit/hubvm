from datetime import datetime
from fastapi import APIRouter, status, Response, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from models import dto
from services import emergency_service
from config import settings
from typing import List, Dict, Any, Optional

router = APIRouter(
    prefix="/telephony/emergency",
    tags=["Emergency Campaigns"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_campaign(request: dto.EmergencyCampaignCreateRequest, tokenRequest: Request, response: Response):
    user_data = emergency_service.decode(tokenRequest)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    request.e_proxyId = user_data.p_proxyId
    request.e_proxyDomainName = user_data.p_proxyDomainName
    request.e_proxyDirectoryName = user_data.p_proxyDirectoryName

    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.create_and_orchestrate(
        request, 
        user_data.m_accountId, 
        user_data.m_accountNo
    )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"message": "Emergency campaign created", "data": result}
    )

@router.post("/launch/{campaign_id}")
async def launch_campaign(campaign_id: int, tokenRequest: Request, response: Response):
    user_data = emergency_service.decode(tokenRequest)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.launch_campaign(campaign_id, user_data.m_accountId, user_data.m_accountNo)
    
    if result.get("status") == "ERROR":
        return JSONResponse(status_code=400, content=result)
        
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=result
    )

@router.post("/stop/{campaign_id}")
async def stop_campaign(campaign_id: int, tokenRequest: Request, response: Response):
    user_data = emergency_service.decode(tokenRequest)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.stop_campaign(campaign_id, user_data.m_accountId, user_data.m_accountNo)
    
    if result.get("status") == "ERROR":
        return JSONResponse(status_code=400, content=result)
        
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=result
    )

from pydantic import BaseModel
class TTSPreviewRequest(BaseModel):
    text: str
    language: str = "en-US"
    voice: str = "Joanna"

from fastapi.responses import StreamingResponse
import boto3
import os
import io

@router.post("/preview_tts")
async def preview_tts(request: TTSPreviewRequest, tokenRequest: Request, response: Response):
    user_data = emergency_service.decode(tokenRequest)
    if isinstance(user_data, JSONResponse):
        return user_data

    try:
        polly_client = boto3.client(
            "polly",
            region_name="ap-south-1",
            aws_access_key_id="AKIAZNKPUTOKP22FGS7M",
            aws_secret_access_key="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"
        )

        polly_response = polly_client.synthesize_speech(
            Text=request.text,
            OutputFormat="mp3",
            VoiceId=request.voice,
            LanguageCode=request.language
        )

        audio_stream = polly_response["AudioStream"].read()
        return StreamingResponse(io.BytesIO(audio_stream), media_type="audio/mpeg")

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Failed to generate TTS preview: {str(e)}"})

from fastapi import UploadFile, File, Form
import asyncio
import botocore

S3_BUCKET = "connecthub3m"
S3_REGION = "ap-south-1"
S3_AUDIO_FOLDER = "EmergencyAudio/"
s3_client = boto3.client("s3", region_name=S3_REGION, aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"), aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"))

@router.post("/upload_audio")
async def upload_audio(file: UploadFile = File(...), campaign_name: str = Form("emergency"), tokenRequest: Request = None):
    token = tokenRequest.cookies.get("accessToken") if tokenRequest else None
    if token:
        user_data = emergency_service.decode(token)
        if isinstance(user_data, JSONResponse):
            return user_data

    try:
        import uuid
        unique_name = f"{uuid.uuid4().hex}_{file.filename}"
        s3_key = f"{S3_AUDIO_FOLDER}{unique_name}"
        
        await asyncio.to_thread(s3_client.upload_fileobj, file.file, S3_BUCKET, s3_key, ExtraArgs={"ContentType": file.content_type or "audio/mpeg"})
        
        s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Audio uploaded successfully", "audioUrl": s3_url, "fileName": file.filename}
        )
    except botocore.exceptions.BotoCoreError as e:
        return JSONResponse(status_code=500, content={"message": f"S3 Upload Error: {str(e)}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Upload failed: {str(e)}"})

@router.get("/list")
async def list_campaigns(tokenRequest: Request, response: Response, limit: int = 10, offset: int = 0):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_all_campaigns(user_data.m_accountId, limit, offset)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Campaigns fetched successfully", "data": jsonable_encoder(result)}
    )

@router.get("/dashboard")
async def get_dashboard_data(tokenRequest: Request, response: Response, campaign_id: Optional[int] = None):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse): return user_data
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_dashboard_data(user_data.m_accountId, campaign_id)
    return JSONResponse(status_code=200, content={"message": "Dashboard data fetched", "data": jsonable_encoder(result)})

@router.get("/dashboard/kpis")
async def get_dashboard_kpis(tokenRequest: Request, response: Response, campaign_id: Optional[int] = None):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse): return user_data
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_dashboard_data_kpis(user_data.m_accountId, campaign_id)
    return JSONResponse(status_code=200, content={"data": jsonable_encoder(result)})

@router.get("/dashboard/recent-missions")
async def get_dashboard_missions(tokenRequest: Request, response: Response, campaign_id: Optional[int] = None):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse): return user_data
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_dashboard_data_missions(user_data.m_accountId, campaign_id)
    return JSONResponse(status_code=200, content={"data": jsonable_encoder(result)})

@router.get("/dashboard/charts")
async def get_dashboard_charts(tokenRequest: Request, response: Response, campaign_id: Optional[int] = None):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse): return user_data
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_dashboard_data_charts(user_data.m_accountId, campaign_id)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"data": jsonable_encoder(result)})

@router.get("/dashboard/responses")
async def get_dashboard_responses(tokenRequest: Request, response: Response, campaign_id: Optional[int] = None):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse): return user_data
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_dashboard_data_responses(user_data.m_accountId, campaign_id)
    return JSONResponse(status_code=200, content={"data": jsonable_encoder(result)})

@router.post("/dashboard/response-members")
async def get_response_members(req: dto.EmergencyResponseMembersRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_response_members(user_data.m_accountId, req)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Response members fetched", "data": jsonable_encoder(result)}
    )

@router.get("/sms-templates")
async def get_sms_templates(tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_sms_templates()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "SMS templates fetched successfully", "data": jsonable_encoder(result)}
    )

@router.get("/{campaign_id}")
async def get_campaign_details(campaign_id: int, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_campaign(campaign_id)
    if not result:
        return JSONResponse(status_code=404, content={"message": "Campaign not found"})
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Campaign details fetched", "data": jsonable_encoder(result)}
    )

# --- Emergency Group Management ---

@router.post("/group/create", status_code=status.HTTP_201_CREATED)
async def create_group(request: dto.EmergencyGroupCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    group_id = await service.create_group(request, user_data.m_accountId, user_data.m_accountNo)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"group_id": group_id, "message": "Group created successfully"}
    )

@router.get("/group/list")
async def list_groups(tokenRequest: Request, response: Response, limit: int = 10, offset: int = 0):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_all_groups(user_data.m_accountId, limit, offset)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Groups fetched successfully", "data": jsonable_encoder(result)}
    )

@router.get("/group/{group_id}/contacts")
async def get_group_contacts(group_id: int, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_contacts(group_id)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Group contacts fetched", "data": jsonable_encoder(result)}
    )

@router.delete("/group/{group_id}")
async def delete_group(group_id: int, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    await service.delete_group(group_id, user_data.m_accountId)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Group deleted successfully"}
    )

@router.put("/group/{group_id}")
async def update_group(group_id: int, request: dto.EmergencyGroupCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    await service.update_group(group_id, request, user_data.m_accountId)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Group updated successfully"}
    )

@router.post("/ivr_cdr")
async def store_ivr_cdr(request: Request):
    """Public endpoint for FreeSWITCH to POST IVR CDR data"""
    try:
        data = await request.json()
        # database is passed in the JSON payload from Lua
        db_name = data.get("database", settings.ASYNC_CODEX_NAME)
        service = emergency_service.EmergencyService(db_name)
        await service.store_ivr_cdr(data)
        return JSONResponse(status_code=200, content={"message": "CDR stored"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Failed to store CDR: {str(e)}"})

@router.post("/report/all")
async def get_all_reports(tokenRequest: Request, response: Response, req: dto.EmergencyAllReportsRequest):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_all_reports(
        user_data.m_accountId, 
        req.limit, 
        req.offset, 
        req.campaign_id, 
        req.channel, 
        req.disposition, 
        req.start_date, 
        req.end_date,
        req.response_label
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "All reports fetched successfully", "data": jsonable_encoder(result)}
    )

@router.get("/report/export")
async def export_all_reports(
    tokenRequest: Request,
    campaign_id: Optional[str] = None,
    channel: Optional[str] = None,
    disposition: Optional[str] = None,
    response_label: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    # Robustly parse campaign_id to int if present and not empty
    c_id = None
    if campaign_id and campaign_id not in ["", "null", "undefined"]:
        try:
            c_id = int(campaign_id)
        except (ValueError, TypeError):
            c_id = None

    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    csv_data = await service.get_all_reports_export(
        user_data.m_accountId,
        c_id,
        channel if channel and channel != "" else None,
        disposition if disposition and disposition != "" else None,
        start_date if start_date and start_date != "" else None,
        end_date if end_date and end_date != "" else None,
        response_label if response_label and response_label != "" else None
    )
    
    filename = f"emergency_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/report/{campaign_id}")
async def get_campaign_report(campaign_id: int, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    user_data = emergency_service.decode(token)
    if isinstance(user_data, JSONResponse):
        return user_data
    
    service = emergency_service.EmergencyService(settings.ASYNC_CODEX_NAME)
    result = await service.get_campaign_report(campaign_id)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Report fetched successfully", "data": jsonable_encoder(result)}
    )


