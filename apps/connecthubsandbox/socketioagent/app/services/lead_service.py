import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import lead_repo
from datetime import datetime
from typing import Optional
from pydantic import EmailStr
import json

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str) -> Optional[dto.TokenModel]:
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Invalid"
            }
        )

async def create(l_serviceNo: str, l_leadMobileNumber: str, l_uniqueId: str, l_tasktype:str):
    
    return await lead_repo.create(l_serviceNo, l_leadMobileNumber, l_uniqueId, l_tasktype)