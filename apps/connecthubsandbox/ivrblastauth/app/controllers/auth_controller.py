from fastapi import APIRouter
from fastapi import status
from fastapi import Response
from fastapi import Request
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from utils.bcrypt_hashing import HashLib
from models import dto
from models.dto import AgentsModel
from services import auth_service
from constants import COOKIES_KEY_NAME
from constants import SESSION_TIME
from datetime import datetime
from datetime import timezone

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/login", status_code=status.HTTP_200_OK, response_model=dict)
def login(request: dto.LoginRequest, response: Response):
    NOW = datetime.now(timezone.utc)
    username = request.username
    companycode = request.companycode
    company = auth_service.get_by_companycode(companycode, "connecthub")
    if not company:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Invalid Credentials"
            },
        )
    agent = auth_service.get_by_username(username, company.c_encrpytionID)
    if not agent:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Invalid Credentials"
            },
        )
    if HashLib.validate(request.password, agent.a_passwordHash) is False:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Invalid Credentials"
            },
        )
    expiry = NOW + SESSION_TIME
    access_token = auth_service.encode(agent, expiry, company.c_encrpytionID)
    data = AgentsModel.from_orm(agent).dict()
    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Login Successfull",
            "data": data,
        }
    )
    response.set_cookie(
        key=COOKIES_KEY_NAME,
        value=access_token,
        httponly=True,  # Ensures that the cookie is not accessible via JavaScript
        max_age=SESSION_TIME.total_seconds(),  # Set expiration time for the cookie
        secure=False,  # Ensure the cookie is sent only over HTTPS (use only on production)
        samesite="Strict",  # Avoids sending cookies along cross-site requests
    )
    return response

@router.post("/logout", status_code=status.HTTP_200_OK, response_model=dict)
def logout(request: Request, response: Response):
    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Logout Successfull",
        }
    )
    response.delete_cookie(COOKIES_KEY_NAME)
    return response

@router.post("/refresh", status_code=status.HTTP_200_OK, response_model=dict)
def validate(request: Request, response: Response):
    token = request.cookies.get("accessToken")
    data = auth_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    else:
        Data = AgentsModel.from_orm(data).dict()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Refresh Validation Successfull",
                "data": Data,
            }
        )