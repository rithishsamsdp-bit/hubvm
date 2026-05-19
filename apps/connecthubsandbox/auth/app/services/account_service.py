from fastapi import status, HTTPException
from fastapi.responses import JSONResponse
from config import settings
from models.dto import TokenModel
from repos import account_repo
import base64, hashlib, jwt
import asyncio

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

async def create(request: dict, database: str):
    existingAccount = await account_repo.validate(request.accountname, request.accountcode, database.strip())
    if not existingAccount:
        asyncio.create_task(account_repo.create(request, database.strip()))
    else:
        existingAccountName, existingAccountCode = existingAccount
        if existingAccountName == request.accountname:
            raise HTTPException(status_code=409, detail="Account Name Already Exists")
        if existingAccountCode == request.accountcode:
            raise HTTPException(status_code=409, detail="Account Code Already Exists")

def createAccountEncryption(accountid: int):
    accountencryption = hashlib.md5(((base64.b64encode(str(accountid).encode()).decode()) + "pulse" + str(accountid)).encode()).hexdigest()
    return accountencryption

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, database: str):
    return await account_repo.fetch(limit, offset, sortField, sortOrder, searchString, database)

async def accountdetails(accountid: int, database: str):
    return await account_repo.accountdetails(accountid, database)

async def updateaccountdetails(accountid: int, planDetails:dict,accounttimezone: str, database: str):
    return await account_repo.updateaccountdetails(accountid, planDetails,accounttimezone, database)

async def fetchCompanyUsers(accountid: int, limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, database: str):
    return await account_repo.fetchCompanyUsers(accountid, limit, offset, sortField, sortOrder, searchString, database)

async def validate_account_code(accountcode: str, database: str):
    return await account_repo.validate_account_code(accountcode, database)

async def createIp(request, database: str):
    return await account_repo.createIp(request, database)

async def fetchIpList(request, database: str):
    return await account_repo.fetchIpList(request, database)

async def deleteIp(id: int, accountId: int, database: str):
    return await account_repo.deleteIp(id, accountId, database)
