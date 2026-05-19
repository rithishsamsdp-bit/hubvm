from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from services import campaign_service
from models.dto import CampaignCreateRequest, CampaignUpdateRequest, CampaignDeleteRequest, campaignFetchRequest, CampaignGetDeleteRequest, campaignstartRequest, CampaignLeadsRequest

router = APIRouter(
    prefix="/telephony/campaign",
    tags=["Campaign"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def campaignCreate(request: CampaignCreateRequest, tokenRequest: Request, response: Response):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data

    await campaign_service.create(
        request.campaignname,
        request.membergroupids,
        request.cligroupId,
        request.formid,
        request.dialerType,
        request.campaignRules,
        data.m_accountId,
        data.m_accountNo,
        data.accountEncryption,
        data.p_proxyId,
        data.p_proxyDirectoryName
    )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"message": "Campaign Created Successfully"}
    )

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignUpdate(request: CampaignUpdateRequest, tokenRequest: Request, response: Response):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data

    await campaign_service.update(
        request.campaignid,
        request.campaignname,
        request.membergroupids,
        request.cligroupId,
        request.formid,
        request.campaignRules,
        data.m_accountId,
        data.m_accountNo,
        data.accountEncryption
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Campaign Updated Successfully"}
    )

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignDelete(request: CampaignDeleteRequest, tokenRequest: Request, response: Response):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    
    await campaign_service.delete(
        request.campaignid,
        data.m_accountId,
        data.m_accountNo,
        data.accountEncryption,
        data.p_proxyId,
        data.p_proxyDirectoryName
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Campaign Deleted Successfully"}
    )
    
@router.post("/select", status_code=status.HTTP_200_OK, response_model=dict)
async def peerFetch(request: campaignFetchRequest, tokenRequest: Request) -> dict:
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await campaign_service.fetch(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberRole,
            request.sortOrder,
            request.sortField,
            request.searchString,
            request.offset,
            request.limit,
        )
        return result
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

async def listGroups(tokenRequest: Request):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await campaign_service.listMemberGroups(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Groups Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.get("/list/form", status_code=status.HTTP_200_OK, response_model=dict)
async def listGroups(tokenRequest: Request):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await campaign_service.form(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Form Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    

@router.get("/list/agentcampaign", status_code=status.HTTP_200_OK, response_model=dict)
async def agentCampaign(tokenRequest: Request):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    try:
        print(data)
        result = await campaign_service.agentcampaign(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            data.m_memberId
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"AgentCampaign Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/getedit", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignGetEdit(request: CampaignGetDeleteRequest, tokenRequest: Request, response: Response):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    
    data = await campaign_service.campaignGetEdit(
        request.campaignid,
        data.m_accountId,
        data.m_accountNo,
        data.accountEncryption
    )

    return data

@router.post("/predective/campaignstart", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignstart(request: campaignstartRequest, tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await campaign_service.campaignstart(
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            request.campid,
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Campaign Started Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.post("/predective/campaignstop", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignstop(request: campaignstartRequest, tokenRequest: Request) -> dict:
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await campaign_service.campaignstop(
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            request.campid,
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Campaign Stopped Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.get("/list/membergroups", status_code=status.HTTP_200_OK, response_model=dict)
async def listGroups(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await campaign_service.listMemberGroups(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Groups Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
@router.post("/predective/campaignleads", status_code=status.HTTP_200_OK, response_model=dict)
async def campaignleads(request: CampaignLeadsRequest, tokenRequest: Request) -> dict:
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await campaign_service.getleads(data.m_accountId, request.campaignid, request.limit, request.offset, request.searchString, request.status, request.lastResult)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Leads Fetched Successfully",
                "data": result
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )

@router.get("/predective/dashboard", status_code=status.HTTP_200_OK, response_model=dict)
async def dashboard(tokenRequest: Request, campaign_id: int = None):
    data = campaign_service.decode(tokenRequest)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await campaign_service.getDashboardHeader(data.m_accountId, campaign_id)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Dashboard Header Fetched Successfully",
                "data": result
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )
