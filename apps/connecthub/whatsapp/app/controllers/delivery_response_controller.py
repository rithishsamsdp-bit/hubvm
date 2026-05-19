from fastapi import APIRouter, Header, Depends, Query, Request
from services import delivery_response_service
from services.whatsapp_template_service import decode
from typing import Optional
from config import settings

router = APIRouter(
    prefix="/whatsapp",
    tags=["Delivery Response Report"]
)

from models.dto import FetchDeliveryReportRequest

from fastapi.responses import JSONResponse

@router.post("/dlr_report")
async def get_delivery_response_report(
    request: Request,
    request_body: FetchDeliveryReportRequest
):
    token_str = request.cookies.get(settings.AUTH_TOKEN_NAME)
    token = decode(token_str)
    if isinstance(token, JSONResponse): # Handle JSONResponse for error
        return token
    
    # Check if token is None or invalid type if decode returns something unexpected
    if not token:
         return JSONResponse(status_code=401, content={"error": "Invalid or missing token"})
        
    accountId = token.m_accountId
    accountNo = token.m_accountNo
    
    return await delivery_response_service.fetch_delivery_response_report(
        request_body.limit,
        request_body.offset,
        request_body.search,
        request_body.fromDate,
        request_body.toDate,
        request_body.sortField,
        request_body.sortOrder,
        request_body.status,
        request_body.direction,
        accountId,
        accountNo
    )
