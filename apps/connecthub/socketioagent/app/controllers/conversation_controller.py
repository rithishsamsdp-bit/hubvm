import sys
from typing import Union, List
from fastapi import APIRouter,  Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
import logging
from models import dto
from models.dto import conversationfetch, Leaddetails,conversationFetchRequest
from services import conversation_service

router = APIRouter(
    prefix="/agent/conversation",
    tags=["conversation"]
)

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

@router.post("/fetchLeadDetails", status_code=status.HTTP_200_OK, response_model=dict | Leaddetails)
async def fetchLeadDetails(request: conversationfetch, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response =  await conversation_service.getdetails(data.accountEncryption, data.m_accountId, data.m_accountNo, request.c_phonenumber)
        if response is None:
            return {"status": "Not Found"}
        return response
    except HTTPException as e:
        return {"status": "error", "detail": str(e.detail)}
    
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.get("/conversationlist", status_code=status.HTTP_200_OK)
async def conversationlist(tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response =  await conversation_service.getconversationlist(data.accountEncryption, data.m_accountId, data.m_accountNo, data.m_memberExtensionNo)
        return response
    except HTTPException as e:
        return {"status": "error", "detail": str(e.detail)}
    
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def conversationFetch(request: conversationFetchRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = conversation_service.decode(token)
    logging.info(f"🔥 Received message: {data}")
    if isinstance(data, JSONResponse):
        return data
    else:
        responce=await conversation_service.conversationFetch(
            request.leadId,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return responce