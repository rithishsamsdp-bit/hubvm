import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import log_repo

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

async def logCDR(callid: str, accountid: int, accountno: str, campaignid: int, campaignname: str, clinumberid: int, clinumbername: str, source: str, destination: str, calldisposition: str, agentdisposition: str, direction: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, billsec: int, hangupby: str, database: str):
    return await log_repo.logCDR(callid, accountid, accountno, campaignid, campaignname, clinumberid, clinumbername, source, destination, calldisposition, agentdisposition, direction, calldatetime, starttime, endtime, answertime, duration, billsec, hangupby, database)