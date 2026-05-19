from pydantic import BaseModel, Field
from fastapi import Form
from datetime import datetime
from typing import Optional, Dict, List

class ApiLogModel(BaseModel):
    request_id: str
    client_ip: Optional[str] = None
    client_host: Optional[str] = None
    regId: Optional[str] = None
    agentId: Optional[str] = None
    comp_code: Optional[str] = None
    user_name: Optional[str] = None
    encrypt: Optional[str] = None
    phLogin: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    content_type: Optional[str] = None
    request_data: Optional[Dict] = None
    file_uploads: Optional[List[Dict[str, str]]] = None
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    request_time: Optional[datetime] = None
    response_time: Optional[datetime] = None
    duration: Optional[float] = None
    log_type: Optional[str] = "request"
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True
        
class TokenModel(BaseModel):
    a_agentId : Optional[int] = None
    a_regId : Optional[int] = None
    a_companyCode : Optional[str] = None
    a_userName : Optional[str] = None
    a_password : Optional[str] = None
    a_phLogin : Optional[int] = None
    a_campaignId : Optional[dict] = None
    a_mode : Optional[int] = None
    a_platFormType : Optional[int] = None
    a_role : Optional[int] = None
    a_callerId : Optional[str] = None
    a_mailId : Optional[str] = None
    a_loginStatus : Optional[int] = None
    a_context : Optional[str] = None
    a_passwordHash : Optional[str] = None
    a_mobileNumber : Optional[int] = None
    a_uniqueid : Optional[str] = None
    a_calltype : Optional[str] = None
    a_confdetails : Optional[str] = None
    exp: datetime
    encryption : Optional[str] = None
    class Config:
        from_attributes=True

class AgentsModel(BaseModel):
    a_agentId : Optional[int] = None
    a_regId : Optional[int] = None
    a_companyCode : Optional[str] = None
    a_userName : Optional[str] = None
    a_password : Optional[str] = None
    a_phLogin : Optional[int] = None
    a_campaignId : Optional[dict] = None
    a_mode : Optional[int] = None
    a_platFormType : Optional[int] = None
    a_role : Optional[int] = None
    a_callerId : Optional[int] = None
    a_mailId : Optional[str] = None
    a_loginStatus : Optional[int] = None
    a_context : Optional[str] = None
    a_passwordHash : Optional[str] = None
    a_mobileNumber : Optional[int] = None
    a_uniqueid : Optional[str] = None
    a_calltype : Optional[str] = None
    a_confdetails : Optional[str] = None
    class Config:
        from_attributes=True

class VoiceResponsesModel(BaseModel):
    v_voiceresponseId : Optional[int] = None
    v_voiceresponseName : Optional[str] = None
    v_voiceresponseUrl : Optional[str] = None
    class Config:
        from_attributes=True

class IvrFlowsModel(BaseModel):
    i_flowId : Optional[int] = None
    i_flowName : Optional[str] = None
    i_flowData : Optional[dict] = None
    i_flowOData : Optional[List] = None
    i_flowOPosition : Optional[List] = None
    class Config:
        from_attributes=True

class IvrCampaignsModel(BaseModel):
    i_campaignId : Optional[int] = None
    i_campaignName : Optional[str] = None
    i_campaignDescription : Optional[str] = None
    i_carrierId : Optional[int] = None
    i_carrierName : Optional[str] = None
    i_flowId : Optional[int] = None
    i_flowName : Optional[str] = None
    i_status : Optional[str] = None
    i_ratio : Optional[int] = None
    class Config:
        from_attributes=True

class IvrCarriersModel(BaseModel):
    i_carrierId : Optional[int] = None
    i_carrierName : Optional[str] = None
    i_carrierSecret : Optional[str] = None
    i_carrierPrefix : Optional[int] = None
    i_carrierHost : Optional[str] = None
    i_carrierPort : Optional[int] = None
    class Config:
        from_attributes=True

class IvrBlastLogsModel(BaseModel):
    i_Id : Optional[int] = None
    i_uniqueId : Optional[str] = None
    i_campaignName : Optional[str] = None
    i_carrier : Optional[str] = None
    i_source : Optional[str] = None
    i_destination : Optional[str] = None
    i_disposition : Optional[str] = None
    i_userInput : Optional[str] = None
    i_callType : Optional[str] = None
    i_channelName : Optional[str] = None
    i_callDate : Optional[str] = None
    i_callerId : Optional[str] = None
    i_startTime : Optional[str] = None
    i_endTime : Optional[str] = None
    i_duration : Optional[str] = None
    i_billsec : Optional[str] = None
    i_answerTime : Optional[str] = None
    i_campaignId : Optional[str] = None
    class Config:
        from_attributes=True

class VoiceResponseDeleteRequest(BaseModel):
    voiceresponseid : int
    voiceresponsename : str
    class Config:
        model_config = {'extra': 'forbid'}

class VoiceResponseFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    class Config:
        model_config = {'extra': 'forbid'}

class VoiceResponseFieldCheckRequest(BaseModel):
    voiceresponsename : str
    class Config:
        model_config = {'extra': 'forbid'}

class FlowCreateRequest(BaseModel):
    flow_data : str
    flow_name : str
    flow_position : str
    class Config:
        model_config = {'extra': 'forbid'}

class FlowUpdateRequest(BaseModel):
    flow_id : int
    flow_data : str
    flow_name : str
    flow_position : str
    class Config:
        model_config = {'extra': 'forbid'}

class FlowDeleteRequest(BaseModel):
    flow_id : int
    class Config:
        model_config = {'extra': 'forbid'}

class FlowFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    class Config:
        model_config = {'extra': 'forbid'}

class FlowFieldCheckRequest(BaseModel):
    flow_name : str
    class Config:
        model_config = {'extra': 'forbid'}

class CampaignUpdateRequest(BaseModel):
    campaignid : int
    campaignname : str
    campaigndescription : str
    carrierid : int
    carriername : str
    flowid : int
    flowname : str
    class Config:
        model_config = {'extra': 'forbid'}

class CampaignDeleteRequest(BaseModel):
    campaignid : int
    class Config:
        model_config = {'extra': 'forbid'}

class CampaignFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    class Config:
        model_config = {'extra': 'forbid'}

class CampaignFieldCheckRequest(BaseModel):
    campaignname : str
    class Config:
        model_config = {'extra': 'forbid'}

class CampaignCreateCallerIdRequest(BaseModel):
    campaignid : int
    callerids : List[int]
    class Config:
        model_config = {'extra': 'forbid'}

class CarrierCreateRequest(BaseModel):
    carriername : str
    carriersecret : str
    carrierhost : str
    carrierport : int
    carrierprefix : Optional[int] = None

    class Config:
        model_config = {'extra': 'forbid'}

class CarrierUpdateRequest(BaseModel):
    carrierid : int
    carriername : str
    carriersecret : str
    carrierhost : str
    carrierport : int
    carrierprefix : Optional[int] = None
    class Config:
        model_config = {'extra': 'forbid'}

class CarrierDeleteRequest(BaseModel):
    carrierid : int
    class Config:
        model_config = {'extra': 'forbid'}

class CarrierFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    class Config:
        model_config = {'extra': 'forbid'}

class CarierFieldCheckRequest(BaseModel):
    carriername : str
    class Config:
        model_config = {'extra': 'forbid'}

def currentStart():
    return datetime.now().strftime("%Y-%m-%d 00:00:00")

def currentEnd():
    return datetime.now().strftime("%Y-%m-%d 23:59:59")

class ReportFetchRequest(BaseModel):
    limit: int = Field(1000, gt=0)
    offset: int = Field(0, ge=0)
    searchString: str = Field(default="")
    campaignid : str = Field(default="")
    calldatestart : str = Field(default_factory=currentStart)
    calldateend : str = Field(default_factory=currentEnd)
    class Config:
        model_config = {'extra': 'forbid'}