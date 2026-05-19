from fastapi import APIRouter, status, Response, Request, Form, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from models.dto import MembersModel, LoginRequest
from services import auth_service
from constants import COOKIES_KEY_NAME, SESSION_TIME
from utils.argon2_hashing import HashLib
from datetime import datetime, timezone
import asyncio

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post("/login", status_code=status.HTTP_200_OK, response_model=dict)
async def login(request: LoginRequest, response: Response):
    try:
        memberDetails = await auth_service.getByMemberName(request.accountcode, request.membername, "onedb")
        if not memberDetails:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid Credentials"
                }
            )
        if HashLib.validate(request.memberpassword, memberDetails.m_memberPasswordHash) is False:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid Credentials"
                }
            )
        NOW = datetime.now(timezone.utc)
        asyncio.create_task(auth_service.stateLog("LogIn", NOW, memberDetails))
        expiry = NOW + SESSION_TIME
        access_token = auth_service.encode(memberDetails, expiry, memberDetails.m_accountNo)
        data = MembersModel.from_orm(memberDetails).dict()
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Login Successfull",
                "data": data,
            }
        )
        response.set_cookie(key=COOKIES_KEY_NAME, value=access_token, httponly=True, max_age=SESSION_TIME.total_seconds(), secure=False, samesite="Strict")
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

# @router.post("/logout", status_code=status.HTTP_200_OK, response_model=dict)
# async def logout(tokenRequest: Request, response: Response):
#     try:
#         token = tokenRequest.cookies.get("accessToken")
#         data = auth_service.decode(token)
#         if isinstance(data, JSONResponse):
#             return data
#         NOW = datetime.now(timezone.utc)
#         asyncio.create_task(auth_service.stateLog("LogOut", NOW, data))
#         response = JSONResponse(
#             status_code=status.HTTP_200_OK,
#             content={
#                 "message": f"Logout Successfull"
#             }
#         )
#         response.delete_cookie(COOKIES_KEY_NAME)
#         return response
#     except HTTPException as e:
#         return JSONResponse(status_code=e.status_code, content={"message": e.detail})







# @router.post("/refresh", status_code=status.HTTP_200_OK, response_model=dict)
# def validate(tokenRequest: Request, response: Response):
#     try:
#         token = tokenRequest.cookies.get("accessToken")
#         data = auth_service.decode(token)
#         if isinstance(data, JSONResponse):
#             return data
#         Data = MembersModel.from_orm(data).dict()
#         return JSONResponse(
#             status_code=status.HTTP_200_OK,
#             content={
#                 "message": f"Refresh Validation Successfull",
#                 "data": Data,
#             }
#         )
#     except HTTPException as e:
#         return JSONResponse(status_code=e.status_code, content={"message": e.detail})

# @router.post("/saml/configure", status_code=status.HTTP_201_CREATED, response_model=dict)
# async def samlConfigure(tokenRequest: Request, domain: str = Form(...), entityid: str = Form(...), loginurl: str = Form(...), certificate: UploadFile = File(...)):
#     token = tokenRequest.cookies.get("accessToken")
#     data = auth_service.decode(token)
#     if isinstance(data, JSONResponse):
#         return data
#     content = await certificate.read()
#     decodedcontent = content.decode("utf-8").strip()
#     await auth_service.samlConfigure(
#         domain,
#         entityid,
#         loginurl,
#         decodedcontent,
#         data.accountEncryption
#     )
#     return JSONResponse(
#         status_code=status.HTTP_201_CREATED,
#         content={
#             "message": f"SAML Configuration Created Successfully."
#         }
#     )