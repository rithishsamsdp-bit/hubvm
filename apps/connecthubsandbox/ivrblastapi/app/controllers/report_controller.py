import uuid
from typing import Union
from fastapi import APIRouter, Depends, File, Form, UploadFile, Request, Response, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from services import report_service
from models.dto import ReportFetchRequest

router = APIRouter(
    prefix="/ivrBlast/report",
    tags=["Report"]
)

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def reportFetch(request: ReportFetchRequest, tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    print(request.calldatestart)
    print(request.calldateend)
    # MySql Fetching Start #
    result = report_service.fetch(
        request.limit,
        request.offset,
        request.searchString,
        request.campaignid,
        request.calldatestart,
        request.calldateend,
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Call Logs Fetched Successfully",
            "data": result
        }
    )

@router.get("/list/campaign", status_code=status.HTTP_200_OK, response_model=dict)
async def reportListCampaign(tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = report_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = report_service.listCampaign(
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Campaign Fetched Successfully",
            "data": result
        }
    )