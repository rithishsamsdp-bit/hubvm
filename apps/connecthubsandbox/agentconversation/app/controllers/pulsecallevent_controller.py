from fastapi import APIRouter, Request, Response, status, HTTPException, Depends
from fastapi.responses import JSONResponse
from models.dto import OutboundInitRequest, OutboundAnswerRequest, OutboundTerminationRequest, InboundInitRequest, InboundAnswerRequest, InboundTerminationRequest, InboundAgentAffinityRequest, EmailToVoicemailRequest, OutboundConferenceMergeRequest, NotificationMissedListRequest, NotificationMissedUpdateRequest, PredictiveoriginateRequest, PredictiveInboundInitRequest, PredictiveInboundAnswerRequest, PredictiveInboundTerminationRequest
from models.dto import OutboundInitResponse, OutboundAnswerResponse, OutboundTerminationResponse, InboundInitResponse, InboundAnswerResponse, InboundTerminationResponse, InboundAgentAffinityResponse, EmailToVoicemailResponse, OutboundConferenceMergeResponse, NotificationMissedListResponse, NotificationMissedListUpdateResponse, PredictiveoriginateResponse, PredictiveInboundInitResponse, PredictiveInboundAnswerResponse, PredictiveInboundTerminationResponse
from services import pulsecallevent_service
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/agent/callevent",
    tags=["CallEvent"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/outbound/init", status_code=status.HTTP_200_OK, response_model=OutboundInitResponse)
async def outboundInit(request: OutboundInitRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = pulsecallevent_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await pulsecallevent_service.outboundInit(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Outbound Init Logged Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/outbound/init/app", status_code=status.HTTP_200_OK, response_model=OutboundInitResponse)
async def outboundInit(request: OutboundInitRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = pulsecallevent_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await pulsecallevent_service.outboundInit(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Outbound Init Logged Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
    
@router.post("/outbound/answer", status_code=status.HTTP_200_OK, response_model=OutboundAnswerResponse)
async def outboundAnswer(request: OutboundAnswerRequest, response: Response):

    try:
        await pulsecallevent_service.outboundAnswer(request, 'onedb')
        return {
            "message": f"Outbound Answer Logged Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/outbound/termination", status_code=status.HTTP_200_OK, response_model=OutboundTerminationResponse)
async def outboundTermination(request: OutboundTerminationRequest, response: Response):
    try:
        await pulsecallevent_service.outboundTermination(request, 'onedb')
        return {
            "message": f"Outbound Termination Logged Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/outbound/termination/sarvam", status_code=status.HTTP_200_OK, response_model=OutboundTerminationResponse)
async def outboundTermination(request: OutboundTerminationRequest, response: Response):
    try:
        await pulsecallevent_service.outboundTerminationSarvam(request, 'onedb')
        return {
            "message": f"Outbound Termination Logged Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/inbound/init", status_code=status.HTTP_200_OK, response_model=InboundInitResponse)
async def inboundInit(request: InboundInitRequest, response: Response):
    try:
        result = await pulsecallevent_service.inboundInit(request, 'onedb')
        return {
            "message": f"Inbound Init Logged Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/inbound/answer", status_code=status.HTTP_200_OK, response_model=InboundAnswerResponse)
async def inboundAnswer(request: InboundAnswerRequest, response: Response):
    try:
        result =  await pulsecallevent_service.inboundAnswer(request, 'onedb')
        return {
            "message": f"Inbound Answer Logged Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/inbound/termination", status_code=status.HTTP_200_OK, response_model=InboundTerminationResponse)
async def inboundTermination(request: InboundTerminationRequest, response: Response):
    try:
        await pulsecallevent_service.inboundTermination(request, 'onedb')
        return {
            "message": f"Inbound Termination Logged Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/inbound/agentaffinity", status_code=status.HTTP_200_OK, response_model=InboundAgentAffinityResponse)
async def inboundAgentAffinity(request: InboundAgentAffinityRequest, response: Response):
    try:
        result = await pulsecallevent_service.inboundAgentAffinity(request, 'onedb')
        return {
            "message": f"Inbound Agent Affinity Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/email-voicemail", status_code=status.HTTP_200_OK, response_model=EmailToVoicemailResponse)
async def Voicemailtoemail(request: EmailToVoicemailRequest, response: Response):
    try:
        await pulsecallevent_service.Voicemailtoemail(request, 'onedb')
        return {
        "message": f"Email Sent Successfull"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/outbound/conference/merge", status_code=status.HTTP_200_OK, response_model=OutboundConferenceMergeResponse)
async def OutboundConferenceMerge(request: OutboundConferenceMergeRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = pulsecallevent_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await pulsecallevent_service.OutboundConferenceMerge(request, data.m_memberExtensionNo, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Conference Merged Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/notification/missed/list", status_code=status.HTTP_200_OK, response_model=NotificationMissedListResponse)
async def listNotifications(request: NotificationMissedListRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = pulsecallevent_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await pulsecallevent_service.listNotifications(
            request,
            data.m_accountId,
            data.m_accountNo,
            'onedb'
        )
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)})

@router.post("/notification/missed/update", status_code=status.HTTP_200_OK, response_model=NotificationMissedListUpdateResponse)
async def listNotificationsupdate(request: NotificationMissedUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = pulsecallevent_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await pulsecallevent_service.listNotificationsUpdate(request,data.m_accountId,data.m_accountNo,'onedb')
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)})
   
# Predictive API Start
@router.post("/predictive/originate", status_code=status.HTTP_200_OK, response_model=PredictiveoriginateResponse)
async def Predictiveoriginate(request: PredictiveoriginateRequest, response: Response):
    try:
        await pulsecallevent_service.Predictiveoriginate(request, 'onedb')
        return {
            "message": f"Predictive Termination Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/predictive/inbound/init", status_code=status.HTTP_200_OK, response_model=PredictiveInboundInitResponse)
async def PredictiveinboundInit(request: PredictiveInboundInitRequest, response: Response):
    try:
        result = await pulsecallevent_service.PredictiveinboundInit(request, 'onedb')
        return {
            "message": f"Predictive Inbound Init Logged Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/predictive/inbound/answer", status_code=status.HTTP_200_OK, response_model=PredictiveInboundAnswerResponse)
async def PredictiveinboundAnswer(request: PredictiveInboundAnswerRequest, response: Response):
    try:
        result =  await pulsecallevent_service.PredictiveinboundAnswer(request, 'onedb')
        return {
            "message": f"Predictive Inbound Answer Logged Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/predictive/inbound/termination", status_code=status.HTTP_200_OK, response_model=PredictiveInboundTerminationResponse)
async def PredictiveinboundTermination(request: PredictiveInboundTerminationRequest, response: Response):
    try:
        await pulsecallevent_service.PredictiveinboundTermination(request, 'onedb')
        return {
            "message": f"Predictive Inbound Termination Logged Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
# Predictive API End