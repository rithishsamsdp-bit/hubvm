from datetime import datetime
from models import dto
from utils.argon2_hashing import HashLib
import jwt
from repos import tlmapping_repo
from config import settings
from models.dto import TokenModel
from fastapi.responses import JSONResponse
from fastapi import status, HTTPException

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str):
    try:
        token_data = jwt.decode(token, settings.AUTH_TOKEN_SECRET_KEY, algorithms=[settings.AUTH_TOKEN_ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Invalid"
            }
        )

async def gettl(request: dto.tlfetchRequest,accountId: int, accountNo: str, database: str) -> dict:
    return await tlmapping_repo.gettl(request, accountId, accountNo, database)

async def createtlmap(request: dto.TlmappingRequest, accountId: int, accountNo: str, database: str) -> dict:
    return await tlmapping_repo.createtlmap(request, accountId, accountNo, database)

async def listMembers(accountid: int, accountno: str, database: str):
    return await tlmapping_repo.listMembers(accountid, accountno, database)
