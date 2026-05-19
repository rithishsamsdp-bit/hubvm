from fastapi import APIRouter, Request, Depends,UploadFile, File, Form
from fastapi import Query
from fastapi import Path
from fastapi import status
from fastapi import Response
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from services import lead_service

router = APIRouter(
    prefix="/telephony/lead",
    tags=["lead"]
)

@router.post("/upload", status_code=status.HTTP_201_CREATED, response_model=dict)
async def upload(campaign_id: int = Form(...), file: UploadFile = File(...), tokenRequest: Request = None):
    token = tokenRequest.cookies.get("accessToken")
    data = lead_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        # print(data)
        response = await lead_service.upload(campaign_id,file,data.m_accountId,data.m_accountNo,"onedb")
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})