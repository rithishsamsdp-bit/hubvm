from fastapi import APIRouter,  Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import readynotreadyRequest, breakRequest, agentcampRequest
from services import agentstate_service


router = APIRouter(
    prefix="/agent/state",
    tags=["agentstate"]
)


@router.post("/readynotready", status_code=status.HTTP_200_OK)
async def readynotreadystate(request: readynotreadyRequest,tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = agentstate_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    
    responce=await agentstate_service.readynotreadystate(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberId,
            data.m_memberExtensionNo,
            data.m_memberName,
            data.m_memberRole,
            data.p_proxyId,
            data.p_proxyPrivateIPAddress,
            request.r_status,
            request.campId
    )
    return responce


@router.post("/break", status_code=status.HTTP_200_OK)
async def agentbreak(request: breakRequest,tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = agentstate_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    
    responce=await agentstate_service.agentbreak(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberId,
            data.m_memberExtensionNo,
            data.m_memberName,
            data.m_memberRole,
            request.b_Break
    )
    return responce

@router.post("/changecampaign", status_code=status.HTTP_200_OK)
async def changecampaign(request: agentcampRequest,tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = agentstate_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    responce=await agentstate_service.changecampaign(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberId,
            data.m_memberExtensionNo,
            data.m_memberName,
            data.m_memberRole,
            request.campName,
            request.campId,
            data.p_proxyId,
            data.p_proxyPrivateIPAddress
    )
    return responce