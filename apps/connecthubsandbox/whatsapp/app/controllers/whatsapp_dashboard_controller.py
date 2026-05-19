from fastapi import APIRouter, Header, Depends, Query, Request
from services import whatsapp_dashboard_service
from services.whatsapp_template_service import decode
from typing import Optional
from config import settings
from fastapi.responses import JSONResponse
from models.dto import FetchDashboardStatsRequest

router = APIRouter(
    prefix="/whatsapp",
    tags=["Whatsapp Dashboard"]
)

@router.post("/dashboard/stats")
async def get_dashboard_stats(
    request: Request,
    request_body: FetchDashboardStatsRequest
):
    token_str = request.cookies.get(settings.AUTH_TOKEN_NAME)
    token = decode(token_str)
    
    if isinstance(token, JSONResponse):
        return token
    
    if not token:
         return JSONResponse(status_code=401, content={"error": "Invalid or missing token"})
        
    accountId = token.m_accountId
    accountNo = token.m_accountNo
    
    return await whatsapp_dashboard_service.fetch_dashboard_stats(
        accountId,
        accountNo,
        request_body.startDate,
        request_body.endDate,
        request_body.campaignId,
        request_body.templateId
    )
