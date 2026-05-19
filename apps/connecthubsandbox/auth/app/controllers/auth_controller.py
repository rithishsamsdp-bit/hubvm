from fastapi import APIRouter, status, Response, Request, Form, File, UploadFile, HTTPException, BackgroundTasks, Depends
from sqlalchemy.ext.mutable import MutableDict
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from config import settings
from models.dto import MembersModel, LoginRequest, FCMTokenAssociateRequest, OTPGenerateRequest, OTPVerifyRequest
from models.dto import RefreshResponse, FCMTokenAssociateResponse
from services import auth_service
from utils.argon2_hashing import HashLib
from datetime import datetime, timezone, timedelta
import time, asyncio

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/login", status_code=status.HTTP_200_OK, response_model=dict)
async def login(request: LoginRequest, response: Response):
    try:
        memberDetails = await auth_service.getByMemberName(request.accountcode, request.membername, "onedb")
        if not memberDetails:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid CredentialsD"
                }
            )
        if HashLib.validate(request.memberpassword, memberDetails.m_memberPasswordHash) is False:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid CredentialsF"
                }
            )
        data = MembersModel.from_orm(memberDetails).dict()
        if memberDetails.m_member2FAStatus == 'Active':
            # autoskip2fa = await auth_service.autoskip2FA(memberDetails, "onedb")
            # print(autoskip2fa)
            # if not autoskip2fa:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "message": f"Two Factor Authentication Required",
                    "data": data
                }
            )
        asyncio.create_task(auth_service.stateLog("LogIn", memberDetails))
        access_token = auth_service.encode(memberDetails, settings.AUTH_TOKEN_EXPIRY)
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Login Successfull",
                "data": data
            }
        )
        response.set_cookie(key=settings.AUTH_TOKEN_NAME, value=access_token, httponly=True, max_age=settings.AUTH_TOKEN_EXPIRY.total_seconds(), secure=False, samesite="Strict")
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/login/app", status_code=status.HTTP_200_OK, response_model=dict)
async def login(request: LoginRequest, response: Response):
    try:
        memberDetails = await auth_service.getByMemberName(request.accountcode, request.membername, "onedb")
        if not memberDetails:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid CredentialsD"
                }
            )
        if HashLib.validate(request.memberpassword, memberDetails.m_memberPasswordHash) is False:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid CredentialsF"
                }
            )
        asyncio.create_task(auth_service.stateLog("LogIn", memberDetails))
        access_token = auth_service.encode(memberDetails, settings.AUTH_TOKEN_EXPIRY)
        data = MembersModel.from_orm(memberDetails).dict()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Login Successfull",
                "data": data,
                "token": access_token
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/logout", status_code=status.HTTP_200_OK, response_model=dict)
async def logout(tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = auth_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        asyncio.create_task(auth_service.stateLog("LogOut", data))
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Logout Successfull"
            }
        )
        response.delete_cookie(settings.AUTH_TOKEN_NAME)
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/refresh", status_code=status.HTTP_200_OK, response_model=RefreshResponse)
async def refresh(tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = auth_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        return {
            "message": f"Refresh Validation Successfull",
            "data": data,
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/token", status_code=status.HTTP_200_OK, response_model=dict)
async def authorize(request: LoginRequest, response: Response):
    try:
        memberDetails = await auth_service.getByMemberName(request.accountcode, request.membername, "onedb")
        if not memberDetails:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid CredentialsD"
                }
            )
        if HashLib.validate(request.memberpassword, memberDetails.m_memberPasswordHash) is False:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Invalid CredentialsF"
                }
            )
        asyncio.create_task(auth_service.stateLog("LogIn", memberDetails))
        noexpiry = timedelta(days=365 * 100)
        access_token = auth_service.encode(memberDetails, noexpiry)
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Authorization Successfull",
                "token": access_token
            }
        )
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/associate/fcmtoken/app", status_code=status.HTTP_200_OK, response_model=FCMTokenAssociateResponse)
async def associateFCMToken(request: FCMTokenAssociateRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = auth_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await auth_service.associateFCMToken(request, data.m_accountId, data.m_accountNo, "onedb")
        return {
            "message": f"FCM Token Associated Successfully"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/otp/generate", status_code=status.HTTP_200_OK, response_model=dict)
async def generateOTP(request: OTPGenerateRequest, response: Response):
    try:
        otp = await auth_service.generateOTP(request.memberdetails, "onedb")
        print(otp)
        if request.authenticationtype == 'email':
            asyncio.create_task(auth_service.sendMail(request.memberdetails, otp))
        # elif request.authenticationtype == 'sms':
        #     asyncio.create_task(auth_service.sendSMS(request.memberdetails.m_memberMobileNo, otp))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"OTP Generation Successfull",
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/otp/verify", status_code=status.HTTP_200_OK, response_model=dict)
async def verifyOTP(request: OTPVerifyRequest, response: Response):
    try:
        await auth_service.verifyOTP(request.memberdetails, request.otp, "onedb")
        data = MembersModel.from_orm(request.memberdetails).dict()
        asyncio.create_task(auth_service.stateLog("LogIn", request.memberdetails))
        access_token = auth_service.encode(request.memberdetails, settings.AUTH_TOKEN_EXPIRY)
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"OTP Verified Successfully",
                "data": data
            }
        )
        response.set_cookie(key=settings.AUTH_TOKEN_NAME, value=access_token, httponly=True, max_age=settings.AUTH_TOKEN_EXPIRY.total_seconds(), secure=False, samesite="Strict")
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})