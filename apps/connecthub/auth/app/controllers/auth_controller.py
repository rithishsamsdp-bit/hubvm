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
import time, asyncio, json
from db.context import get_redis

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/login", status_code=status.HTTP_200_OK, response_model=dict)
async def login(request: LoginRequest, response: Response, fastapi_request: Request):
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
        if memberDetails.m_memberAccessStatus == 'Inactive':
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "message": f"Member Deactivated"
                }
            )
        data = MembersModel.from_orm(memberDetails).dict()

        # Check if duplicate session detection is enabled for this account and role
        duplicate_session_enabled = False
        try:
            account_plan = await auth_service.getAccountPlanDetails(memberDetails.m_accountId, "onedb")
            if account_plan:
                features = account_plan.get("limits", {}).get("features", {})
                is_detection_enabled = features.get("DUPLICATE_SESSION_DETECTION", False)
                restricted_roles = features.get("DUPLICATE_SESSION_ROLES", [])
                
                if is_detection_enabled and memberDetails.m_memberRole in restricted_roles:
                    duplicate_session_enabled = True
        except Exception:
            pass
            
        if memberDetails.m_memberRole == "SUPERADMIN":
            duplicate_session_enabled = False

        # Active Session Detection (only if enabled for this account)
        redis = get_redis()
        session_key = f"chub_session:onedb:{memberDetails.m_memberId}"
        if redis and duplicate_session_enabled:
            if request.forcelogin:
                # Force login: clear the old session before proceeding
                try:
                    await redis.delete(session_key)
                except Exception:
                    pass
            else:
                try:
                    existing_session = await redis.get(session_key)
                    if existing_session:
                        session_data = json.loads(existing_session)
                        return JSONResponse(
                            status_code=status.HTTP_200_OK,
                            content={
                                "message": "Duplicate Session Detected",
                                "data": data,
                                "session": session_data
                            }
                        )
                except Exception:
                    pass

        if memberDetails.m_member2FAStatus == 'Active':
            autoskip2fa = await auth_service.autoskip2FA(memberDetails, "onedb")
            if not autoskip2fa:
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                        "message": f"Two Factor Authentication Required",
                        "data": data
                    }
                )

        # Generate token first so we can bind it to the session
        access_token = auth_service.encode(memberDetails, settings.AUTH_TOKEN_EXPIRY)

        # Store active session in Redis
        if redis:
            try:
                user_ip = request.publicIp if request.publicIp else (fastapi_request.client.host if fastapi_request.client else "Unknown")
                local_ip = request.localIp if request.localIp else "Unknown"
                user_location = request.publicLocation if request.publicLocation else "Unknown Location"
                user_device = fastapi_request.headers.get("user-agent", "Unknown Device")
                login_time = datetime.now(timezone.utc).isoformat()
                session_id = request.sessionId if request.sessionId else None
                await redis.set(session_key, json.dumps({"ip": user_ip, "local_ip": local_ip, "device": user_device, "location": user_location, "login_time": login_time, "token": access_token, "session_id": session_id}), ex=int(settings.AUTH_TOKEN_EXPIRY.total_seconds()))
            except Exception:
                pass

        asyncio.create_task(auth_service.stateLog("LogIn", memberDetails))
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

@router.get("/session/status", status_code=status.HTTP_200_OK, response_model=dict)
async def session_status(tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    if not token:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"message": "No token provided"})
    
    data = auth_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
        
    if data.m_memberRole == "SUPERADMIN":
        return JSONResponse(status_code=status.HTTP_200_OK, content={"valid": True, "polling_enabled": False})
        
    # Check if duplicate session detection is enabled for this account/role
    try:
        account_plan = await auth_service.getAccountPlanDetails(data.m_accountId, "onedb")
        features = (account_plan or {}).get("limits", {}).get("features", {})
        is_detection_enabled = features.get("DUPLICATE_SESSION_DETECTION", False)
        restricted_roles = features.get("DUPLICATE_SESSION_ROLES", [])

        if not is_detection_enabled or data.m_memberRole not in restricted_roles:
            return JSONResponse(status_code=status.HTTP_200_OK, content={"valid": True, "polling_enabled": False})
    except Exception:
        return JSONResponse(status_code=status.HTTP_200_OK, content={"valid": True, "polling_enabled": False})
        
    redis = get_redis()
    if redis:
        try:
            session_key = f"chub_session:onedb:{data.m_memberId}"
            existing_session_raw = await redis.get(session_key)
            if not existing_session_raw:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"message": "Session invalidated or overridden."}
                )
            
            existing_session = json.loads(existing_session_raw)
            if existing_session.get("token") and existing_session.get("token") != token:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"message": "Session overridden by a new login."}
                )
        except Exception:
            pass
            
    return JSONResponse(status_code=status.HTTP_200_OK, content={"valid": True, "polling_enabled": True})

@router.post("/logout", status_code=status.HTTP_200_OK, response_model=dict)
async def logout(tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = auth_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        # Clear active session from Redis ONLY if it matches the token requesting logout
        redis = get_redis()
        if redis:
            try:
                session_key = f"chub_session:onedb:{data.m_memberId}"
                existing_session_raw = await redis.get(session_key)
                if existing_session_raw:
                    existing_session = json.loads(existing_session_raw)
                    # If token matches (or no token recorded), it's safe to delete
                    if not existing_session.get("token") or existing_session.get("token") == token:
                        await redis.delete(session_key)
            except Exception:
                pass
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
async def verifyOTP(request: OTPVerifyRequest, response: Response, fastapi_request: Request):
    try:
        await auth_service.verifyOTP(request.memberdetails, request.otp, "onedb")
        data = MembersModel.from_orm(request.memberdetails).dict()
        # Store active session in Redis after OTP verification
        redis = get_redis()
        if redis:
            try:
                session_key = f"chub_session:onedb:{request.memberdetails.m_memberId}"
                user_ip = fastapi_request.client.host if fastapi_request.client else "Unknown"
                user_device = fastapi_request.headers.get("user-agent", "Unknown Device")
                login_time = datetime.now(timezone.utc).isoformat()
                await redis.set(session_key, json.dumps({"ip": user_ip, "device": user_device, "location": "Unknown Location", "login_time": login_time}), ex=int(settings.AUTH_TOKEN_EXPIRY.total_seconds()))
            except Exception:
                pass
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