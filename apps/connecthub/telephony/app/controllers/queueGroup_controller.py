from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from config import settings
from models.dto import QueueGroupCreateRequest, QueueGroupUpdateRequest, QueueGroupDeleteRequest, QueueGroupFetchRequest
from services import queueGroup_service
import asyncio

router = APIRouter(
    prefix="/telephony/queuegroup",
    tags=["QueueGroup"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create(request: QueueGroupCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = queueGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        queuegroupid = await queueGroup_service.create(
            request.queuegroupname,
            request.queuegroupstrategy,
            request.queuegrouptimeout,
            request.agentwaittime,
            request.memberids,
            request.memberextensions,
            data.p_proxyId,
            data.p_proxyPrivateIPAddress,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        asyncio.create_task(queueGroup_service.createXML(queuegroupid, request.queuegroupstrategy, data.m_accountNo, data.p_proxyId, data.p_proxyDirectoryName, request.queuegrouptimeout, settings.ASYNC_CODEX_NAME))
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Queue Group Created Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def update(request: QueueGroupUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = queueGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await queueGroup_service.update(
            request.queuegroupid,
            request.queuegroupname,
            request.queuegroupstrategy,
            request.queuegrouptimeout,
            request.agentwaittime,
            request.memberids,
            request.memberextensions,
            data.p_proxyId,
            data.p_proxyPrivateIPAddress,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        asyncio.create_task(queueGroup_service.updateXML(request.queuegroupid, request.queuegroupstrategy, data.m_accountNo, data.p_proxyId, data.p_proxyDirectoryName, request.queuegrouptimeout, settings.ASYNC_CODEX_NAME))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Queue Group Updated Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def delete(request: QueueGroupDeleteRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = queueGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await queueGroup_service.delete(
            request.queuegroupid,
            data.m_accountId,
            data.m_accountNo,
            settings.ASYNC_CODEX_NAME
        )
        asyncio.create_task(queueGroup_service.deleteXML(request.queuegroupid, data.m_accountNo, data.p_proxyId, data.p_proxyDirectoryName, settings.ASYNC_CODEX_NAME))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Queue Group Deleted Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def fetch(request: QueueGroupFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = queueGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await queueGroup_service.fetch(
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
                "message": f"Queue Groups Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/list/members", status_code=status.HTTP_200_OK, response_model=dict)
async def listMembers(tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = queueGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await queueGroup_service.listMembers(
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