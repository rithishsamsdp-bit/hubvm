import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi import Request
from models import db
from models import dto
from repos import process_repo
from utils.bcrypt_hashing import HashLib
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

def createProcess(didGroupName: str,carrierId:int,regId: int,accountNo: str,database:str) -> db.DidNumberGroup:
    didGroupName = didGroupName.strip()
    carrierId = carrierId
    regId = regId
    accountNo = accountNo
    database = database
    
    return process_repo.createProcess(didGroupName,carrierId,regId,accountNo,database)


def updateProcess(didnumberGroupId:int,didGroupName: str,carrierId:int,activeStatus: int,regId: int,accountNo: str,database:str) -> db.DidNumberGroup:
    
    didnumberGroupId = didnumberGroupId 
    didGroupName = didGroupName.strip()
    carrierId = carrierId
    activeStatus = activeStatus
    regId = regId
    accountNo = accountNo
    database = database
    
    return process_repo.updateProcess(didnumberGroupId,didGroupName,carrierId,activeStatus,regId,accountNo,database)


def deleteProcess(didnumberGroupId:int,regId: int,accountNo: str,database:str) -> db.DidNumberGroup:
    
    didnumberGroupId = didnumberGroupId
    regId = regId
    accountNo = accountNo
    database = database
    
    return process_repo.deleteProcess(didnumberGroupId,regId,accountNo,database)



def CliFetchProcess(regId: int,accountNo: str,database:str) -> db.DidNumberGroup:

    regId = regId
    accountNo = accountNo
    database = database
    
    return process_repo.CliFetchProcess(regId,accountNo,database)



def fetchProcessData(regId: int,accountNo: str,database:str,request: Request) -> db.DidNumberGroup:

    regId = regId
    accountNo = accountNo
    database = database
    
    return process_repo.fetchProcessData(regId,accountNo,database,request)