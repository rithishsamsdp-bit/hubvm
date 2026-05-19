from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import memberGroup_repo
from datetime import datetime
from typing import List
import uuid, jwt

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str):
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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

async def create(membergroupname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    membergroupname = membergroupname.strip()
    membergroupid = uuid.uuid4().int & ((1 << 63) - 1)
    return await memberGroup_repo.create(membergroupid, membergroupname, memberids, accountid, accountno, database)

async def update(membergroupid: int, membergroupname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    membergroupname = membergroupname.strip()
    oldmembergroupid = membergroupid
    newmembergroupid = uuid.uuid4().int & ((1 << 63) - 1)
    return await memberGroup_repo.update(oldmembergroupid, newmembergroupid, membergroupname, memberids, accountid, accountno, database)

async def delete(membergroupid: int, accountid: int, accountno: str, database: str):
    return await memberGroup_repo.delete(membergroupid, accountid, accountno, database)

async def fetch(limit: int, offset: int, sortOrder: str, sortField: str, searchString: any, accountid: int, accountno: str, database: str):
    return await memberGroup_repo.fetch(limit, offset, sortOrder, sortField, searchString, accountid, accountno, database)

async def listMembers(accountid: int, accountno: str, database: str):
    return await memberGroup_repo.listMembers(accountid, accountno, database)