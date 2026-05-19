from fastapi import APIRouter, Request, Response, status, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from config import settings
from models.dto import (
    NotificationCreateRequest,
    NotificationCreateResponse,
    NotificationTriggerRequest,
    NotificationTriggerResponse,
    NotificationListRequest,
    NotificationListResponse,
    NotificationStatusUpdateRequest,
    NotificationStatusUpdateResponse
)
from services import notification_service

router = APIRouter(
    prefix="/agent/notification",
    tags=["Notification"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

@router.post("/trigger", status_code=status.HTTP_200_OK, response_model=NotificationTriggerResponse)
async def createNotification(request: NotificationTriggerRequest, tokenRequest: Request, response: Response, bearer_token: str = Depends(oauth2_scheme)):
    token = bearer_token
    if not token:
        token = tokenRequest.cookies.get("accessToken")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token missing")
    data = notification_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await notification_service.triggerNotification(
            request,
            data.m_accountId,
            data.m_accountNo,
            "onedb"
        )
        return {"message": "Notification Triggered Successfully"}
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": "Internal Server Error: " + str(e)})

# @router.post("/create", status_code=status.HTTP_200_OK, response_model=NotificationCreateResponse)
# async def createNotification(request: NotificationCreateRequest, tokenRequest: Request, response: Response):
#     token = tokenRequest.cookies.get("accessToken")
#     data = notification_service.decode(token)
#     if isinstance(data, JSONResponse):
#         return data
#     try:
#         await notification_service.createNotification(
#             request,
#             data.m_accountId,
#             data.m_accountNo,
#             'onedb'
#         )
#         return {
#             "message": f"Notification Created Successfully"
#         }
#     except HTTPException as e:
#         return JSONResponse(status_code=e.status_code, content={"message": e.detail})
#     except Exception as e:
#         return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)})

@router.post("/list", status_code=status.HTTP_200_OK, response_model=NotificationListResponse)
async def listNotification(request: NotificationListRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = notification_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await notification_service.listNotification(
            request,
            data.m_accountId,
            data.m_accountNo,
            'onedb'
        )
        return {
            "message": f"Notifications Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)})

@router.post("/status/update", status_code=status.HTTP_200_OK, response_model=NotificationStatusUpdateResponse)
async def statusupdateNotification(request: NotificationStatusUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = notification_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await notification_service.statusupdateNotification(
            request,
            data.m_accountId,
            data.m_accountNo,
            'onedb'
        )
        return {
            "message": f"Notifications Status Updated Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500,content={"message": "Internal Server Error: " + str(e)})