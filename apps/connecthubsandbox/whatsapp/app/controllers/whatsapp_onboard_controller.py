from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from config import settings
from models.dto import WhatsAppCreateRequest, WhatsAppListRequest
from services import whatsapp_onboard_service

router = APIRouter(
    prefix="/whatsapp",
    tags=["WhatsAppOnboard"]
)

@router.post("/onboard/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create(request: WhatsAppCreateRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        return JSONResponse(status_code=401, content={"error": "Missing authentication token"})
    
    data = whatsapp_onboard_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
        
    try:
        result = await whatsapp_onboard_service.create(request, 'onedb')
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/onboard/list", status_code=status.HTTP_200_OK, response_model=dict)
async def list(request: WhatsAppListRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        return JSONResponse(status_code=401, content={"error": "Missing authentication token"})

    data = whatsapp_onboard_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        result = await whatsapp_onboard_service.fetch(
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
@router.put("/onboard/update", status_code=status.HTTP_200_OK, response_model=dict)
async def update(request: WhatsAppCreateRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        return JSONResponse(status_code=401, content={"error": "Missing authentication token"})
    
    data = whatsapp_onboard_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
        
    try:
        result = await whatsapp_onboard_service.update(request, 'onedb')
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
