import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from models import db
from models import dto
from repos import holiday_repo
from utils.bcrypt_hashing import HashLib
from datetime import datetime
from typing import Optional

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"
    
def decode(token: str) -> Optional[dto.TokenModel]:
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "failed",
                "message": "Token Expired"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "failed",
                "message": "Token Invalid"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

def create_holiday(name: str,start_date: str,end_date: str,msg_enable: str,message: str,audio_enable: str,audio_name: str,database:str) -> db.Holiday:
    name = name.strip()
    start_date = start_date.strip()
    end_date = end_date.strip()
    msg_enable = msg_enable.strip()
    message = message.strip()
    audio_enable = audio_enable.strip()
    audio_name = audio_name.strip()
    database = database
    
    return holiday_repo.create_holiday(name,start_date,end_date,msg_enable,message,audio_enable,audio_name,database)

def update_holiday(name: str,start_date: str,end_date: str,msg_enable: str,message: str,audio_enable: str,audio_name: str,database:str) -> db.Holiday:
    name = name.strip()
    start_date = start_date.strip()
    end_date = end_date.strip()
    msg_enable = msg_enable.strip()
    message = message.strip()
    audio_enable = audio_enable.strip()
    audio_name = audio_name.strip()
    database = database
    
    holiday_repo.update_holiday(name,start_date,end_date,msg_enable,message,audio_enable,audio_name,database)
    
def delete_holiday(name: str,database:str) -> db.Holiday:
    name = name.strip()
    database = database
    holiday_repo.delete_holiday(name,database)

def get_holiday_by_name(name: str,database:str) -> db.Holiday:
    name = name.strip()
    database = database
    holiday_repo.get_holiday_by_name(name,database)