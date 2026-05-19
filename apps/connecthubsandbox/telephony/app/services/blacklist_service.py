import jwt
from fastapi.responses import JSONResponse
from fastapi import status
from models import dto
from repos import blacklist_repo
from datetime import datetime
from typing import Optional,List


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


async def create(p_blacklistAccountId: int, p_blacklistAccountNO: str,p_blacklistNo: int, p_blacklistDescription: str, p_blacklistCalltype: str, p_blacklistStatus: str, database: str):
    p_blacklistAccountId = p_blacklistAccountId
    p_blacklistAccountNO = p_blacklistAccountNO
    p_blacklistNo = p_blacklistNo
    p_blacklistDescription = p_blacklistDescription.strip()
    p_blacklistCalltype = p_blacklistCalltype.strip()
    p_blacklistStatus = p_blacklistStatus.strip()
    database = database
    
    return await blacklist_repo.create(p_blacklistAccountId, p_blacklistAccountNO, p_blacklistNo,p_blacklistDescription,p_blacklistCalltype,p_blacklistStatus,database)



async def get_blacklist_by_id(p_blacklistId: int, database: str) -> dict:
    return await blacklist_repo.fetch_blacklist_by_id(p_blacklistId, database)


async def update(p_blacklistId: int, p_blacklistNo: int, p_blacklistDescription: str, p_blacklistCalltype: str, p_blacklistStatus: str, database: str):
    return await blacklist_repo.update(p_blacklistId,p_blacklistNo,p_blacklistDescription.strip(),p_blacklistCalltype.strip(),p_blacklistStatus.strip(),database)


async def delete(p_blacklistId: int, database: str):
    p_blacklistId = p_blacklistId
    database = database
    return await blacklist_repo.delete(p_blacklistId, database)

async def getBlackList(accountEncryption, accountId, limit, offset, searchString, sortField, sortOrder):
    return await blacklist_repo.getBlackList(
        accountEncryption,
        accountId,
        limit,
        offset,
        searchString,
        sortField,
        sortOrder
    )