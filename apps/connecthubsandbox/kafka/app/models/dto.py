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

class IvrCampaignNumbersModel(BaseModel):
    c_Id : Optional[int] = None
    c_campaignId : Optional[int] = None
    c_campaignName : Optional[str] = None
    c_campaignDescription : Optional[str] = None
    c_campaignNumber : Optional[int] = None
    class Config:
        from_attributes=True

# class CampaignRunRequest(BaseModel):
#     campaign_id: int
#     ratiolimit: int

class CampaignResponseModel(BaseModel):
    totalRecordsCount: int
    totalRecords: List[IvrCampaignNumbersModel]

class HangupResponseModel(BaseModel):
    campaign_id: int
    lead_number: int
    
class IvrCarriersModel(BaseModel):
    i_carrierId : Optional[int] = None
    i_carrierName : Optional[str] = None
    i_carrierSecret : Optional[str] = None
    i_carrierPrefix : Optional[int] = None
    i_carrierHost : Optional[str] = None
    i_carrierPort : Optional[int] = None
    class Config:
        from_attributes=True

""" For IVR Fetching """
class getIvrRequest(BaseModel):
    campaignid : int
    database : str

""" For Dynamic Caller ID """
class CallerIdDynamic(BaseModel):
    status: Optional[str] = None  # "enable"
    batch_count: Optional[int] = 20  # default batch size

class CampaignRunRequest(BaseModel):
    campaign_id: int
    ratiolimit: int
    callerid_dynamic: Optional[CallerIdDynamic] = None