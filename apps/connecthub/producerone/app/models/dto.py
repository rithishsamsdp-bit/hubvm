from pydantic import BaseModel,EmailStr,Field,model_validator
from datetime import datetime
from typing import Optional
from typing import Optional,Annotated,Self,Literal
from typing import Optional, Dict, Any, List


class MemberPlansModel(BaseModel):
    m_memberplanId : Optional[int] = None
    m_memberId : Optional[int] = None
    m_memberplanDetails : Optional[dict] = None

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

class MembersRelationshipModel(BaseModel):
    m_memberId : Optional[int] = None
    m_accountId : Optional[int] = None
    m_accountNo : Optional[str] = None
    m_accountCode : Optional[str] = None
    m_memberName : Optional[str] = None
    m_memberPassword : Optional[str] = None
    m_memberPasswordHash : Optional[str] = None
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
        arbitrary_types_allowed = True

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

class LoginRequest(BaseModel):
    accountcode: str
    membername: str
    memberpassword: str

class custOnboarding(BaseModel):
    a_accountName: str
    a_accountCode: str
    a_salesRepName: str
    a_accountContactNo: Annotated[str, Field(..., pattern=r'^[789]\d{9}$')]
    a_accountMailId: EmailStr
    a_accountDomainId: str
    a_accountBusinessVertical: str
    a_planName: Literal["Basic", "Professional", "Enterprise"]
    
    @model_validator(mode="after")
    def checkCompanyexist(self) -> Self:
        a_accountName = self.a_accountName
        a_accountCode = self.a_accountCode
        a_accountMailId = self.a_accountMailId
        
        onboard_repo.val_companyName(a_accountName, "onedb")
        onboard_repo.val_companycode(a_accountCode, "onedb")
        onboard_repo.val_maiilid(a_accountMailId, "onedb")
        return self

class validatecompanycode(BaseModel):
    value: str
    valType: str
    @model_validator(mode="after")
    def checkCompanycodAlreadyexist(self) -> Self:
        value = self.value
        valType = self.valType
        print(valType)
        if valType == 'CCODE':
            onboard_repo.val_companycode(value, "onedb")
        elif valType == 'CEMAIL':
            onboard_repo.val_maiilid(value, "onedb")
        elif valType == 'CNAME':
            onboard_repo.val_companyName(value, "onedb")
        return self

class LivemonitorRequest(BaseModel):
    key: Optional[str] = None
    value: Dict[str, Any]
    
class LiveMonitoringSchema(BaseModel):
    l_memberAccountId: int
    l_memberAccountNo: str
    l_membermemberId: Optional[int]
    l_memberExtention: str
    l_memberName: Optional[str]
    l_readyStatus: Optional[str] = None
    l_inboundTotal: int
    l_inboundAnswered: int
    l_inboundUnAnswered: int
    l_outboundTotal: int
    l_outboundAnswered: int
    l_outboundUnAnswered: int
    l_memberCampaignId: Optional[int]
    l_memberCampaignName: Optional[str]
    l_memberCustomerNumber: str
    l_memberCliNumberId: Optional[int]
    l_memberCallDirection: str
    l_memberuuid: Optional[str]
    l_memberStatus: str
    l_memberServerIp: str
    l_memberLastUpdated: str

    class Config:
        orm_mode = True

class LiveMonitoringMetric(BaseModel):
    l_memberExtention: int
    l_inboundTotal: int
    l_inboundAnswered: int
    l_inboundUnAnswered: int
    l_outboundTotal: int
    l_outboundAnswered: int
    l_outboundUnAnswered: int

    class Config:
        orm_mode = True

class LiveMonitoringMetricMain(BaseModel):
    ml_inboundTotal: int
    ml_inboundAnswered: int
    ml_inboundUnAnswered: int
    ml_outboundTotal: int
    ml_outboundAnswered: int
    ml_outboundUnAnswered: int
    ml_totalTalkTime: float
    ml_totalAnsweredCalls: int
    ml_avgTalkTime: float
    ml_inboundMissed: Optional[int] = 0
    ml_outboundMissed: Optional[int] = 0
    ml_inboundDuration: Optional[float] = 0.0
    ml_outboundDuration: Optional[float] = 0.0
    ml_inboundMaxDuration: Optional[float] = 0.0
    ml_outboundMaxDuration: Optional[float] = 0.0
    ml_inboundAvgTalkTime: Optional[float] = 0.0
    ml_outboundAvgTalkTime: Optional[float] = 0.0
    ml_inboundRepeatCalls: Optional[int] = 0
    ml_outboundRepeatCalls: Optional[int] = 0
    ml_callbackRequests: Optional[int] = 0
    ml_inboundRepeatCallsPercent: Optional[float] = 0.0
    ml_outboundRepeatCallsPercent: Optional[float] = 0.0
    ml_inboundPeakHour: Optional[str] = "0"
    ml_outboundPeakHour: Optional[str] = "0"

    class Config:
        orm_mode = True


class MemberStatusCount(BaseModel):
    l_memberStatus: Optional[str]
    count: int


class livemonitorcallsrequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    
class livemonitorforcelogutrequest(BaseModel):
    extention: Any
    activeToken: Optional[str] = None
    memberId: Optional[int] = None