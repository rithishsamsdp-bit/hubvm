from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import auth_repo
from datetime import datetime
from typing import Optional
import jwt

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

async def getByMemberName(accountcode: str, membername: str, database: str):
    return await auth_repo.getByMemberName(accountcode.strip(), membername.strip(), database.strip())

async def stateLog(statename: str, statetime: str, memberDetails: dict):
    memberid = memberDetails.m_memberId
    memberrole = memberDetails.m_memberRole
    membername = memberDetails.m_memberName
    accountid = memberDetails.m_accountId
    accountno = memberDetails.m_accountNo
    database = "onedb"
    return await auth_repo.stateLog(statename, statetime, memberid, memberrole, membername, accountid, accountno, database)



# def getByMemberMailId(memberMailId: str, database: str):
#     return auth_repo.getByMemberMailId(memberMailId.strip().lower(), database.strip())

# def getByAccountDomainId(accountDomainId: str, database: str):
#     return auth_repo.getByAccountDomainId(accountDomainId.strip().lower(), database.strip())

# async def samlConfigure(domain: str, entityid: str, loginurl: str, decodedcontent: str, database: str):
#     domain = domain.strip().lower()
#     entityid = entityid.strip()
#     loginurl = loginurl.strip()
#     database = database
#     return await auth_repo.samlConfigure(domain, entityid, loginurl, decodedcontent, database)

# async def getBySamlConfigDomain(domain: str, database: str):
#     return await auth_repo.getBySamlConfigDomain(domain.strip().lower(), database.strip())