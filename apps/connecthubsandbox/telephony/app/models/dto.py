from pydantic import Field, EmailStr, BaseModel, validator, model_validator, field_validator, conint
from datetime import datetime
from typing import Optional, List, Literal, Union, Dict, Any
from typing_extensions import Self
from pydantic.config import ConfigDict
from enum import Enum
import re
from fastapi import APIRouter, Query, Form, Path, status, Response, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime
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

class AccountsModel(BaseModel):
    a_accountId: Optional[int] = None
    a_accountNo: Optional[str] = None
    a_accountName: Optional[str] = None

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
    m_readyStatus : Optional[str] = None
    m_status : Optional[str] = None

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

class BlackListSelectModel(BaseModel):
    limit: int = Field(1000, gt=0, description="Number of records to fetch (max 1000 recommended)")
    offset: int = Field(0, ge=0, description="Records to skip for pagination")
    searchString: str = Field(default="", description="Search term for name, phoneNumber")
    sortField: Literal["p_blacklistAccountId", "p_blacklistAccountNO", "p_blacklistNo", "p_blacklistDescription", "p_blacklistCalltype", "p_blacklistStatus", "p_blacklistCreatedOn"] = "p_blacklistCreatedOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"

class BlockListList(BaseModel):
    p_blacklistId : Optional[int] = None
    p_blacklistAccountId: Optional[int] = None
    p_blacklistAccountNO: Optional[str] = None
    p_blacklistNo : Optional[int] = None
    p_blacklistDescription: Optional[str] = None
    p_blacklistCalltype: Optional[str] = None
    p_blacklistStatus : Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class BlockListResponse(BaseModel):
    recordsTotal: int
    data: List[BlockListList]  # Assuming ContactOut is another Pydantic model

    class Config:
        from_attributes = True

class CLINumbersModel(BaseModel):
    c_clinumberId : Optional[int] = None
    a_accountId : Optional[int] = None
    a_accountNo : Optional[str] = None
    a_accountName : Optional[str] = None
    a_accountPrefix : Optional[int] = None
    c_clinumberName : Optional[str] = None
    c_clinumberType : Optional[str] = None
    c_clinumberCountryCode : Optional[str] = None
    c_clinumberCountryName : Optional[str] = None
    c_clinumberStatus : Optional[str] = None
    c_clinumbermapName : Optional[str] = None
    c_callflowId : Optional[int] = None
    c_callflowName : Optional[str] = None
    c_apiIntegration : Optional[str] = None
    c_smsMode: Optional[str] = None
    p_peerId : Optional[int] = None
    p_peerName : Optional[str] = None

    class Config:
        from_attributes=True

class CallFlowsModel(BaseModel):
    c_callflowId : Optional[int] = None
    c_accountId : Optional[int] = None
    c_accountNo : Optional[str] = None
    c_callflowName : Optional[str] = None
    c_callflowData : Optional[dict] = None

    class Config:
        from_attributes=True

class PeersModel(BaseModel):
    p_peerId: int
    p_peerName: str
    p_peerSecret: str
    p_peerHost: str
    p_peerPrefix: int
    p_peerPort: int
    p_peerType: str
    p_peerStatus: str

    class Config:
        from_attributes=True

class QueueCreateRequest(BaseModel):
    queue_name: str = Field(..., min_length=1, description="Queue name must not be empty.")
    strategy: str = Field(..., min_length=1, description="strategy must not be empty.")
    membername: List[str]
    timeout: int = Field(..., gt=0, description="Timeout must be greater than 0.")        
    
class QueueUpdateRequest(BaseModel):
    queue_name: str = Field(..., min_length=1, description="Queue name must not be empty.")
    strategy: str = Field(..., min_length=1, description="strategy must not be empty.")
    membername: List[str]
    timeout: int = Field(..., gt=0, description="Timeout must be greater than 0.")
    queue_id: int = Field(..., gt=0, description="Queue ID must be greater than 0.")
    
class QueueDeleteRequest(BaseModel):
    queue_id: int = Field(..., gt=0, description="Queue ID must be greater than 0.")
  



class HolidayModel(BaseModel):
    name: str
    start_date: str
    end_date: str
    msg_enable: Optional[str] = None
    message: Optional[str] = None
    audio_enable: Optional[str] = None
    audio_name: Optional[str] = None
    
class HolidayCreateRequest(BaseModel):
    name: str
    start_date: str
    end_date: str
    msg_enable: str
    message: str
    audio_enable: str
    audio_name: str
    
class HolidayUpdateRequest(BaseModel):
    name: str
    start_date: str
    end_date: str
    msg_enable: str
    message: str
    audio_enable: str
    audio_name: str
    
class HolidayDeleteRequest(BaseModel):
    name: str

### Business Hours Configuration Models ###

class HourModel(BaseModel):
    display_name : Optional[str]=None
    day_name : Optional[str]=None
    time_from : Optional[str]=None
    time_to : Optional[str]=None
    
class TimeModel(BaseModel):
    time_from: str
    time_to: str

class DayModel(BaseModel):
    day_name: str
    times: List[TimeModel]

class ShiftCreateRequest(BaseModel):
    display_name: str
    days: List[DayModel]
    
class ShiftDeleteRequest(BaseModel):
    display_name : str

class HourCreateRequest(BaseModel):
    display_name: str
    day_name: str
    times: List[TimeModel]
    
class HourDeleteRequest(BaseModel):
    display_name: str
    day_name: str
    time_from: str
    time_to: str

### Contacts Model ###
class ContactCreateRequest(BaseModel):
    c_Name: str
    c_phoneNumber: str
    c_countryCode: str
    c_mailId: EmailStr             
    c_organizationName: Optional[str] = None        
    c_address: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_all_fields(self) -> Self:
        print(self)
        if not self.c_Name or not self.c_Name.strip():
                raise ValueError("Name cannot be empty")
            
        # Validate c_phoneNumber
        if not self.c_phoneNumber.isdigit():
            raise ValueError('Phone number must contain only digits')
        
        # Validate c_mailId (even though EmailStr validates basic format)
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_pattern, str(self.c_mailId)):
            raise ValueError("Invalid email address format")
        if not str(self.c_mailId).strip():
            raise ValueError("Email cannot be empty")
        
        # Require at least one optional field
        if not self.c_organizationName and not self.c_address:
            raise ValueError("At least one of 'c_organizationName' or 'c_address' must be provided")
        return self
        
    class Config:
        from_attributes = True

class ContactUpdateModel(BaseModel):
    c_Id: int
    c_Name: str
    c_countryCode: str
    c_phoneNumber: str
    c_mailId: EmailStr
    c_organizationName: Optional[str] = None
    c_address: Optional[str] = None

    @field_validator('c_phoneNumber')
    def validate_phone(cls, v):
        if not v.isdigit():
            raise ValueError('Phone number must contain only digits')
        return v

    class Config:
        from_attributes = True
        populate_by_name = True  # Useful if DB column names differ
        json_schema_extra = {
            "example": {
                "c_Id": 1,
                "c_Name": "John Doe",
                "c_phoneNumber": "9876543210",
                "c_mailId": "john.doe@example.com",
                "c_organizationName": "Example Corp",
                "c_address": "123, Example Street, City"
            }
        }

class ContactDeleteModel(BaseModel):
    c_Id: int
    
class ContactSelectModel(BaseModel):
    limit: int = Field(1000, gt=0, description="Number of records to fetch (max 1000 recommended)")
    offset: int = Field(0, ge=0, description="Records to skip for pagination")
    searchString: str = Field(default="", description="Search term for name, phone, or email")
    sortString: str = Field(default="", description="Field to sort by, optionally with direction (e.g., 'name ASC')")
    sortField: Literal["c_Name", "c_phoneNumber", "c_mailId", "c_createdOn"] = "c_createdOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"


class ContactlistSelectModel(BaseModel):
    limit: int = Field(1000, gt=0, description="Number of records to fetch (max 1000 recommended)")
    offset: int = Field(0, ge=0, description="Records to skip for pagination")
    searchString: str = Field(default="", description="Search term for name, phone, or email")


class Contactlist(BaseModel):
    c_id: int
    c_Name: str
    c_phLogin: str
    c_phoneNumber: str
    c_countryCode: str
    c_mailId: str
    c_organizationName: Optional[str] = None
    c_address: Optional[str] = None
    c_createdByName: Optional[str] = None
    c_createdOn: datetime
    c_updatedOn: datetime

    model_config = ConfigDict(from_attributes=True)

class ContactResponse(BaseModel):
    draw: int
    recordsTotal: int
    data: List[Contactlist]  # Assuming ContactOut is another Pydantic model

    class Config:
        from_attributes = True


class ContactValidationRequest(BaseModel):
    vtype: str = Field(..., description="The type of validation, e.g., 'phoneNumber'")
    vvalue: str = Field(..., description="The value to validate, e.g., a phone number")
    c_id: Optional[int] = None

    class Config:
        model_config = {
            "extra": "forbid"
        }

class ContactHistoryRequest(BaseModel):
    phoneno: str
    countrycode: str
    class Config:
        model_config = {'extra': 'forbid'}

class ContactHistoryResponse(BaseModel):
    message: str
    data: dict

class PeerCreateRequest(BaseModel):
    peername: str
    peersecret: str
    peerhost: str
    peerport: str
    peerprefix: str
    peerpilotno: str
    peeroutboundprefix: str
    peerinboundprefix: str
    proxyid: str
    proxyname: str
    proxyipaddress: str
    proxydirectoryname: str
    class Config:
        model_config = {'extra': 'forbid'}

class PeerCreateResponse(BaseModel):
    message: str

# class PeerUpdateRequest(BaseModel):
#     p_peerId : int
#     p_peerName : str
#     p_peerSecret : str
#     p_peerHost : str
#     p_peerPrefix : int
#     p_peerPort : int
#     p_peerType : Literal["domestic", "international"] = "domestic"
#     p_peerStatus : Literal["Active", "Inactive"] = "Active"
#     p_peerPilotno: str
#     p_peerOutboundPrefix: str
#     p_peerInboundPrefix: str
    
#     class Config:
#         model_config = {'extra': 'forbid'}
    
class PeerDeleteRequest(BaseModel):
    peerid : str
    class Config:
        model_config = {'extra': 'forbid'}

class PeerDeleteResponse(BaseModel):
    message: str

class PeerFetchRequest(BaseModel):
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    sortField: Literal["p_peerName", "p_peerHost", "p_peerPort", "p_peerPilotno", "p_createdOn"] = "p_createdOn"
    searchString: str = Field(default="")
    offset: int = Field(0, ge=0)
    limit: int = Field(1000, gt=0)

class PeerFetchResponse(BaseModel):
    message: str
    class Peer(BaseModel):
        p_peerId: Optional[int] = None
        p_peerName: Optional[str] = None
        p_peerSecret: Optional[str] = None
        p_peerHost: Optional[str] = None
        p_peerPort: Optional[str] = None
        p_peerPrefix: Optional[str] = None
        p_peerPilotno: Optional[str] = None
        p_peerOutboundPrefix: Optional[str] = None
        p_peerInboundPrefix: Optional[str] = None
        p_proxyId: Optional[str] = None
        p_proxyName: Optional[str] = None
        class Config:
            from_attributes = True
    class Data(BaseModel):
        totalRecordsCount: int
        totalRecords: List["PeerFetchResponse.Peer"]
    data: Data

# class Peerlistdropdown(BaseModel):
#     p_peerId: int
#     p_peerName: str

#     model_config = ConfigDict(from_attributes=True)

# class PeervalidationModel(BaseModel):
#     vtype: str = Field(..., description="The type of validation, e.g., 'Username'")
#     vvalue: str = Field(..., description="The value to validate, e.g., a Username")
#     p_peerId: Optional[int] = None

#     class Config:
#         model_config = {
#             "extra": "forbid"
#         }
    
class WhatsappPeerCreateRequest(BaseModel):
    peername: str
    peersecret: str
    peerhost: str
    peerport: str
    proxyid: str
    proxyname: str
    proxyipaddress: str
    proxydirectoryname: str
    class Config:
        model_config = {'extra': 'forbid'}

class WhatsappPeerCreateResponse(BaseModel):
    message: str

class WhatsappPeerDeleteRequest(BaseModel):
    peerid : str
    class Config:
        model_config = {'extra': 'forbid'}

class WhatsappPeerDeleteResponse(BaseModel):
    message: str


class WhatsappPeerFetchRequest(BaseModel):
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    sortField: Literal["p_peerName", "p_peerHost", "p_peerPort", "p_peerPilotno", "p_createdOn"] = "p_createdOn"
    searchString: str = Field(default="")
    offset: int = Field(0, ge=0)
    limit: int = Field(1000, gt=0)

class WhatsappPeerFetchResponse(BaseModel):
    message: str
    class Peer(BaseModel):
        p_peerId: Optional[int] = None
        p_peerName: Optional[str] = None
        p_peerSecret: Optional[str] = None
        p_peerHost: Optional[str] = None
        p_peerPort: Optional[str] = None
        p_peerPrefix: Optional[str] = None
        p_peerPilotno: Optional[str] = None
        p_peerOutboundPrefix: Optional[str] = None
        p_peerInboundPrefix: Optional[str] = None
        p_proxyId: Optional[str] = None
        p_proxyName: Optional[str] = None
        class Config:
            from_attributes = True
    class Data(BaseModel):
        totalRecordsCount: int
        totalRecords: List["WhatsappPeerFetchResponse.Peer"]
    data: Data

class ServerReachabilityRequest(BaseModel):
    peerhost: str
    class Config:
        model_config = {'extra': 'forbid'}

class ServerReachabilityResponse(BaseModel):
    message: str

class CLINumberCreateRequest(BaseModel):
    accountid: Optional[int] = None
    accountno: Optional[str] = None
    accountprefix: Optional[int] = None
    clinumbername: str
    clinumbertype: Literal["Tollfree", "Prepaid", "Unlimited"]
    clinumbercountrycode: str
    clinumbercountryname: str
    clinumberstatus: Literal["Active", "Inactive"]
    peerid: int
    class Config:
        model_config = {'extra': 'forbid'}

class CLINumberUpdateRequest(BaseModel):
    clinumberid: int
    accountid: Optional[int] = None
    accountno: Optional[str] = None
    accountprefix: Optional[int] = None
    clinumbername: str
    clinumbertype: Literal["Tollfree", "Prepaid", "Unlimited"]
    clinumbercountrycode: str
    clinumbercountryname: str
    clinumberstatus: Literal["Active", "Inactive"]
    peerid: int
    
class CLINumberDeleteRequest(BaseModel):
    clinumberid: int

class CLINumberFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["c_accountId", "c_accountNo", "c_clinumberName", "c_clinumberType", "c_clinumberCountryCode", "c_clinumberCountryName", "c_cliStatus", "c_peerId", "c_createdOn"] = "c_createdOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"

# class APISetting(BaseModel):
#     apiType: str
#     apiURL: str
#     method: str
#     jsonBody: Optional[dict] = None

class ExternalIntegrationAPIRequest(BaseModel):
    integrationapiname: str
    integrationapitriggerevent: str
    integrationapiendpoint: str
    integrationapimethod: Literal["GET", "POST", "PUT", "DELETE"]
    integrationapiheader: Optional[Dict[str, Any]] = {}
    integrationapiqueryparams: Optional[Dict[str, Any]] = {}
    
class SMSMember(BaseModel):
    memberextensionno: str
    membername: str
    memberid: int
    m_smsMode: Optional[str] = "WEB"
    
class CLINumberMapRequest(BaseModel):
    clinumbername: str
    clinumberid: int
    clinumbermapname: str
    callflowid: Optional[int] = None
    callflowname: Optional[str] = None
    apiIntegration: Optional[Literal["Enable", "Disable"]] = "Disable"
    memberids : List[int]
    smsmembers: List[SMSMember] = []
    apis: Optional[List[ExternalIntegrationAPIRequest]] = []

    @field_validator('callflowid', mode='before')
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v
    
class CLINumberGetRequest(BaseModel):
    clinumberid: int

class ProcessCreateRequest(BaseModel):
    didGroupName: str = Field(..., min_length=1, description="Process name must not be empty.")
    cliID: List[int] = Field(..., min_items=1, description="cliID must be a non-empty list of integers.")    
    
class ProcessUpdateRequest(BaseModel):
    didnumberGroupId: int = Field(..., ge=1, le=9223372036854775807)  # SQL BIGINT range
    didGroupName: str = Field(..., min_length=1, description="Process name must not be empty.")
    cliID: List[int] = Field(..., min_items=1, description="cliID must be a non-empty list of integers.")
    activeStatus: int = Field(..., ge=0, le=1, description="Active status must be 0 or 1.")
    
class ProcessDeleteRequest(BaseModel):
    didnumberGroupId: int = Field(..., ge=1, le=9223372036854775807)  # SQL BIGINT range        

class Role(str, Enum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    TL = "TL"
    USER = "USER"

class MemberMode(str, Enum):
    BROWSER = "BROWSER"
    SOFTPHONE = "SOFTPHONE"

class PlatformType(str, Enum):
    CALLCENTER = "CALLCENTER"
    RCM = "RCM"


class CallerIdMode(str, Enum):
    YES = "YES"
    NO = "NO"
    
class MemberSuperRequestModel(BaseModel):
    m_accountId:int
    m_memberName: str
    m_memberPassword: Optional[str] = "Pulse@TPL"
    m_memberRole: Role = Role.USER
    m_memberCallerIdMode: Optional[CallerIdMode] = None
    m_memberCallerId: Optional[int] = None
    m_memberMobileNo: int
    m_memberMailId: Optional[str] = None
    m_memberMode: MemberMode = MemberMode.BROWSER
    m_memberPlatformType: PlatformType = PlatformType.CALLCENTER
    m_memberPasswordHash: Optional[str] = None
    class Config:
        use_enum_values = True

class MemberSuperBatchRequestModel(BaseModel):
    users: List[MemberSuperRequestModel]

class MemberRequestModel(BaseModel):
    m_accountId: Optional[int] = None
    m_memberName: str
    m_memberPassword: str
    m_memberExtensionNo:  Optional[str] = None
    m_memberRole: Role = Role.USER
    m_memberCallerIdMode: Optional[CallerIdMode] = None
    m_memberCallerId: Optional[int] = None
    m_memberMobileNo: Optional[int] = None
    m_memberMailId: Optional[str] = None
    m_memberMode: MemberMode = MemberMode.BROWSER
    m_memberPlatformType: PlatformType = PlatformType.CALLCENTER
    m_memberPasswordHash: Optional[str] = None
    class Config:
        use_enum_values = True

class MemberBatchRequestModel(BaseModel):
    users: List[MemberRequestModel]

class MembervalidationModel(BaseModel):
    vtype: str = Field(..., description="The type of validation, e.g., 'MemberName','emailid'")
    vvalue: str = Field(..., description="The value to validate, e.g., a MemberName, 'emailid'")
    c_clinumberId: Optional[int] = None
    

    class Config:
        model_config = {
            "extra": "forbid"
        }
        
class MemberUpdateModel(BaseModel):
    m_memberId: int
    m_memberName: str
    m_memberPassword: Optional[str] = "Pulse@TPL"
    m_memberRole: Role = Role.USER
    m_memberCallerIdMode: Optional[CallerIdMode] = None
    m_memberCallerId: Optional[int] = None
    m_memberMobileNo: int
    m_memberMailId: EmailStr
    m_memberMode: MemberMode = MemberMode.BROWSER
    m_memberPlatformType: PlatformType = PlatformType.CALLCENTER

    class Config:
        use_enum_values = True

class MemberSuperUpdateModel(BaseModel):
    m_accountId:int
    m_memberId: int
    m_memberName: str
    m_memberPassword: Optional[str] = "Pulse@TPL"
    m_memberRole: Role = Role.USER
    m_memberCallerIdMode: Optional[CallerIdMode] = None
    m_memberCallerId: Optional[int] = None
    m_memberMobileNo: int
    m_memberMailId: EmailStr
    m_memberMode: MemberMode = MemberMode.BROWSER
    m_memberPlatformType: PlatformType = PlatformType.CALLCENTER

    class Config:
        use_enum_values = True

class MemberDeleteModel(BaseModel):
    m_memberId: int

class MemberSuperDeleteModel(BaseModel):
    m_memberId: int
    m_accountId:int

    class Config:
        from_attributes = True

class MemberSelectModel(BaseModel):
    limit: int = Field(1000, gt=0, description="Number of records to fetch (max 1000 recommended)")
    offset: int = Field(0, ge=0, description="Records to skip for pagination")
    searchString: str = Field(default="", description="Search term for name, Member")
    sortField: Literal["m_accountNo", "m_accountCode", "m_memberName", "m_memberRole", "m_memberExtensionNo", "m_memberCallerId", "m_memberMobileNo", "m_memberMailId", "m_memberMode","m_memberPlatformType","m_createdOn"] = "m_createdOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    roleFilter: Optional[Literal["","ADMIN", "TL", "USER"]] = ""
    memberMode: Optional[Literal["","BROWSER", "SOFTPHONE"]] = ""
    memberPlatform: Optional[Literal["","CALLCENTER", "RCM"]] = ""
    type:  Literal["fetch","export"] = "fetch"

class Memberlist(BaseModel):
    m_memberId: int
    m_accountId: int
    m_accountNo: str
    m_accountCode: str
    m_memberName: str
    m_memberPassword: str
    m_member2FAStatus: str
    m_memberRole: str
    m_memberExtensionNo: int
    m_memberCallerIdMode: Optional[str]
    m_memberCallerId: Optional[int]
    m_memberMobileNo: Optional[int]
    m_memberMailId: Optional[str]
    m_memberMode: str
    m_memberPlatformType: str
    m_clicktocallType: Optional[str] = None
    m_campaignId:Optional[int]
    
    class Config:
        from_attributes = True  # ✅ This enables from_orm()

class MemberResponse(BaseModel):
    recordsTotal: int
    data: List[Memberlist]  # Assuming ContactOut is another Pydantic model

class MemberGroupCreateRequest(BaseModel):
    membergroupname : str
    memberids : List[int]
    class Config:
        model_config = {'extra': 'forbid'}

class MemberGroupUpdateRequest(BaseModel):
    membergroupid : int
    membergroupname : str
    memberids : List[int]
    class Config:
        model_config = {'extra': 'forbid'}

class MemberGroupDeleteRequest(BaseModel):
    membergroupid : int
    class Config:
        model_config = {'extra': 'forbid'}

class MemberGroupFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["m_membergroupName", "m_membergroupStatus"] = "m_membergroupId"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    class Config:
        model_config = {'extra': 'forbid'}

class DialerType(str, Enum):
    PREDICTIVE = "PREDICTIVE"
    PROGRESSIVE = "PROGRESSIVE"
    PREVIEW = "PREVIEW"
    MANUAL = "MANUAL"

class Disposition(str, Enum):
    NO_ANSWER = "NO_ANSWER"
    BUSY = "BUSY"
    VOICEMAIL = "VOICEMAIL"
    FAILED = "FAILED"
    REJECTED = "REJECTED"
    
class CampaignLimits(BaseModel):
    maxtotalattempts: int
    maxattemptsper_day: int
    campaignlifetimedays: Optional[int] = None
    maxChannels: Optional[int] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

    @field_validator('startDate', 'endDate', mode='before')
    @classmethod
    def empty_string_to_none(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

    @model_validator(mode='after')
    def check_date_order(self) -> Self:
        if self.startDate and self.endDate:
            try:
                start = datetime.strptime(self.startDate, "%Y-%m-%d")
                end = datetime.strptime(self.endDate, "%Y-%m-%d")
                if end < start:
                    raise ValueError("End Date must be after Start Date")
            except ValueError as e:
                if "End Date must be after Start Date" in str(e):
                    raise
                # if parsing fails, it's already an error or we can ignore here as other validators will catch it
        return self

    class Config:
        extra = "forbid"
        
class CallingHours(BaseModel):
    start: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$")

    @model_validator(mode='after')
    def check_time_order(self) -> Self:
        if self.start and self.end:
            try:
                start_time = datetime.strptime(self.start, "%H:%M")
                end_time = datetime.strptime(self.end, "%H:%M")
                if end_time <= start_time:
                    raise ValueError("End Time must be after Start Time")
            except ValueError as e:
                if "End Time must be after Start Time" in str(e):
                    raise
        return self

    class Config:
        extra = "forbid"

class RetryRule(BaseModel):
    enabled: bool
    intervalsminutes: Optional[List[int]] = None

    class Config:
        extra = "forbid"  

class CampaignRules(BaseModel):
    limits: Optional[CampaignLimits]
    callinghours: Optional[CallingHours]
    ratio: Optional[int] = None
    minRatio: Optional[int] = None
    maxRatio: Optional[int] = None
    retryStrategy: Optional[str] = None
    retryrules: Optional[Dict[Disposition, RetryRule]] = None
    Strategy: Optional[str] = None
    wrapupInterval: Optional[int] = None

    class Config:
        extra = "forbid"

class CampaignCreateRequest(BaseModel):
    campaignname : str
    membergroupids : List[int]
    dialerType: Optional[DialerType] = None
    cligroupId : int
    formid : int
    campaignRules: Optional[CampaignRules] = None

    class Config:
        model_config = {'extra': 'forbid'}

class CampaignUpdateRequest(BaseModel):
    campaignid : int
    campaignname : str
    membergroupids : List[int]
    cligroupId : int
    formid : int
    campaignRules: Optional[CampaignRules] = None
    class Config:
        model_config = {'extra': 'forbid'}
        
class CampaignDeleteRequest(BaseModel):
    campaignid : int
    class Config:
        model_config = {'extra': 'forbid'}

class CampaignLeadsRequest(BaseModel):
    campaignid: int
    limit: int = Field(100, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    status: str = Field(default="")
    lastResult: str = Field(default="")
    class Config:
        model_config = {'extra': 'forbid'}

class CampaignLeadsResponse(BaseModel):
    totalCount: int
    answeredCount: int
    noAnswerCount: int
    failedCount: int
    leads: List[dict]

class QueueGroupCreateRequest(BaseModel):
    queuegroupname : str
    queuegroupstrategy : str
    queuegrouptimeout : int
    memberids : List[int]
    memberextensions : List[int]
    agentwaittime : int
    class Config:
        model_config = {'extra': 'forbid'}

class QueueGroupUpdateRequest(BaseModel):
    queuegroupid : int
    queuegroupname : str
    queuegroupstrategy : str
    queuegrouptimeout : int
    memberids : List[int]
    memberextensions : List[int]
    agentwaittime : int
    class Config:
        model_config = {'extra': 'forbid'}

class QueueGroupDeleteRequest(BaseModel):
    queuegroupid : int
    class Config:
        model_config = {'extra': 'forbid'}

class QueueGroupFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["q_queuegroupName", "q_queuegroupStatus"] = "q_queuegroupId"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    class Config:
        model_config = {'extra': 'forbid'}

class CallFlowCreateRequest(BaseModel):
    callflowname: str
    callflowdata: dict
    class Config:
        model_config = {'extra': 'forbid'}

class CallFlowUpdateRequest(BaseModel):
    callflowid: int
    callflowname: str
    callflowdata: dict
    class Config:
        model_config = {'extra': 'forbid'}

class CallFlowDeleteRequest(BaseModel):
    callflowid: int
    callflowname: str
    class Config:
        model_config = {'extra': 'forbid'}

class CallFlowFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["c_accountId", "c_accountNo", "c_callflowId", "c_callflowName", "c_createdOn"] = "c_createdOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"

class CallFlowPreviewRequest(BaseModel):
    content: str
    voiceid: str
    language: str
    engine: str
    class Config:
        model_config = {'extra': 'forbid'}

class UploadFileDeleteRequest(BaseModel):
    filepath: str
    class Config:
        model_config = {'extra': 'forbid'}

class UploadFilePreviewRequest(BaseModel):
    filepath: str
    class Config:
        model_config = {'extra': 'forbid'}

class CallFlowGetRequest(BaseModel):
    callflowid: int
    class Config:
        model_config = {'extra': 'forbid'}

class QueueGroupListResponse(BaseModel):
    message: str
    class QueueGroup(BaseModel):
        q_queuegroupId: Optional[int] = None
        q_queuegroupName: Optional[str] = None
        class Config:
            from_attributes = True
    data: List[QueueGroup]

class FormCreate(BaseModel):
    f_formName: str
    f_formPayload: Dict[str, Any]
    f_formcolumnName: str

    class Config:
        extra = 'forbid'

class FormUpdate(BaseModel):
    f_formName: str
    f_formPayload: Dict[str, Any]
    f_formcolumnName: str

    class Config:
        extra = 'forbid'

class FormDelete(BaseModel):
    f_formId: int

class FormSelect(BaseModel):
    limit: int = Field(1000, gt=0, description="Number of records to fetch (max 1000 recommended)")
    offset: int = Field(0, ge=0, description="Records to skip for pagination")
    searchString: str = Field(default="", description="Search term for name, FormName")
    sortField: Literal["f_formName", "f_createdOn"] = "f_createdOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"

class FormList(BaseModel):
    f_formId: Optional[int] = None
    f_formName: str
    f_formPayload: Dict[str, Any]
    f_formcolumnName: str
    f_createdOn: datetime

    model_config = ConfigDict(from_attributes=True)

class FormListName(BaseModel):
    f_formId: int
    f_formName: str

    model_config = ConfigDict(from_attributes=True)
    
class campaignFetchRequest(BaseModel):
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    sortField: Literal["c_campaignName",  "c_createdOn"] = "c_createdOn"
    searchString: str = Field(default="", description="Search term for Trunk")
    offset: int = Field(0, ge=0, description="Records to skip for pagination")
    limit: int = Field(1000, gt=0, description="Number of records to fetch (max 1000 recommended)")

class CampaignForm(BaseModel):
    campid: int
    model_config = ConfigDict(from_attributes=True)

class CLINumberGetResponse(BaseModel):
    message: str
    class Member(BaseModel):
        m_memberId: Optional[int] = None
        m_memberName: Optional[str] = None
        class Config:
            from_attributes = True
    
    class API(BaseModel):
        apiType: Optional[str] = None
        apiURL: Optional[str] = None
        method: Optional[str] = None
        jsonBody: Optional[dict] = None
        
    class CLINumber(BaseModel):
        c_clinumberId: Optional[int] = None
        c_clinumberName: Optional[str] = None
        c_clinumbermapName: Optional[str] = None
        c_callflowId: Optional[int] = None
        c_callflowName: Optional[str] = None
        c_apiIntegration : Optional[str] = None
        c_smsMode: Optional[str] = None
        smsmembers: List = []
        members: List["CLINumberGetResponse.Member"] = []
        apis: List["CLINumberGetResponse.API"] = []
        class Config:
            from_attributes = True
    data: List[CLINumber]

class AccountListResponse(BaseModel):
    message: str
    class Account(BaseModel):
        a_accountId: Optional[int] = None
        a_accountNo: Optional[str] = None
        a_accountName: Optional[str] = None
        a_accountPrefix: Optional[int] = None
        class Config:
            from_attributes = True
    data: List[Account]

class PeerListResponse(BaseModel):
    message: str
    class Peer(BaseModel):
        p_peerId: Optional[int] = None
        p_peerName: Optional[str] = None
        p_peerHost: Optional[str] = None
        class Config:
            from_attributes = True
    data: List[Peer]

class CallFlowListResponse(BaseModel):
    message: str
    class CallFlow(BaseModel):
        c_callflowId : Optional[int] = None
        c_callflowName : Optional[str] = None
        class Config:
            from_attributes = True
    data: List[CallFlow]

class MemberListResponse(BaseModel):
    message: str
    class Member(BaseModel):
        m_memberId: Optional[int] = None
        m_memberName: Optional[str] = None
        m_memberRole: Optional[str] = None
        m_memberExtensionNo: Optional[int] = None
        class Config:
            from_attributes = True
    data: List[Member]

class CampaignGetDeleteRequest(BaseModel):
    campaignid : int
    class Config:
        
        model_config = {'extra': 'forbid'}

class ListProxiesResponse(BaseModel):
    message: str
    class ProxyInstance(BaseModel):
        p_proxyId : Optional[int] = None
        p_proxyName : Optional[str] = None
        p_proxyDomainName : Optional[str] = None
        p_proxyIPAddress : Optional[str] = None
        p_codexName : Optional[str] = None
        p_proxyDirectoryName : Optional[str] = None
        class Config:
            from_attributes = True
    data: List[ProxyInstance]

class ListQueueGroupsResponse(BaseModel):
    message: str
    class QueueGroup(BaseModel):
        q_queuegroupId: Optional[str] = None
        q_queuegroupName: Optional[str] = None
        class Config:
            from_attributes = True
    data: List[QueueGroup]

class ExecutionEventsRequest(BaseModel):
    executioneventType: Literal["CallEvents-CLINumber"]

class ExecutionEventsResponse (BaseModel):
    message: str
    class ExecutionEvent(BaseModel):
        eventname: str
        allowedvariables: List[str]
        class Config:
            from_attributes = True
    data: List[ExecutionEvent]

class Tllist(BaseModel):
    m_memberId: int
    m_accountId: int
    m_accountNo: str
    m_accountCode: str
    m_memberName: str
    m_memberExtensionNo: int

    class Config:
        from_attributes = True
    
class TlmappingRequest(BaseModel):
    tlmemberid: int
    memberids: List[int]

class TLBase(BaseModel):
    m_memberId: int
    m_accountId: int
    m_accountNo: str
    m_accountCode: str
    m_memberName: str
    m_memberExtensionNo: int

    class Config:
        from_attributes = True

class AgentChild(BaseModel):
    m_memberId: int
    m_memberName: str

    class Config:
        from_attributes = True

class TLMappedResponse(BaseModel):
    tl: TLBase
    members: List[AgentChild]
    
class tlfetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["m_memberName", "m_memberRole", "m_createdOn", "m_memberExtensionNo"] = "m_createdOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    class Config:
        model_config = {'extra': 'forbid'}



# blacklist Start
class blockListCreateRequest(BaseModel):
    p_blacklistNo: str
    p_blacklistDescription: str
    p_blacklistCalltype: Optional[Literal["Incoming", "Outgoing", "Both"]] = None
    p_blacklistStatus: Optional[Literal["Active", "Inactive"]] = None

    @validator("p_blacklistNo")
    def validate_blacklist_no(cls, v):
        str_v = str(v)
        if not str_v.isdigit():
            raise ValueError("Mobile number must contain only digits")
        if len(str_v) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        if str_v[0] not in ("6", "7", "8", "9"):
            raise ValueError("Mobile number must start with 6, 7, 8, or 9")
        return v
    
class blockListUpdateRequest(BaseModel):
    p_blacklistId: int
    p_blacklistNo: str
    p_blacklistDescription: str
    p_blacklistCalltype: str
    p_blacklistStatus: str

    @validator("p_blacklistNo")
    def validate_blacklist_no(cls, v):
        str_v = str(v)
        if not str_v.isdigit():
            raise ValueError("Mobile number must contain only digits")
        if len(str_v) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        if str_v[0] not in ("6", "7", "8", "9"):
            raise ValueError("Mobile number must start with 6, 7, 8, or 9")
        return v

    @validator("p_blacklistCalltype")
    def validate_calltype(cls, v):
        if v not in ("Incoming", "Outgoing", "Both"):
            raise ValueError("Call type must be 'incoming' or 'outgoing'")
        return v

    @validator("p_blacklistStatus")
    def validate_status(cls, v):
        if v not in ("Active", "Inactive"):
            raise ValueError("Status must be 'Active' or 'Inactive'")
        return v

    @validator("p_blacklistDescription")
    def validate_description(cls, v):
        if not v.strip():
            raise ValueError("Description cannot be empty")
        return v
class blockListDeleteRequest(BaseModel):
    p_blacklistId: int

# blacklist End

class MemberclicktocallUpdateModel(BaseModel):
    m_memberId: int
    m_clicktocallType: Optional[str] = None

    class Config:
        model_config = {'extra': 'forbid'}

class Member2FAStatusUpdateModel(BaseModel):
    m_memberId: int
    m_member2FAStatus: Optional[str] = None

    class Config:
        model_config = {'extra': 'forbid'}

class CLINumberExternalFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    sortField: Literal["c_accountId", "c_accountNo", "c_clinumberName", "c_clinumberType", "c_clinumberCountryCode", "c_clinumberCountryName", "c_cliStatus", "c_peerId", "c_createdOn"] = "c_createdOn"
    sortOrder: Literal["ASC", "DESC"] = "DESC"
    
class CLINumbersExternalModel(BaseModel):
    c_clinumberName : Optional[str] = None
    c_clinumberCountryCode : Optional[str] = None
    c_clinumberCountryName : Optional[str] = None
   
    class Config:
        from_attributes=True

class CLINumberMapCallflowRequest(BaseModel):
    clinumbername: str
    wssurl: str
    frequency: int

class CLINumberMapCallflowResponse(BaseModel):
    message: str

class EmergencyCampaignPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class EmergencyCampaignStatus(str, Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class EmergencyCampaignScheduleType(str, Enum):
    IMMEDIATE = "IMMEDIATE"
    SCHEDULED = "SCHEDULED"

class EmergencyCampaignCreateRequest(BaseModel):
    e_campaignName: str = Field(..., min_length=1)
    e_priority: EmergencyCampaignPriority
    e_category: str
    e_primaryLanguage: str
    e_interactionMode: str
    e_scheduleType: EmergencyCampaignScheduleType = EmergencyCampaignScheduleType.IMMEDIATE
    e_scheduleTime: Optional[datetime] = None
    e_orchestrationData: Optional[Dict[str, Any]] = None
    e_proxyId: Optional[int] = None
    e_proxyDomainName: Optional[str] = None
    e_proxyDirectoryName: Optional[str] = None

class EmergencyCampaignResponse(BaseModel):
    e_campaignId: int
    e_campaignName: str
    e_priority: str
    e_category: str
    e_status: str
    e_createdOn: datetime

    class Config:
        from_attributes = True

class EmergencyGroupContactModel(BaseModel):
    name: Optional[str] = None
    phone: str

class EmergencyGroupCreateRequest(BaseModel):
    name: str
    contacts: List[EmergencyGroupContactModel]

class EmergencyGroupResponse(BaseModel):
    id: int
    name: str
    contactCount: int
    created_at: datetime

    class Config:
        from_attributes = True

class EmergencyIVRLogResponse(BaseModel):
    c_logId: Union[int, str]
    c_callId: str
    c_customerPhoneno: str
    c_disposition: str
    c_channel: Literal["IVR", "WA", "SMS"] = "IVR"
    c_startTime: Optional[str] = None
    c_endTime: Optional[str] = None
    c_answerTime: Optional[str] = None
    c_duration: Optional[int] = 0
    c_ivrResponse: Optional[Any] = None
    c_messageContent: Optional[Any] = None
    c_campaignId: int
    c_campaignName: Optional[str] = None
    c_createdOn: datetime

    class Config:
        from_attributes = True

class EmergencyReportResponse(BaseModel):
    summary: Dict[str, int]
    logs: List[EmergencyIVRLogResponse]

class EmergencyAllReportsResponse(BaseModel):
    total: int
    logs: List[EmergencyIVRLogResponse]

class ChannelMetric(BaseModel):
    name: str
    active: int = 0
    success: int = 0
    fallout: int = 0
    color: str
    trend: str = "stable"
    throughput: str = ""
    queueDepth: int = 0
    avgConnectTime: str = "0s"
    peakLoad: str = "0%"
    successRate: str = "0%"
    avgDuration: str = "0s"
    peakConcurrency: int = 0
    errorRate: str = "0%"
    avgLatency: str = "0ms"
    totalAttempts: int = 0
    totalResponses: int = 0

class MissionUpdate(BaseModel):
    id: int
    name: str
    status: str
    type: str
    progress: int
    totalAudience: int = 0
    responded: int = 0
    pending: int = 0
    startTime: str

class TrendPoint(BaseModel):
    time: str
    calls: int

class DispositionPoint(BaseModel):
    name: str
    value: int
    color: str

class EmergencyAllReportsRequest(BaseModel):
    limit: int = 100
    offset: int = 0
    campaign_id: Optional[int] = None
    channel: Optional[str] = None
    disposition: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class EmergencyDashboardResponse(BaseModel):
    activeAlerts: int
    totalContacts: int
    successRate: float
    totalFallout: int
    totalResponded: int = 0  # Unique employees who provided an interaction
    previousHourStats: Dict[str, Any]
    channelPulse: List[ChannelMetric]
    dispositionBreakdown: List[DispositionPoint]
    responseBreakdown: List[DispositionPoint] = []  # Dynamic response counts (dtmf/buttons)
    hourlyTrends: List[TrendPoint]
    recentMissions: List[MissionUpdate]
    availableCampaigns: List[Dict[str, Any]] = []

class EmergencyResponseMembersRequest(BaseModel):
    campaign_id: Optional[int] = None
    response_text: str
    limit: int = 100
    offset: int = 0

class campaignstartRequest(BaseModel):
    campid: int

