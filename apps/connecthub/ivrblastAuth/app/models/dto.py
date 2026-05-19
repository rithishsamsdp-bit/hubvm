from pydantic import BaseModel,EmailStr,Field,model_validator
from datetime import datetime
from typing import Optional
from typing import Optional,Annotated,Self
from repos import onboard_repo
from typing import List, Optional

class AgentsModel(BaseModel):
    a_agentId : Optional[int] = None
    a_regId : Optional[int] = None
    a_companyCode : Optional[str] = None
    a_userName : Optional[str] = None
    # a_password : Optional[str] = None
    a_phLogin : Optional[int] = None
    a_campaignId : Optional[dict] = None
    a_mode : Optional[int] = None
    a_platFormType : Optional[int] = None
    a_role : Optional[int] = None
    a_callerId : Optional[str] = None
    a_mailId : Optional[str] = None
    a_loginStatus : Optional[int] = None
    a_context : Optional[str] = None
    # a_passwordHash : Optional[str] = None
    a_mobileNumber : Optional[int] = None
    a_uniqueid : Optional[str] = None
    a_calltype : Optional[str] = None
    a_confdetails : Optional[str] = None

    class Config:
        from_attributes=True


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

class LoginRequest(BaseModel):
    companycode: str
    username: str
    password: str

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

class LoginRequest(BaseModel):
    companycode: str
    username: str
    password: str

class UserDetails(BaseModel):
    agent_Count: int
    admin_Count: int
    tl_Count: int
    superAdmin_Count: int

class QueueDetails(BaseModel):
    queue_count: int

class ReportDetails(BaseModel):
    report_List: List

class SettingsDetails(BaseModel):
    skill_Count: int
    blockList_Count: int
    carrier_Count: int
    disposition_Count: int
    callflow_Count: int
    businessHoliday_Count: int

class IvrDetails(BaseModel):
    campaign_Count: int
    carrier_Count: int
    ivrflow_Count: int
    ivrcreation_Count: int
    ivrblast_Report: int

class CrmDetails(BaseModel):
    zoho: bool
    custom: bool

class WhatsAppDetails(BaseModel):
    template_Count: int
    campaign_Count: int
    group_Count: int
    Dashboard: bool
    Messenger: bool
    Report: bool

class ApiDetails(BaseModel):
    user_Count: int
    queue_Count: int
    carrier_Count: int
    blocklist_Count: int
    callflow_Count: int
    bussinessHoliday_Count: int
    Dashboard: bool
    Api_Doc: bool
    control_Panel: bool
    reports_List: List


class WhatsAppDetails(BaseModel):
    template_Count: int
    campaign_Count: int
    group_Count: int
    Dashboard: bool
    Messenger: bool
    Report: bool

class AgentDialerFeatures(BaseModel):
    hold: bool
    conference: bool
    blind_transfer: bool
    warm_Transfer: bool

class Dashboard(BaseModel):
    status: bool

class Users(BaseModel):
    status: bool
    user_Details: UserDetails

class Queue(BaseModel):
    status: bool
    queue_Details: QueueDetails

class Report(BaseModel):
    status: bool
    report_Details: ReportDetails

class Settings(BaseModel):
    status: bool
    settings_Details: SettingsDetails

class IvrBlast(BaseModel):
    status: bool
    ivr_Details: IvrDetails

class ApiIntegration(BaseModel):
    status: bool
    api_Details: ApiDetails

class CrmIntegration(BaseModel):
    status: bool
    crm_Details: CrmDetails

class WhatsAppIntegration(BaseModel):
    status: bool
    whatsApp_Details: WhatsAppDetails

class AgentPanel(BaseModel):
    status: bool
    agentDialer_Features: AgentDialerFeatures

class MainData(BaseModel):
    dialmode: str
    dashboard: Dashboard
    users: Users
    queue: Queue
    report: Report
    settings: Settings
    ivr_blast: IvrBlast
    api_integration: ApiIntegration
    crm_integration: CrmIntegration
    whatsapp_integration: WhatsAppIntegration
    agent_panel: AgentPanel
    lead: Optional[bool] = None

class custOnboarding(BaseModel):
    company_Name: str
    company_Strength: int
    comapny_Code: str
    mobile_Number: Annotated[str, Field(..., pattern=r'^[789]\d{9}$')]
    mail_Id: EmailStr
    utlityData:MainData
    
    @model_validator(mode="after")
    def checkCompanyexist(self) -> Self:
        company_Name = self.company_Name
        comapny_Code = self.comapny_Code
        mail_Id = self.mail_Id
        
        onboard_repo.val_companyName(company_Name, "connecthub")
        onboard_repo.val_companycode(comapny_Code, "connecthub")
        onboard_repo.val_maiilid(mail_Id, "connecthub")
        return self

class validatecompanycode(BaseModel):
    value: str
    valType: str
    @model_validator(mode="after")
    def checkCompanycodAlreadyexist(self) -> Self:
        value = self.value
        valType = self.valType
        if valType == 'CCODE':
            onboard_repo.val_companycode(value, "connecthub")
            return self
        elif valType == 'CEMAIL':
            onboard_repo.val_maiilid(value, "connecthub")
        elif valType == 'CNAME':
            onboard_repo.val_companyName(value, "connecthub")