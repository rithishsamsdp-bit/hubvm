from fastapi import APIRouter, Request, Depends,UploadFile, File
from fastapi import Query
from fastapi import Path
from fastapi import status
from fastapi import Response
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from services import tlmapping_service
from typing import Annotated
from utils.RoleChecker import RoleChecker
import pandas as pd
from io import BytesIO
from types import SimpleNamespace
import asyncio
from typing import Annotated, Optional
from config import settings
from sqlalchemy.exc import SQLAlchemyError
from models.dto import TlmappingRequest, tlfetchRequest

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