import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import livemonitor_repo
from utils.bcrypt_hashing import HashLib
from datetime import datetime
from typing import Optional, List

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
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Invalid"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
async def fetch(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberRole: str, m_memberId: int) -> dict:
    return await  livemonitor_repo.fetch(m_accountId, m_accountNo, accountEncryption, m_memberRole, m_memberId)

async def metrics(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberRole: str) -> dict:
    return await  livemonitor_repo.metrics(m_accountId, m_accountNo, accountEncryption, m_memberRole)

async def mainmetrics(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberRole: str, m_memberId: int) -> dict:
    return await  livemonitor_repo.mainmetrics(m_accountId, m_accountNo, accountEncryption, m_memberRole, m_memberId)

async def agentlivemetrics(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberRole: str) -> dict:
    return await  livemonitor_repo.agentlivemetrics(m_accountId, m_accountNo, accountEncryption, m_memberRole)

async def livecallmonitoring(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberRole: str, limit:int, offset:int, m_memberId: int) -> dict:
    return await  livemonitor_repo.livecallmonitoring(m_accountId, m_accountNo, accountEncryption, m_memberRole,limit,offset,m_memberId)