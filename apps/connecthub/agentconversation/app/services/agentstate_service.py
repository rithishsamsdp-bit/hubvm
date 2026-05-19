from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import agentstate_repo
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
        
async def readynotreadystate(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int,m_memberExtensionNo:int,  m_memberName:str, m_memberRole:str, p_proxyId:int, p_proxyPrivateIPAddress:str, r_status:str, campId:int):
    if p_proxyId == 3:
        return await agentstate_repo.readynotreadystatemid(m_accountId, m_accountNo, accountEncryption, m_memberId,m_memberExtensionNo, m_memberName, m_memberRole, p_proxyId, p_proxyPrivateIPAddress, r_status, campId)
    else:
        return await agentstate_repo.readynotreadystate(m_accountId, m_accountNo, accountEncryption, m_memberId,m_memberExtensionNo, m_memberName, m_memberRole, p_proxyId, p_proxyPrivateIPAddress, r_status, campId)

async def agentbreak(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int,m_memberExtensionNo:int, m_memberName:str, m_memberRole:str, b_Break:str):
    return await agentstate_repo.agentbreak(m_accountId, m_accountNo, accountEncryption, m_memberId,m_memberExtensionNo, m_memberName, m_memberRole, b_Break)

async def changecampaign(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int,m_memberExtensionNo:str, m_memberName:str, m_memberRole:str, campName:str, campId:int, p_proxyId:int, p_proxyPrivateIPAddress:str):
    if p_proxyId == 3:
        return await agentstate_repo.changecampaignmid(m_accountId, m_accountNo, accountEncryption, m_memberId,m_memberExtensionNo, m_memberName, m_memberRole, campName,campId, p_proxyId, p_proxyPrivateIPAddress)
    else:
        return await agentstate_repo.changecampaign(m_accountId, m_accountNo, accountEncryption, m_memberId,m_memberExtensionNo, m_memberName, m_memberRole, campName,campId, p_proxyId, p_proxyPrivateIPAddress)
