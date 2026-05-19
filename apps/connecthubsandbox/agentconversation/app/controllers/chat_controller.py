from fastapi import APIRouter, Request, Response, status, HTTPException, Depends
from fastapi.responses import JSONResponse
from models.dto import ChatHistoryRequest,ChatHistoryRequestName
from models.dto import ChatHistoryResponse
from services import chat_service
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/agent/chat",
    tags=["Chat"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/history", status_code=status.HTTP_200_OK, response_model=ChatHistoryResponse)
async def history(request: ChatHistoryRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = chat_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await chat_service.history(request, data.m_memberplanDetails, data.m_memberName, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Chat History Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    

@router.post("/history/app", status_code=status.HTTP_200_OK, response_model=ChatHistoryResponse)
async def historyName(request: ChatHistoryRequestName, token: str = Depends(oauth2_scheme)):
    data = chat_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await chat_service.historyName(request, data.m_memberplanDetails, data.m_memberName, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Chat History Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})