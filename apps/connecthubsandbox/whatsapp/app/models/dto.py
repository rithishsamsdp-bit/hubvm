from pydantic import Field, EmailStr, BaseModel, validator, model_validator, field_validator
from datetime import datetime
from typing import Optional, List, Literal, Union, Dict, Any
from typing_extensions import Self
from pydantic.config import ConfigDict
from enum import Enum
import re

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

class WhatsappTemplateCreateRequest(BaseModel):
    tempName: Optional[str] = None
    tempCategory: Optional[str] = None
    selectLan: Optional[str] = None
    headerType: Optional[str] = None
    headerValue: Optional[str] = None
    mediaType: Optional[str] = None
    mediaExtType: Optional[str] = None
    bodyContent: Optional[str] = None
    footerContent: Optional[str] = None
    btnType: Optional[str] = None
    btnNameVm: Optional[str] = None
    wUrl: Optional[str] = None
    btnNameCpn: Optional[str] = None
    phoneNum: Optional[str] = None
    Phone_Code: Optional[str] = None
    btn1: Optional[str] = None
    btn2: Optional[str] = None
    btn3: Optional[str] = None
    s3_URL: Optional[str] = None







class FetchCampaignReportRequest(BaseModel):
    limit: int = 100
    offset: int = 0
    searchString: Optional[str] = None
    sortField: Optional[str] = None
    sortOrder: Optional[str] = None


class FetchTemplateReportRequest(BaseModel):
    limit: int = 100
    offset: int = 0
    searchString: Optional[str] = None
    sortField: Optional[str] = None
    sortOrder: Optional[str] = None


class FetchDeliveryReportRequest(BaseModel):
    limit: int = 100
    offset: int = 0
    search: Optional[str] = None
    fromDate: Optional[str] = None
    toDate: Optional[str] = None
    sortField: Optional[str] = None
    sortOrder: Optional[str] = None
    status: Optional[str] = None
    sortOrder: Optional[str] = None
    status: Optional[str] = None
    direction: Optional[str] = None


class FetchDashboardStatsRequest(BaseModel):
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    campaignId: Optional[Union[str, int]] = None
    templateId: Optional[Union[str, int]] = None


class WhatsAppCreateRequest(BaseModel):
    w_whatsappAccountId: Optional[int] = None
    w_accountId: int
    w_whatsappNumber: str
    w_phNumberId: str
    w_apiKey: str
    w_wabaID: str
    w_amountDeduction: Optional[Dict[str, Any]] = None


class WhatsAppListRequest(BaseModel):
    limit: int = Field(100, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Optional[str] = "w_createdOn"
    sortOrder: Optional[str] = "DESC"

