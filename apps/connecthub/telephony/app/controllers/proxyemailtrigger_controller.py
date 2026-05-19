from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from config import settings
from models.dto import ProxyEmailTriggerRequest
from services import proxyEmailTrigger_service


router = APIRouter(
    prefix="/telephony/proxymailtrigger",
    tags=["ProxyEmailTrigger"]
)

 
@router.post("/alert", status_code=status.HTTP_200_OK, response_model=dict)
async def alert(request: ProxyEmailTriggerRequest, response: Response):

    try:
        queuegroupid = await proxyEmailTrigger_service.alert(
            request.proxyname,
            request.sourceip,
            request.domain  
        )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Alert sent successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})