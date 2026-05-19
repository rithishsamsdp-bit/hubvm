from pydantic import Field, EmailStr, BaseModel, validator, model_validator, field_validator
from datetime import datetime
from typing import Optional, List, Literal, Union, Any
from typing_extensions import Self
from pydantic.config import ConfigDict
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
    m_memberplanId : Optional[int] = None
    m_memberplanDetails : Optional[dict] = None

    class Config:
        from_attributes=True

class MemberGroupsModel(BaseModel):
    m_recordId : Optional[int] = None
    m_accountId : Optional[int] = None
    m_accountNo : Optional[str] = None
    m_membergroupId : Optional[int] = None
    m_membergroupName : Optional[str] = None
    m_membergroupStatus : Optional[str] = None
    m_memberId : Optional[int] = None
    m_campaignId : Optional[int] = None

    class Config:
        from_attributes=True

class CdrLogsModel(BaseModel):
    c_logId : Optional[int] = None
    c_accountId : Optional[int] = None
    c_accountNo : Optional[str] = None
    c_callId : Optional[str] = None
    c_memberExtensionNo : Optional[str] = None
    c_memberPhoneno : Optional[str] = None
    c_callerName : Optional[str] = None
    c_customerPhoneno : Optional[str] = None
    c_disposition : Optional[str] = None
    c_direction : Optional[str] = None
    c_callDateTime : Optional[str] = None
    c_startTime : Optional[str] = None
    c_endTime : Optional[str] = None
    c_answerTime : Optional[str] = None
    c_duration : Optional[int] = None
    c_talktime : Optional[int] = None
    c_terminationEnd : Optional[str] = None
    c_campaignId : Optional[int] = None
    c_clientIp : Optional[str] = None
    c_clinumberId : Optional[int] = None
    c_clinumberName : Optional[str] = None,
    c_dial_method : Optional[str] = None

    class Config:
        from_attributes=True

class CampaignsModel(BaseModel):

    c_campaignId:  Optional[int] = None
    c_accountId:  Optional[int] = None
    c_accountNo:  Optional[str] = None
    c_campaignName:  Optional[str] = None
    c_campaignStatus:  Optional[str] = None

    class Config:
        from_attributes=True

def currentStart():
    return datetime.now().strftime("%Y-%m-%d 00:00:00")

def currentEnd():
    return datetime.now().strftime("%Y-%m-%d 23:59:59")

class CdrReportFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["c_memberExtensionNo","c_memberPhoneno","c_customerPhoneno","c_disposition","c_direction","c_duration","c_talktime","c_callDateTime"] = "c_callDateTime"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    campaignid : int = Field(default=0)
    calldisposition: Optional[Literal["ANSWERED", "NO ANSWER", "BUSY", "FAILED", "VOICEMAIL", ""]] = None
    calldirection : Optional[Literal["Outbound", "Inbound",""]] = None
    callmode : Optional[Literal["BROWSER", "SOFTPHONE",""]] = None
    dialmethod : Optional[str] = None
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    type : Literal["fetch","export"] = "fetch"
    class Config:
        model_config = {'extra': 'forbid'} 
        
class ProductionReportFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    search: Optional[str] = None
    type : Literal["fetch","export"] = "fetch"
    class Config:
        model_config = {'extra': 'forbid'} 
        
class LoginReportFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    search: Optional[str] = None
    type : Literal["fetch","export"] = "fetch"
    class Config:
        model_config = {'extra': 'forbid'} 

class BreakReportFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    search: Optional[str] = None
    type : Literal["fetch","export"] = "fetch"
    class Config:
        model_config = {'extra': 'forbid'} 


class VoiceReportFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    search: str = Field(default="")
    sortField: Literal["c_customerPhoneno","c_callDateTime"] = "c_callDateTime"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    class Config:
        model_config = {'extra': 'forbid'} 

class VoicemailLogsModel(BaseModel):
    c_logId : Optional[int] = None
    c_accountId : Optional[int] = None
    c_accountNo : Optional[str] = None
    c_callId : Optional[str] = None
    c_customerPhoneno : Optional[int] = None
    c_callDateTime : Optional[str] = None
    
    class Config:
        from_attributes=True

class QueueMissedFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    search: Optional[str] = None
    type : Literal["fetch","export"] = "fetch"
    class Config:
        model_config = {'extra': 'forbid'} 

class MissedCallsFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    search: Optional[str] = None
    type : Literal["fetch","export"] = "fetch"
    class Config:
        model_config = {'extra': 'forbid'} 

class MailAutomationCreateRequest(BaseModel):
    name: str = Field(..., max_length=255)
    reportName: str = Field(..., max_length=100)
    schedule: str  # Daily, Weekly, etc.
    time: str      # HH:MM
    day: Optional[str] = ""
    dataRange: Optional[str] = ""  # previous_day, month_to_date
    toEmail: str
    ccEmail: Optional[List[str]] = []
    extensionFilter: Optional[List[Any]] = []
    timezoneFilter: Optional[str] = ""
    fieldsFilter: Optional[List[Any]] = []
    
    class Config:
        model_config = {'extra': 'forbid'}

class MailAutomationUpdateRequest(BaseModel):
    name: str = Field(..., max_length=255)
    reportName: str = Field(..., max_length=100)
    schedule: str  # Daily, Weekly, etc.
    time: str      # HH:MM
    day: Optional[str] = ""
    dataRange: Optional[str] = ""  # previous_day, month_to_date
    toEmail: str
    ccEmail: Optional[List[str]] = []
    extensionFilter: Optional[List[Any]] = []
    timezoneFilter: Optional[str] = ""
    fieldsFilter: Optional[List[Any]] = []
    status: str = Field("ACTIVE")
    
    class Config:
        model_config = {'extra': 'forbid'}

class MailAutomationFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    
    class Config:
        model_config = {'extra': 'forbid'}

class MailAutomationResponse(BaseModel):
    ma_id: int
    ma_accountId: int
    ma_accountNo: str
    ma_name: str
    ma_reportName: str
    ma_schedule: str
    ma_time: str
    ma_day: Optional[str]
    ma_dataRange: Optional[str]
    ma_toEmail: str
    ma_ccEmail: Optional[List[str]]
    ma_extensionFilter: Optional[List[Any]]
    ma_timezoneFilter: Optional[str]
    ma_fieldsFilter: Optional[List[Any]]
    ma_status: str
    ma_createdOn: datetime

    class Config:
        from_attributes = True 
        
class CdrReportFetchRequestWebhook(BaseModel):
    unique_call_identifier:str


class OneDriveResponse(BaseModel):
    od_id : Optional[int] = None
    od_accountId : Optional[int] = None
    od_accountNo : Optional[str] = None
    od_tenantId : Optional[str] = None
    od_clientId : Optional[str] = None
    od_clientSecret : Optional[str] = None
    od_refresh_token : Optional[str] = None
    class Config:
        from_attributes=True

class SmsDLRReportFetchRequest(BaseModel):
    limit: int = Field(10, gt=0)
    offset: int = Field(0, ge=0)
    search: Optional[str] = ""
    sortField: Optional[str] = "activityTimestamp"
    sortOrder: Optional[Literal["ASC", "DESC", "asc", "desc"]] = "DESC"
    status: Optional[str] = ""
    direction: Optional[str] = ""
    fromDate: Optional[str] = None
    toDate: Optional[str] = None
    channel: str = "SMS"
    export: Optional[bool] = False
    class Config:
        model_config = {'extra': 'allow'}