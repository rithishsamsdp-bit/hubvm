from fastapi import APIRouter, Query, Form, Path, status, Response, Depends, HTTPException
from pydantic import Field, EmailStr, BaseModel, validator, model_validator, field_validator
from datetime import datetime
from typing import Optional, List, Literal, Union
from typing_extensions import Self
from pydantic.config import ConfigDict
import re
from enum import Enum

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

class CDRLoggingRequest(BaseModel):
    agentExten: str
    sip_auth_username: str
    
    class Config:
        model_config = {'extra': 'forbid'}

class outBoundRequest(BaseModel):
    To: Optional[str] = Field(None, description="Participant/agent extension number")
    From: Optional[str] = Field(None, description="Originator of the call")
    Calltype: Optional[str] = Field(None, description="Type of call (outbound, inbound, etc.)")
    Custom: Optional[dict] = Field(None, description="Custom parameters as key-value pairs")
    Callerid: Optional[str] = Field(None, description="Caller ID for the call")
    
    class Config:
        model_config = {'extra': 'forbid'}


    @field_validator("To", "From", "Callerid", mode="before")
    @classmethod
    def convert_to_string(cls, value):
        if value is None:
            return value
        return str(value)
    
class AccountRequest(BaseModel):
    accountNo: str