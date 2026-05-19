from fastapi.responses import JSONResponse
from fastapi import status, HTTPException
from config import settings
from models import dto
from models.dto import TokenModel
from utils.argon2_hashing import HashLib
from repos import tlmapping_repo
from datetime import datetime
from typing import List
import jwt

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

async def projectCreate(projectname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    projectname = projectname.strip()
    return await tlmapping_repo.projectCreate(projectname, memberids, accountid, accountno, database)

async def locationCreate(locationname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    locationname = locationname.strip()
    return await tlmapping_repo.locationCreate(locationname, memberids, accountid, accountno, database)

async def locationUpdate(locationid: int, locationname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    locationname = locationname.strip()
    return await tlmapping_repo.locationUpdate(locationid, locationname, memberids, accountid, accountno, database)

async def locationDelete(locationid: int, accountid: int, accountno: str, database: str):
    return await tlmapping_repo.locationDelete(locationid, accountid, accountno, database)

async def locationFetch(limit: int, offset: int, sortOrder: str, sortField: str, searchString: any, accountid: int, accountno: str, database: str):
    return await tlmapping_repo.locationFetch(limit, offset, sortOrder, sortField, searchString, accountid, accountno, database)