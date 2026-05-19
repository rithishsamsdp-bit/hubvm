import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from config import settings
from models import db
from models import dto
from repos import member_repo
from utils.argon2_hashing import HashLib
from xmlrpc.client import ServerProxy, Error
from urllib.parse import quote
from datetime import datetime
from typing import Optional
import json, asyncio


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

async def create(accountEncryption: str, m_accountCode: str, users: list, requestType:str):
    errors = []
    validUsers = []
    
    seen_names = set()
    seen_emails = set()
    seen_extensions = set()

    for user in users:
        has_error = False
        try:
            user.m_memberName = user.m_memberName.strip()
            user.m_memberPassword = user.m_memberPassword.strip()

            email = user.m_memberMailId.strip() if user.m_memberMailId else None
            extension = user.m_memberExtensionNo.strip() if user.m_memberExtensionNo else None
            
            # ---- REQUEST-LEVEL DUPLICATES ----
            if user.m_memberName in seen_names:
                errors.append({"user": user.m_memberName, "message": "Duplicate username in request"})
                has_error = True

            if email and email in seen_emails:
                errors.append({"user": user.m_memberName, "message": "Duplicate email in request"})
                has_error = True

            if extension and extension in seen_extensions:
                errors.append({"user": user.m_memberName, "message": "Duplicate extension in request"})
                has_error = True

            # ---- DB-LEVEL VALIDATIONS ----
            memname = await validator(accountEncryption, 'm_memberName', user.m_memberName, m_accountCode)
            if memname["status_code"] != 200:
                errors.append({"user": user.m_memberName, "message": memname["message"]})
                has_error = True

            memmail = await validator(accountEncryption, 'm_memberMailId', email, m_accountCode)
            if memmail["status_code"] != 200:
                errors.append({"user": user.m_memberName, "message": memmail["message"]})
                has_error = True

            if extension:
                memextension = await validator(accountEncryption, 'm_memberExtensionNo', extension, m_accountCode)
                if memextension["status_code"] != 200:
                    errors.append({"user": user.m_memberName, "message": memextension["message"]})
                    has_error = True

            # ---- FINAL DECISION ----
            if has_error:
                continue

            user.m_memberPasswordHash = HashLib.hash(user.m_memberPassword)
            
            seen_names.add(user.m_memberName)
            if email:
                seen_emails.add(email)
            if extension:
                seen_extensions.add(extension)

            user.m_memberMailId = email
            user.m_memberExtensionNo = extension

            validUsers.append(user)
        except Exception as e:
            errors.append({"user": getattr(user, "m_memberName", None), "message": str(e)})

    results = []
    if validUsers:
        try:
            results = await member_repo.create(accountEncryption, validUsers, requestType)
        except Exception as e:
            for user in validUsers:
                errors.append({"user": user.m_memberName, "message": str(e)})
        # print('Yes')
    print({"success": results, "errors": errors})
    return {"success": results, "errors": errors}

# Validate a Member
async def validator(accountEncryption: str,vtype: str, vvalue: str, m_accountCode:str, m_memberId: Optional[int] = None):
    return await member_repo.validator(accountEncryption, vtype, vvalue, m_accountCode, m_memberId)

# Update a Member
async def update(accountEncryption:str, m_accountId:int, m_memberId:str, m_memberName:str, m_memberPassword:str, m_memberRole:str, m_memberCallerIdMode:str, m_memberCallerId:str, m_memberMobileNo:int, m_memberMailId:int, m_memberMode:str, m_memberPlatformType:str, m_accountCode:str):
    # Validate MemberName and mailid and email before creating
    memmail = await  member_repo.validator(accountEncryption, 'm_memberMailId', m_memberMailId, m_accountCode, m_memberId)
    mememail = await  member_repo.validator(accountEncryption, 'm_memberName', m_memberName, m_accountCode, m_memberId)

    if  memmail["status_code"] != 200:
        return memmail
    if  mememail["status_code"] != 200:
        return mememail
    m_memberPasswordHash = HashLib.hash(m_memberPassword)
    
    # Update the Member in the repository
    return await member_repo.update(accountEncryption, m_accountId, m_memberId, m_memberName, m_memberPassword, m_memberPasswordHash, m_memberRole,m_memberCallerIdMode, m_memberCallerId, m_memberMobileNo, m_memberMailId, m_memberMode, m_memberPlatformType)


async def update(accountEncryption:str, m_accountId:int, m_memberId:str, m_memberName:str, m_memberPassword:str, m_memberRole:str, m_memberCallerIdMode:str, m_memberCallerId:str, m_memberMobileNo:int, m_memberMailId:str, m_memberMode:str, m_memberPlatformType:str, m_accountCode:str):
    # Validate MemberName and mailid and email before creating
    memmail = await  member_repo.validator(accountEncryption, 'm_memberMailId', m_memberMailId, m_accountCode, m_memberId)
    mememail = await  member_repo.validator(accountEncryption, 'm_memberName', m_memberName, m_accountCode, m_memberId)
    if  memmail["status_code"] != 200:
        return memmail
    if  mememail["status_code"] != 200:
        return mememail
    m_memberPasswordHash = HashLib.hash(m_memberPassword)

    proxyinstances = await member_repo.getProxyInstances(m_accountId, 'onedb')
    print(proxyinstances.p_proxyId)
    if str(proxyinstances.p_proxyId) == '3':
        mediainstances = await member_repo.getMediaInstances(proxyinstances.p_proxyId, 'onedb')
        if not mediainstances:
            raise HTTPException(status_code=404, detail="No media instances found")
        print(mediainstances)

        memberextensionno = await member_repo.update(accountEncryption, m_accountId, m_memberId, m_memberName, m_memberPassword, m_memberPasswordHash, m_memberRole,m_memberCallerIdMode, m_memberCallerId, m_memberMobileNo, m_memberMailId, m_memberMode, m_memberPlatformType)
        print(memberextensionno)

        tasks = [xmlFlushCache(mediainstance.m_mediaPrivateIPAddress, memberextensionno) for mediainstance in mediainstances]
        await asyncio.gather(*tasks, return_exceptions=True)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Member Updated Successfully"}
        )
    else:
        return await member_repo.updateSubscriber(accountEncryption, m_accountId, m_memberId, m_memberName, m_memberPassword, m_memberPasswordHash, m_memberRole,m_memberCallerIdMode, m_memberCallerId, m_memberMobileNo, m_memberMailId, m_memberMode, m_memberPlatformType)

# Delete a Member
async def delete(accountEncryption:str, m_accountId:int, m_memberId: str):
    return await member_repo.delete(accountEncryption, m_accountId, m_memberId)

# Get a Member 
async def getMember(accountEncryption: str, m_accountNo: str, m_memberRole: str, limit: str, offset: str, searchString: str, sortField: str, sortOrder: str, roleFilter: str,memberMode: str, memberPlatform: str, type: str):
    
    return await member_repo.getMember( accountEncryption,m_accountNo,m_memberRole, limit, offset, searchString, sortField, sortOrder, roleFilter, memberMode, memberPlatform, type)

async def updateclicktocall(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int, m_clicktocallType: str):
    
    return await member_repo.updateclicktocall( m_accountId,m_accountNo,accountEncryption, m_memberId, m_clicktocallType)

async def update2FAStatus(accountid: int, accountno: str, memberid: int, member2fastatus: str, database: str):
    await member_repo.update2FAStatus(accountid, accountno, memberid, member2fastatus, database)

async def updateAccessStatus(memberid: int, memberaccessstatus: str, database: str):
    await member_repo.updateAccessStatus(memberid, memberaccessstatus, database)

async def xmlFlushCache(host: str, memberextensionno: str):
    def _run_flush():
        username = quote(settings.FS_XML_RPC_USERNAME, safe='')
        password = quote(settings.FS_XML_RPC_PASSWORD, safe='')
        try:
            server = ServerProxy(f"http://{username}:{password}@{host}:{settings.FS_XML_RPC_PORT}/RPC2", allow_none=True)
            result = server.freeswitch.api("xml_flush_cache", f"id {memberextensionno}")
            print(result)
        except Error as e:
            raise HTTPException(status_code=404, detail=f"XML-RPC Error on {host}: {e}")
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Connection failed on {host}: {e}")
    await asyncio.to_thread(_run_flush)