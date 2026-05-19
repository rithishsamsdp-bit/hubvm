from pydantic import BaseModel,EmailStr,Field,model_validator
from datetime import datetime
from typing import Optional
from typing import Optional,Annotated,Self,Literal
from typing import List, Optional, Dict, Any
from pydantic.config import ConfigDict
from decimal import Decimal

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
    accountserviceregion: Literal["Domestic", "International", "International-mid"]
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


class BillingCreate(BaseModel):
    b_billingAccountId: int
    b_billingAccountNO: Optional[str] = None   # ✅ ADD THIS
    b_billingAccountName: Optional[str] = None # ✅ ADD THIS
    b_credit_balance: float = 0
    b_billing_status: str = "enable"
    b_rate_per_min: float = 1
    b_billing_pulse: int = 30
    b_billing_type: str = "prepaid"
    b_billingDescription: str

    model_config = ConfigDict(from_attributes=True)

class BillingConfigList(BaseModel):
    b_billingId: int
    b_billingAccountId: int | None = None
    b_billingAccountNO: str | None = None
    b_billingAccountName: str | None = None

    b_credit_balance: float | None = None
    b_billing_status: str | None = None
    b_rate_per_min: float | None = None
    b_billing_pulse: int | None = None
    b_billing_type: str | None = None

    b_billingDescription: str | None = None

    b_billingCreatedOn: datetime | None = None
    b_billingUpdatedOn: datetime | None = None
    b_billing_whocredit_AccountId: int | None = None

    class Config:
        from_attributes = True


class BillingConfigListResponse(BaseModel):
    recordsTotal: int   # ✅ ADD THIS
    data: List[BillingConfigList]

class BillingConfigListSelectModel(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = ""

    sortField: Literal[
        "b_billingId",
        "b_billingAccountId",
        "b_billingAccountNO",
        "b_billingAccountName",
        "b_credit_balance",
        "b_billing_status",
        "b_rate_per_min",
        "b_billing_pulse",
        "b_billing_type",
        "b_billingCreatedOn"
    ] = "b_billingCreatedOn"

    sortOrder: Literal["ASC", "DESC"] = "DESC"

class BillingUpdate(BaseModel):
    b_rate_per_min: Optional[float] = None
    b_billing_pulse: Optional[int] = None
    b_billing_type: Optional[str] = None
    b_billing_status: Optional[str] = None
    b_billingDescription: Optional[str] = None

class BillingHistoryCreate(BaseModel):
    b_creditAccountId: int
    b_creditAccountName: Optional[str] = None
    b_credit_balance: float
    b_tds_percent: Optional[float] = 0
    b_gst_percent: Optional[float] = 18
    b_creditDescription: Optional[str] = None
    b_paymentDoneBy: str

    model_config = {
        "from_attributes": True
    }



class BillingHistoryResponse(BaseModel):
    b_historyId: int
    b_creditAccountId: int
    b_creditAccountName: Optional[str]
    b_credit_balance: Decimal
    b_gst_amount: Optional[Decimal]
    b_total_amount: Optional[Decimal]
    b_creditCreatedOn: datetime

    model_config = {
        "from_attributes": True
    }

class BillingHistoryList(BaseModel):
    b_creditAccountId: int
    b_creditAccountName: str | None = None
    b_creditDescription: str | None = None
    b_credit_balance: float | None = None
    b_gst_percent: float | None = None
    b_gst_amount: float | None = None
    b_tds_percent: float | None = None
    b_tds_amount: float | None = None
    b_total_amount: float | None = None
    b_whoCredit: str | None = None
    b_transaction_id: str | None = None
    b_paymentDoneBy: str | None = None
    b_creditCreatedOn: datetime | None = None

    class Config:
        from_attributes = True


class BillingHistoryListResponse(BaseModel):
    recordsTotal: int
    data: List[BillingHistoryList]

class BillingHistoryListSelectModel(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = ""
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    sortField: Literal[
        "b_creditAccountId",
        "b_creditAccountName",
        "b_credit_balance",
        "b_gst_percent",
        "b_gst_amount",
        "b_tds_percent",
        "b_tds_amount",
        "b_total_amount",
        "b_creditCreatedOn",
        "b_whoCredit",
        "b_transaction_id",
        "b_paymentDoneBy"
    ] = "b_creditCreatedOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"


