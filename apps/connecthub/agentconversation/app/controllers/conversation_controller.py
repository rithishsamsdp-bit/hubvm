from fastapi import APIRouter, Request, Response, status, HTTPException, Depends
from fastapi.responses import JSONResponse
from config import settings
from models.dto import (
    ConversationEndRequest, 
    ConversationListRequest, 
    ConversationFollowupFetchRequest, 
    CallBackReminderCreateRequest, 
    CallFollowUpGetRequest,
    CallBackReminderFetchRequest,
    ContactGetRequest,
    PredictiveConversationFetchRequest,
    ConversationEndResponse, 
    ConversationListResponse, 
    ConversationFollowupFetchResponse, 
    CallBackReminderCreateResponse, 
    CallFollowUpGetResponse,
    CallBackReminderFetchResponse,
    ContactGetResponse,
    PredictiveConversationFetchResponse
)
from services import conversation_service
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/agent",
    tags=[""]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/conversation/end", status_code=status.HTTP_200_OK, response_model=ConversationEndResponse)
async def end(request: ConversationEndRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await conversation_service.end(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Conversation Ended Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/conversation/list", status_code=status.HTTP_200_OK, response_model=ConversationListResponse)
async def list(request: ConversationListRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await conversation_service.list(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Conversation Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/conversation/list/app", status_code=status.HTTP_200_OK, response_model=ConversationListResponse)
async def list(request: ConversationListRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await conversation_service.list(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Conversation Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/followup/fetch", status_code=status.HTTP_200_OK, response_model=ConversationFollowupFetchResponse)
async def followupFetch(request: ConversationFollowupFetchRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await conversation_service.followupFetch(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Conversation Followup Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/get/callfollowup", status_code=status.HTTP_200_OK, response_model=CallFollowUpGetResponse)
async def getCallFollowUp(request: CallFollowUpGetRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await conversation_service.getCallFollowUp(
            request,
            data.m_accountId,
            data.m_accountNo,
            'onedb'
        )
        return {
            "message": f"Call Followup Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)},)

@router.post("/callback/create", status_code=status.HTTP_201_CREATED, response_model=CallBackReminderCreateResponse)
async def createCallback(request: CallBackReminderCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await conversation_service.createCallback(request, data.m_memberId, data.m_memberExtensionNo, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"CallBack Created Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/callbackreminder/fetch", status_code=status.HTTP_200_OK, response_model=CallBackReminderFetchResponse)
async def fetchCallbackReminder(request: CallBackReminderFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await conversation_service.fetchCallbackReminder(
            request,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberRole,
            data.m_memberExtensionNo,
            'onedb'
        )
        return {
            "message": "Callback Reminders Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": "Internal Server Error: " + str(e)})

@router.post("/get/contact", status_code=status.HTTP_200_OK, response_model=ContactGetResponse)
async def getContact(request: ContactGetRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await conversation_service.getContact(
            request,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberExtensionNo,
            'onedb'
        )
        return {
            "message": f"Contact Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)})

@router.post("/followup/predictive/fetch", status_code=status.HTTP_200_OK, response_model=PredictiveConversationFetchResponse)
async def followupFetch(request: PredictiveConversationFetchRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await conversation_service.followuppredictiveFetch(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Conversation Followup Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})