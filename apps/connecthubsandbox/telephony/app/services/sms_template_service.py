import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from config import settings
from models.dto import TokenModel
from models import db
from models import dto
from repos import sms_template_repo
from utils.bcrypt_hashing import HashLib
from datetime import datetime
from typing import Optional

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
    



async def callbackApi(data:dict):

    response=await sms_template_repo.callbackApi(data)
    
    return response


async def send_outbound_sms(message,dst:str,agent:str,database: str,accountId:str,accountNo:str):

    response=await sms_template_repo.send_outbound_sms(message,dst,agent,database,accountId,accountNo)
    
    return response      