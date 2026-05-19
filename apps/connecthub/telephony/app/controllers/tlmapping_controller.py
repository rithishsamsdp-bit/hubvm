from fastapi import APIRouter, Request, Depends,UploadFile, File, Query, Path, status, Response, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.exc import SQLAlchemyError
from services import tlmapping_service
from typing import Annotated
from utils.RoleChecker import RoleChecker
from io import BytesIO
from types import SimpleNamespace
from typing import Annotated, Optional
from config import settings
from models.dto import TlmappingRequest, tlfetchRequest, ProjectCreateRequest, LocationCreateRequest, LocationUpdateRequest, LocationDeleteRequest, LocationFetchRequest
import pandas as pd, asyncio

router = APIRouter(
    prefix="/telephony/tlmapping",
    tags=["tlmapping"]
)

@router.post("/select", status_code=status.HTTP_200_OK, response_model=dict)
async def gettl(request: tlfetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response_data = await tlmapping_service.gettl(request, data.m_accountId, data.m_accountNo, settings.ASYNC_CODEX_NAME)
        return response_data
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

    except SQLAlchemyError:
        return JSONResponse(status_code=500, content={"message": "Database operation failed"})

    except Exception as e:
        return JSONResponse(status_code=500,content={"message": str(e)})

@router.post("/map", status_code=status.HTTP_201_CREATED, response_model=dict)
async def createtlmap(request: TlmappingRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        responsedata = await tlmapping_service.createtlmap(request, data.m_accountId, data.m_accountNo, settings.ASYNC_CODEX_NAME)
        return responsedata
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

    except SQLAlchemyError:
        return JSONResponse(status_code=500, content={"message": "Database operation failed"})

    except Exception as e:
        return JSONResponse(status_code=500,content={"message": str(e)})

@router.get("/list/members", status_code=status.HTTP_200_OK, response_model=dict)
async def listMembers(tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await tlmapping_service.listMembers(
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Members Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/project/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def projectCreate(request: ProjectCreateRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await tlmapping_service.projectCreate(
            request.projectname,
            request.memberids,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Project Created Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/location/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def locationCreate(request: LocationCreateRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await tlmapping_service.locationCreate(
            request.locationname,
            request.memberids,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Location Created Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/location/update", status_code=status.HTTP_200_OK, response_model=dict)
async def locationUpdate(request: LocationUpdateRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await tlmapping_service.locationUpdate(
            request.locationid,
            request.locationname,
            request.memberids,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Location Updated Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/location/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def locationDelete(request: LocationDeleteRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await tlmapping_service.locationDelete(
            request.locationid,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Location Deleted Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/location/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def locationFetch(request: LocationFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = tlmapping_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await tlmapping_service.locationFetch(
            request.limit,
            request.offset,
            request.sortOrder,
            request.sortField,
            request.searchString,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Locations Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})