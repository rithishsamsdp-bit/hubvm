from pydantic import BaseModel,EmailStr,Field,model_validator
from datetime import datetime
from typing import Optional
from typing import Optional,Annotated,Self,Literal
from typing import List, Optional, Dict, Any

class AccountsModel(BaseModel):
    a_accountId : Optional[int] = None
    a_accountNo : Optional[str] = None
    a_accountName : Optional[str] = None
    a_accountCode : Optional[str] = None
    a_accountEncryption : Optional[str] = None
    a_accountDomainId : Optional[str] = None
    a_accountMailId : Optional[str] = None
    a_accountContactNo : Optional[str] = None
    a_accountBusinessVertical : Optional[str] = None
    a_accountServiceRegion : Optional[str] = None
    a_accountPrefix : Optional[int] = None
    a_salesRepName : Optional[str] = None
    a_accountTimeZone : Optional[str] = None    
    a_planName : Optional[str] = None
    a_planDetails : Optional[dict] = None

    class Config:
        from_attributes=True

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
    a_accountServiceRegion: Optional[str] = None
    a_accountTimeZone: Optional[str] = None
    t_teamMemberExtensionNo: Optional[List[int]] = None

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
    m_member2FAStatus : Optional[str] = None
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
    a_accountTimeZone : Optional[str] = None

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

class OTPGenerateRequest(BaseModel):
    memberdetails: MembersModel
    authenticationtype: str

class OTPVerifyRequest(BaseModel):
    memberdetails: MembersModel
    otp: str

class RefreshResponse(BaseModel):
    message: str
    data: MembersModel

class FCMTokenAssociateRequest(BaseModel):
    fcmtoken: str
    memberid: str

class FCMTokenAssociateResponse(BaseModel):
    message: str

class AccountCreateRequest(BaseModel):
    accountname: str
    accountcode: str
    salesrepname: str
    accountcontactno: Annotated[str, Field(..., pattern=r'^[123456789]\d{9}$')]
    accountmailid: EmailStr
    accountdomainid: str
    accountbusinessvertical: str
    accountTimeZone: Optional[str] = None  
    accountserviceregion: Literal["Domestic", "International", "International-mid", "Domestic-mid"]
    planname: Literal["Basic", "Professional", "Enterprise"]

class AccountFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["a_accountName", "a_accountCode", "a_accountDomainId", "a_accountId"] = "a_accountId"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    class Config:
        model_config = {'extra': 'forbid'}

class AccountDetailsRequest(BaseModel):
    accountid: int
    
class UpdateAccountDetailsRequest(BaseModel):
    accountId: int
    accounttimezone: str
    planDetails: Optional[Dict[str, Any]] = None
    
class CompanyUsersRequest(BaseModel):
    accountid: int
    limit: int = Field(default=1000, gt=0)
    offset: int = Field(default=0, ge=0)
    searchString: str = Field(default="")
    sortField: Optional[str] = "m_createdOn"
    sortOrder: Optional[str] = "DESC"

class ValidateAccountRequest(BaseModel):
    accountname: str | None = None
    accountcode: str



class SamlSyncRequest(BaseModel):
    tenantId: str
    clientId: str
    clientSecret: str
    appObjectId: str
    accountId: int


class SamlAssignedUser(BaseModel):
    id: str
    name: str
    email: str


class SamlAssignedGroup(BaseModel):
    id: str
    name: str
    members: List[SamlAssignedUser]


class SamlSyncData(BaseModel):
    appObjectId: str
    directUsers: List[SamlAssignedUser]
    groups: List[SamlAssignedGroup]


class SamlSyncResponce(BaseModel):
    message: str
    data: SamlSyncData

class IpCreateRequest(BaseModel):
    accountId: int
    ip: str
    label: str
    type: Literal["Allow", "Block"]

class IpListRequest(BaseModel):
    accountId: int
    limit: int = Field(100, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Optional[str] = "s_createdOn"
    sortOrder: Optional[str] = "DESC"

class IpDeleteRequest(BaseModel):
    id: int
    accountId: int

