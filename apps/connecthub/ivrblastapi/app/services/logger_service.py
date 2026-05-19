import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import carrier_repo
from datetime import datetime
from typing import Optional

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def encode(userdetails: dict, exp: datetime, encryption) -> str:
    token = dto.TokenModel(
        a_agentId = userdetails.a_agentId,
        a_regId = userdetails.a_regId,
        a_companyCode = userdetails.a_companyCode,
        a_userName = userdetails.a_userName,
        a_password = userdetails.a_password,
        a_phLogin = userdetails.a_phLogin,
        a_campaignId = userdetails.a_campaignId,
        a_mode = userdetails.a_mode,
        a_platFormType = userdetails.a_platFormType,
        a_role = userdetails.a_role,
        a_callerId = userdetails.a_callerId,
        a_mailId = userdetails.a_mailId,
        a_loginStatus = userdetails.a_loginStatus,
        a_context = userdetails.a_context,
        a_passwordHash = userdetails.a_passwordHash,
        a_mobileNumber = userdetails.a_mobileNumber,
        a_uniqueid = userdetails.a_uniqueid,
        a_calltype = userdetails.a_calltype,
        a_confdetails = userdetails.a_confdetails,
        exp=exp,
        encryption = encryption
    )
    return jwt.encode(token.model_dump(), SECRET_KEY, algorithm=ALGORITHM)
    
def decode(token: str) -> Optional[dto.TokenModel]:
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Expired"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Invalid"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )