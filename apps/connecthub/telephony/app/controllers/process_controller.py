
from fastapi import Query
from fastapi import Path
from fastapi import  APIRouter, Request, Response, status
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from models import dto
from models.dto import ProcessCreateRequest,ProcessUpdateRequest
from services import process_service
import logging
import sys

router = APIRouter(
    prefix="/telephony/phonenumbergroup",
    tags=["PhoneNumberGroup"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def processCreate(request: dto.ProcessCreateRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = process_service.decode(token)
    logging.info(f"🔥 Received message: {data}")
    if isinstance(data, JSONResponse):
        return data
    else:
        responce=process_service.createProcess(
            request.didGroupName,
            request.cliID,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return responce



@router.post("/update", status_code=status.HTTP_201_CREATED, response_model=dict)
async def processUpdate(request: dto.ProcessUpdateRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = process_service.decode(token)
    logging.info(f"🔥 Received message: {data}")
    if isinstance(data, JSONResponse):
        return data
    else:
        responce=process_service.updateProcess(
            request.didnumberGroupId,        
            request.didGroupName,
            request.cliID,
            request.activeStatus,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
            
        )
    return responce


@router.post("/delete", status_code=status.HTTP_201_CREATED, response_model=dict)
async def processDelete(request: dto.ProcessDeleteRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = process_service.decode(token)
    logging.info(f"🔥 Received message: {data}")
    if isinstance(data, JSONResponse):
        return data
    else:
        responce=process_service.deleteProcess(
            request.didnumberGroupId,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return responce
    
    
@router.post("/fetchCliID", status_code=status.HTTP_201_CREATED, response_model=dict)
async def processCliFetch(response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = process_service.decode(token)
    logging.info(f"🔥 Received message: {data}")
    if isinstance(data, JSONResponse):
        return data
    else:
        responce=process_service.CliFetchProcess(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return responce    
    
    
@router.post("/fetch", status_code=status.HTTP_201_CREATED, response_model=dict)
async def fetchpocessdatas(response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = process_service.decode(token)
    logging.info(f"🔥 Received message: {data}")
    if isinstance(data, JSONResponse):
        return data
    else:
        responce=process_service.fetchProcessData(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption,
            tokenRequest
        )
        return responce      