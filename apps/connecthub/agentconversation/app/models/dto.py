from fastapi import APIRouter, Query, Form, Path, status, Response, Depends, HTTPException
from pydantic import Field, EmailStr, BaseModel, validator, model_validator, field_validator
from datetime import datetime
from typing import Optional, List, Literal, Union ,Dict, Any
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

class LeadsModel(BaseModel):
    l_leadId: Optional[str] = None
    l_accountId: Optional[int] = None
    l_accountNo: Optional[str] = None
    l_leadMobileNumber: Optional[int] = None
    l_leadOwner: Optional[str] = None
    l_leadOrigin: Union[str, dict] = None
    l_leadStatus: Optional[str] = None
    class Config:
        from_attributes=True   
        
class LeadCreateRequest(BaseModel):
    clinumbername: str
    leadnumber: int
    callid: str
    channeltype: str
    class Config:
        model_config = {'extra': 'forbid'}

class LeadGetRequest(BaseModel):
    leadnumber: int
    class Config:
        model_config = {'extra': 'forbid'}

class LeadProduceRequest(BaseModel):
    leadnumber: int
    callid: str
    channeltype: str
    class Config:
        model_config = {'extra': 'forbid'}

class conversationFetchRequest(BaseModel):
    leadId: str = Field(..., min_length=1, description="leadId must not be empty.")
    class Config:
        model_config = {'extra': 'forbid'}

class CallBackReminderCreateRequest(BaseModel):
    phonenumber: str
    timestamp : str
    class Config:
        model_config = {'extra': 'forbid'}

class CallBackReminderCreateResponse(BaseModel):
    message: str
    
class CallBackReminderFetchRequest(BaseModel):
    sortOrder: str = "DESC"
    sortField: Optional[str] = ""
    searchString: Optional[str] = ""
    offset: int = 0
    limit: int = 20
    calldatestart: Optional[str] = "" 
    calldateend: Optional[str] = "" 

class CallBackReminderFetchResponse(BaseModel):
    message: str
    data: Dict[str, Any]

class NotificationTriggerRequest(BaseModel):
    notificationtype:  Literal["CALLBACK", "CUSTOM", "MISSEDCALL"]
    notificationdata: dict
    memberextensionno: str
    class Config:
        model_config = {'extra': 'forbid'}

class NotificationTriggerResponse(BaseModel):
    message: str

class NotificationCreateRequest(BaseModel):
    notificationtype:  Literal["CALLBACK", "CUSTOM", "MISSEDCALL"]
    notificationdata: dict
    notificationtime: str
    memberid: str
    memberextensionno: str
    class Config:
        model_config = {'extra': 'forbid'}

class NotificationCreateResponse(BaseModel):
    message: str

class NotificationListRequest(BaseModel):
    memberextensionno: str
    notificationtype: Union[str, List[str]]
    offset: int = 0
    limit: int = 20
    class Config:
        model_config = {'extra': 'forbid'}

class NotificationListResponse(BaseModel):
    message: str
    class NotificationList(BaseModel):
        n_notificationId: Optional[int] = Field(None, alias="notificationId")
        n_notificationType: Optional[str] = Field(None, alias="action")
        n_notificationData: Optional[dict] = Field(None, alias="notificationData")
        n_notificationTime: Optional[str] = Field(None, alias="notificationTime")
        n_notificationStatus: Optional[str] = Field(None, alias="notificationStatus")
        class Config:
            from_attributes = True
            populate_by_name = True
    data: List[NotificationList]
    class Config:
        populate_by_name = True

class NotificationStatusUpdateRequest(BaseModel):
    notificationids: List[int]
    notificationstatus: Literal["READ", "UNREAD", "DISMISSED"]
    class Config:
        model_config = {'extra': 'forbid'}

class NotificationStatusUpdateResponse(BaseModel):
    message: str

class CDRLoggingRequest(BaseModel):
    callid: str
    accountid: int
    accountno: str
    campaignid: int
    campaignname: str
    clinumberid: int
    clinumbername: str
    source: str
    destination: str
    calldisposition: str
    agentdisposition: str
    direction: str
    calldatetime: str
    starttime: str
    endtime: str
    answertime: str
    duration: int
    billsec: int
    hangupby: str
    hangupby: str
    class Config:
        model_config = {'extra': 'forbid'}

class readynotreadyRequest(BaseModel):
    r_status: Literal["READY", "NOTREADY"]
    campId: int
    class Config:
        model_config = {'extra': 'forbid'}

class breakRequest(BaseModel):
    b_Break: Literal["BREAK", "QUERY","LUNCH", "MEETING","LOGIN"]
    class Config:
        model_config = {'extra': 'forbid'}

class LeadGetResponse(BaseModel):
    message: str
    class Lead(BaseModel):
        l_leadId: Optional[str] = None
        class Config:
            from_attributes = True
    data: List[Lead]

class LeadProduceResponse(BaseModel):
    message: str
    class Lead(BaseModel):
        l_leadId: Optional[str] = None
        class Config:
            from_attributes = True
    data: List[Lead]

class agentcampRequest(BaseModel):
    campName: str
    campId: int
    class Config:
        model_config = {'extra': 'forbid'}

class OutboundInitRequest(BaseModel):
    phonenumber: int
    memberextensionno: int
    callid: str
    campaignid: int
    class Config:
        model_config = {'extra': 'forbid'}
    
class OutboundInitResponse(BaseModel):
    message: str
    class OutboundInit(BaseModel):
        leadId: Optional[str] = None
        conversationId: Optional[str] = None
        class Config:
            from_attributes = True
    data: OutboundInit

# class OutboundAnswerRequest(BaseModel):
#     eventOriginate: str
#     type: str
#     l_memberExtention: str
#     l_memberCustomerNumber: str
#     l_memberCliNumberId: str
#     l_memberCallDirection: str
#     l_memberServerIp: str
#     l_memberStatus: str
#     expires: str
#     l_memberuuid: str
#     class Config:
#         model_config = {'extra': 'forbid'}

class OutboundAnswerRequest(BaseModel):
    leadid: str
    phonenumber: str
    memberextensionno: int
    callid: str
    class Config:
        model_config = {'extra': 'forbid'}

class OutboundAnswerResponse(BaseModel):
    message: str

class OutboundTerminationRequest(BaseModel):
    leadid: str
    conversationid: str
    callmode: str
    callid: str
    freeuuid: str
    memberextensionno: str
    memberphoneno: str
    customerphoneno: str
    disposition: str
    calldatetime: str
    starttime: str
    endtime: str
    answertime: str
    duration: int
    talktime: int
    terminationend: str
    campaignid: int
    clinumberid: int
    clinumbername: str
    accountid: int
    accountno: str
    callerName: Optional[str] = None
    clientip: Optional[str] = None
    wss: Optional[str] = None
    clientUniqueId: Optional[str] = None
    recordingUrl: Optional[str] = None
    custom: Optional[Dict[str, Any]] = None
    class Config:
        model_config = {'extra': 'forbid'}

class OutboundTerminationResponse(BaseModel):
    message: str

class InboundInitRequest(BaseModel):
    accountid: int
    accountno: str
    phonenumber: int
    callid: str
    class Config:
        model_config = {'extra': 'forbid'}
    
class InboundInitResponse(BaseModel):
    message: str

class InboundAnswerRequest(BaseModel):
    accountid: int
    accountno: str
    phonenumber: int
    memberextensionno: int
    callid: str
    clinumberid: int
    class Config:
        model_config = {'extra': 'forbid'}

class InboundAnswerResponse(BaseModel):
    message: str

class InboundTerminationRequest(BaseModel):
    callmode: str
    callid: str
    memberextensionno: str
    memberphoneno: str
    customerphoneno: str
    disposition: str
    calldatetime: str
    starttime: str
    endtime: str
    answertime: str
    duration: int
    talktime: int
    terminationend: str
    campaignid: int
    clinumberid: int
    clinumbername: str
    accountid: int
    accountno: str
    callerName: Optional[str] = None
    clientip: Optional[str] = None
    recordingUrl: Optional[str] = None
    onetoone: Literal[0, 1] = 0
    class Config:
        model_config = {'extra': 'forbid'}

class InboundTerminationResponse(BaseModel):
    message: str

class InboundAgentAffinityRequest(BaseModel):
    leadid: str
    conversationid: str
    callmode: str
    class Config:
        model_config = {'extra': 'forbid'}

class InboundAgentAffinityResponse(BaseModel):
    message: str
    class OutboundInit(BaseModel):
        leadId: Optional[str] = None
        conversationId: Optional[str] = None
        class Config:
            from_attributes = True
    data: OutboundInit

class ConversationEndRequest(BaseModel):
    conversationid: str
    callid: str
    callendtime: str
    followup: dict
    class Config:
        model_config = {'extra': 'forbid'}

class ConversationEndResponse(BaseModel):
    message: str

class ConversationListRequest(BaseModel):
    memberextensionno: int
    offset: int = 0
    limit: int = 20
    class Config:
        model_config = {'extra': 'forbid'}

class ConversationListResponse(BaseModel):
    message: str
    class ConversationList(BaseModel):
        c_conversationId: Optional[str] = None
        c_conversationPhoneNo: Optional[int] = None
        c_conversationOwner: Optional[int] = None
        c_conversationChannel: Optional[str] = None
        c_conversationType: Optional[str] = None
        c_conversationDetails: Optional[dict] = None
        c_conversationStatus: Optional[str] = None
        c_leadId: Optional[str] = None
        c_taskId: Optional[str] = None
        c_contactName: Optional[str] = None
        colour: Optional[str] = None
        c_createdOn: Optional[str] = None
        c_updatedOn: Optional[str] = None
        class Config:
            from_attributes = True
    data: List[ConversationList]

class ConversationFollowupFetchRequest(BaseModel):
    leadid: str
    phonenumber: str
    campaignid: str
    clinumberid: str
    calldirection: str
    class Config:
        model_config = {'extra': 'forbid'}

class ConversationFollowupFetchResponse(BaseModel):
    message: str
    data: dict

class CallFollowUpGetRequest(BaseModel):
    callid: str
    class Config:
        model_config = {'extra': 'forbid'}

class CallFollowUpGetResponse(BaseModel):
    message: str
    data: dict

class ChatHistoryRequest(BaseModel):
    leadid: str
    limit: int = 20
    offset: int = 0
    class Config:
        model_config = {'extra': 'forbid'}

class ChatHistoryRequestName(BaseModel):
    limit: int = 20
    offset: int = 0
    class Config:
        model_config = {'extra': 'forbid'}

class ChatHistoryResponse(BaseModel):
    message: str
    data: dict

class ListMembersResponse(BaseModel):
    message: str
    class Member(BaseModel):
        m_memberId : Optional[int] = None
        m_memberName : Optional[str] = None
        m_memberExtensionNo : Optional[int] = None
        class Config:
            from_attributes = True
    data: List[Member]
    

class EmailToVoicemailRequest(BaseModel):
    to: Optional[List[EmailStr]] = Field(..., example=["user1@example.com", "user2@example.com"])
    cc: Optional[List[EmailStr]] = Field(None, example=["manager@example.com"])
    memberextension: str = Field(..., example="1001")
    customerphoneno: str
    domain: str = Field(..., example="example.com")
    attachmenturl: Optional[str] = Field(
        None, example="https://storage.example.com/voicemails/1001/voicemail.wav"
    )

class EmailToVoicemailResponse(BaseModel):
    message: str = Field(..., example="Email sent successfully")

class OutboundConferenceMergeRequest(BaseModel):
    conversationids: List[str]
    conferenceparticipants: List[str]
    phonenumber: str
    leadid: str
    callid: str
    campaignid: str
    class Config:
        model_config = {'extra': 'forbid'}
    
class OutboundConferenceMergeResponse(BaseModel):
    message: str
    class OutboundConferenceMerge(BaseModel):
        conversationId: Optional[str] = None
        class Config:
            from_attributes = True
    data: OutboundConferenceMerge

class ContactGetRequest(BaseModel):
    phonenumber: str
    class Config:
        model_config = {'extra': 'forbid'}

class ContactGetResponse(BaseModel):
    message: str
    class Contact(BaseModel):
        c_Name: Optional[str] = None
        c_phoneNumber: Optional[str] = None
        c_countryCode: Optional[str] = None
        c_mailId: Optional[str] = None
        c_organizationName: Optional[str] = None
        c_address: Optional[str] = None
        c_leadId: Optional[str] = None
        class Config:
            from_attributes = True
    data: List[Contact]

class NotificationMissedListRequest(BaseModel):
    memberextensionno: str
    class Config:
        model_config = {'extra': 'forbid'}

class NotificationMissedListResponse(BaseModel):
    message: str
    class NotificationList(BaseModel):
        n_notificationType: Optional[str] = Field(None, alias="action")
        n_notificationData: Optional[dict] = Field(None, alias="notificationData")
        n_notificationTime: Optional[str] = Field(None, alias="notificationTime")
        class Config:
            from_attributes = True
            populate_by_name = True
    data: List[NotificationList]
    notification: bool
    class Config:
        populate_by_name = True

class NotificationMissedUpdateRequest(BaseModel):
    memberextensionno: str
    class Config:
        model_config = {'extra': 'forbid'}

class NotificationMissedListUpdateResponse(BaseModel):
    message: str

class PredictiveoriginateRequest(BaseModel):
    callUuid: str
    campaignId: str
    leadId: str
    result: str
    accountid: str
    accountno: str
    phoneNumber: str
    duration: str
    hangupCause: str
    extension: str
    
class PredictiveoriginateResponse(BaseModel):
    message: str
    
class PredictiveConversationFetchRequest(BaseModel):
    leadid: str
    campaignid: int
    class Config:
        model_config = {'extra': 'forbid'}

class PredictiveConversationFetchResponse(BaseModel):
    message: str
    data: dict

class PredictiveInboundInitRequest(BaseModel):
    accountid: int
    accountno: str
    phonenumber: int
    callid: str
    class Config:
        model_config = {'extra': 'forbid'}
    
class PredictiveInboundInitResponse(BaseModel):
    message: str

class PredictiveInboundAnswerRequest(BaseModel):
    accountid: int
    accountno: str
    phonenumber: int
    memberextensionno: int
    callid: str
    clinumberid: int
    campaignid: int
    predictiveID: str
    class Config:
        model_config = {'extra': 'forbid'}

class PredictiveInboundAnswerResponse(BaseModel):
    message: str
    
class PredictiveInboundTerminationRequest(BaseModel):
    callmode: str
    callid: str
    memberextensionno: str
    memberphoneno: str
    customerphoneno: str
    disposition: str
    calldatetime: str
    starttime: str
    endtime: str
    answertime: str
    duration: int
    talktime: int
    terminationend: str
    campaignid: int
    clinumberid: int
    clinumbername: str
    accountid: int
    accountno: str
    callerName: Optional[str] = None
    clientip: Optional[str] = None
    recordingUrl: Optional[str] = None
    onetoone: Literal[0, 1] = 0
    predictiveID: str
    class Config:
        model_config = {'extra': 'forbid'}

class PredictiveInboundTerminationResponse(BaseModel):
    message: str
