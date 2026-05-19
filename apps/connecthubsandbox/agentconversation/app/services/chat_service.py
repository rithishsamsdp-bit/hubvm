from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import chat_repo
from typing import Optional
import jwt

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

async def history(request: dto.ChatHistoryRequest, plandetails: dict, membername: str, accountid: int, accountno: str, database: str):
    return await chat_repo.history(request.leadid, plandetails, membername, accountid, accountno, database, request.limit, request.offset)


async def historyName(request: dto.ChatHistoryRequestName, plandetails: dict, membername: str, accountid: int, accountno: str, database: str):
    return await chat_repo.historyName(plandetails, membername, accountid, accountno, database, request.limit, request.offset)