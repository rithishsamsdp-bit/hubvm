import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import conversation_repo
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
        
async def getdetails(accountEncryption: str, m_accountId: int, m_accountNo: str, c_phonenumber: str):
    return await conversation_repo.getdetails(accountEncryption, m_accountId, m_accountNo, c_phonenumber)

async def getconversationlist(accountEncryption: str, m_accountId: int, m_accountNo: str, m_memberExtensionNo: str):
    return await conversation_repo.getconversationlist(accountEncryption, m_accountId, m_accountNo, m_memberExtensionNo)
    
async def conversationFetch(leadId: str, accountId: int, accountNo: str, database: str):
    return await conversation_repo.conversationFetch(leadId, accountId, accountNo, database)