from fastapi import APIRouter, Query, Form, Path, status, Response, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import Field, EmailStr, BaseModel, validator, model_validator, field_validator
from datetime import datetime
from typing import Optional, List, Literal, Union
from typing_extensions import Self
from pydantic.config import ConfigDict
import re
from enum import Enum

### Authentication Models ###

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# print(oauth2_scheme)

class TokenModel(BaseModel):
    m_memberId : Optional[int] = None
    m_accountId : Optional[int] = None
    m_accountNo : Optional[str] = None
    m_accountCode : Optional[str] = None
    m_memberName : Optional[str] = None
    m_memberPassword : Optional[str] = None
    m_memberRole : Optional[str] = None
    m_memberExtensionNo : Optional[int] = None
    m_memberCallerId : Optional[int] = None
    m_memberMobileNo : Optional[int] = None
    m_memberMailId : Optional[str] = None
    m_memberMode : Optional[str] = None
    m_memberPlatformType : Optional[str] = None
    m_readyStatus : Optional[str] = None
    m_status : Optional[str] = None
    m_statusTime : Optional[str] = None
    m_campaignId : Optional[int] = None
    m_memberplanId : Optional[int] = None
    m_memberplanDetails : Optional[dict] = None
    p_proxyId: Optional[int] = None
    p_proxyName: Optional[str] = None
    p_proxyDomainName: Optional[str] = None
    p_proxyIPAddress: Optional[str] = None
    p_proxyPrivateIPAddress: Optional[str] = None
    p_codexName : Optional[str] = None
    p_proxyDirectoryName: Optional[str] = None
    a_accountServiceRegion: Optional[str] = None,
    a_accountTimeZone: Optional[str] = None 
    t_teamMemberExtensionNo: Optional[List[int]] = None
    
    exp : datetime
    accountEncryption : Optional[str] = None

    class Config:
        from_attributes=True

class MembersModel(BaseModel):
    m_memberId : Optional[int] = None
    m_accountId : Optional[int] = None
    m_accountNo : Optional[str] = None
    m_accountCode : Optional[str] = None
    m_memberName : Optional[str] = None
    m_memberRole : Optional[str] = None
    m_memberExtensionNo : Optional[int] = None
    m_memberCallerId : Optional[int] = None
    m_memberMobileNo : Optional[int] = None
    m_memberMailId : Optional[str] = None
    m_memberMode : Optional[str] = None
    m_memberPlatformType : Optional[str] = None
    m_campaignId : Optional[int] = None

    class Config:
        from_attributes=True   

class conversationfetch(BaseModel):
    c_phonenumber: str
    
   
class Leaddetails(BaseModel):
    l_leadId: str
    l_accountId: int
    l_accountNo: str
    l_leadMobileNumber: str
    l_leadName: Optional[str]
    l_leadOwner: Optional[str]
    l_leadOrigin: Union[str, dict]
    l_leadStatus: Optional[str]
    class Config:
        orm_mode = True
        
class LeadCreate(BaseModel):
    l_serviceNo: str
    l_leadMobileNumber: str
    l_uniqueId: str
    l_tasktype: str

    @field_validator('l_serviceNo', 'l_leadMobileNumber', 'l_uniqueId', 'l_tasktype')
    @classmethod
    def not_empty(cls, value, info):
        if not value.strip():
            raise ValueError(f"{info.field_name} cannot be empty")
        return value

class conversationFetchRequest(BaseModel):
    leadId: str = Field(..., min_length=1, description="leadId must not be empty.")