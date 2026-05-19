from sqlalchemy import Integer, Float, String, Enum, DateTime, JSON, BigInteger, Text, TIMESTAMP, Column, ForeignKey, Index, text
from sqlalchemy.sql import func
from sqlalchemy.sql.functions import current_timestamp
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()
Basecompany = declarative_base()

class Accounts(Base):
    __tablename__ = "p_accounts"

    a_accountId = Column("a_accountId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    a_accountNo = Column("a_accountNo", String(100), unique=True, nullable=False)
    a_accountName = Column("a_accountName", String(255), nullable=False)
    a_accountCode = Column("a_accountCode", String(100), unique=True, nullable=False)
    a_accountEncryption = Column("a_accountEncryption", String(255), nullable=False)
    a_accountDomainId = Column("a_accountDomainId", String(255), unique=True, nullable=True)
    a_accountMailId = Column("a_accountMailId", String(255), nullable=False)
    a_accountContactNo = Column("a_accountContactNo", String(50), nullable=False)
    a_accountBusinessVertical = Column("a_accountBusinessVertical", String(255), nullable=False)
    a_salesRepName = Column("a_salesRepName", String(255), nullable=False)
    a_planName = Column("a_planName", String(255), nullable=False)
    a_planDetails = Column("a_planDetails", JSON, nullable=False)
    a_proxyDomain = Column("a_proxyDomain", String(100), nullable=False)
    a_wssPort = Column("a_wssPort", Integer, nullable=False)
    a_udpPort = Column("a_udpPort", Integer, nullable=False)
    a_stunDomain = Column("a_stunDomain", String(100), nullable=False)
    a_createdOn = Column("a_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    a_updatedOn = Column("a_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
class Members(Base):
    __tablename__ = "p_members"

    m_memberId = Column('m_memberId',BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_accountId = Column('m_accountId',BigInteger, nullable=False)
    m_accountNo = Column('m_accountNo',String(100), nullable=False)
    m_accountCode = Column('m_accountCode',String(100), nullable=False)
    m_memberName = Column('m_memberName',String(255), nullable=False, unique=True)
    m_memberPassword = Column('m_memberPassword',String(100), nullable=False, server_default='Pulse@TPL')
    m_memberPasswordHash = Column('m_memberPasswordHash',String(255), nullable=False)
    m_memberRole = Column('m_memberRole',Enum('SUPERADMIN','ADMIN','TL','USER'), nullable=False, server_default='USER')
    m_memberExtensionNo = Column('m_memberExtensionNo',Integer, unique=True, nullable=False)
    m_memberCallerId = Column('m_memberCallerId',Integer, nullable=True)
    m_memberMobileNo = Column('m_memberMobileNo',Integer, nullable=True)
    m_memberMailId = Column('m_memberMailId',String(255), unique=True, nullable=True)
    m_memberMode = Column('m_memberMode',Enum('BROWSER','SOFTPHONE'), nullable=False, server_default='BROWSER')
    m_memberPlatformType = Column('m_memberPlatformType',Enum('CALLCENTER','RCM'), nullable=False, server_default='CALLCENTER')
    m_readyStatus = Column('m_readyStatus',Enum('READY','NOTREADY'), nullable=True)
    m_readyStatusStartTime = Column('m_readyStatusStartTime',DateTime, nullable=True)
    m_status = Column('m_status',Enum('LOGIN','LOGOUT','BREAK','QUERY', 'LUNCH', 'MEETING'), nullable=True)
    m_statusTime = Column('m_statusTime',DateTime, nullable=True)
    m_campaignId = Column('m_campaignId',BigInteger, nullable=True)
    m_createdOn = Column('m_createdOn',TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column('m_updatedOn',TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class MemberPlans(Base):
    __tablename__ = "p_memberplans"

    m_memberplanId = Column("m_memberplanId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_memberId = Column("m_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), unique=True, nullable=False)
    m_memberplanDetails = Column("m_memberplanDetails", JSON, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class SamlConfigs(Base):
    __tablename__ = "p_samlconfigs"

    s_samlId = Column('s_samlId', Integer, primary_key=True, autoincrement=True, nullable=False)
    s_samlDomain = Column('s_samlDomain', String(255), unique=True, nullable=False)
    s_samlEntityId = Column('s_samlEntityId', Text, nullable=False)
    s_samlLoginUrl = Column('s_samlLoginUrl', Text, nullable=False)
    s_samlCertificate = Column('s_samlCertificate', Text, nullable=False)
    s_createdOn = Column("s_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    s_updatedOn = Column("s_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class StateLogs(Base):
    __tablename__ = 'p_statelogs'

    s_logId = Column('s_logId', BigInteger, autoincrement=True, primary_key=True, nullable=False)
    s_accountId = Column('s_accountId', BigInteger, nullable=False)
    s_accountNo = Column('s_accountNo', String(100), nullable=False)
    s_stateName = Column('s_stateName', String(255), nullable=False)
    s_stateTime = Column('s_stateTime', String(255), nullable=False)
    s_memberId = Column('s_memberId', BigInteger, nullable=False)
    s_memberName = Column('s_memberName', String(255), nullable=False)
    s_memberRole = Column('s_memberRole', String(255), nullable=False)
    s_createdOn = Column('s_createdOn', TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    s_updatedOn = Column('s_updatedOn', TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class VoiceResponses(Base):
    __tablename__ = "p_voiceresponses"

    v_voiceresponseId = Column('v_voiceresponseId', Integer, primary_key=True, autoincrement=True, nullable=False)
    v_voiceresponseName = Column('v_voiceresponseName', String(30), nullable=False)
    v_voiceresponseUrl = Column('v_voiceresponseUrl', String(100), nullable=False)

class IvrFlows(Base):
    __tablename__ = "p_ivrflows"

    i_flowId = Column('i_flowId', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    i_flowName = Column('i_flowName', String(30), nullable=False)
    i_flowData = Column('i_flowData', JSON, nullable=False)
    i_flowOData = Column('i_flowOData', JSON, nullable=False)
    i_flowOPosition = Column('i_flowOPosition', JSON, nullable=False)

class IvrCampaigns(Base):
    __tablename__ = "p_ivrcampaigns"

    i_campaignId = Column('i_campaignId', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    i_campaignName = Column('i_campaignName', String(30), nullable=False)
    i_campaignDescription = Column('i_campaignDescription', String(100), nullable=False)
    i_carrierId = Column('i_carrierId', BigInteger, nullable=True)
    i_carrierName = Column('i_carrierName', String(30), nullable=False)
    i_flowId = Column('i_flowId', BigInteger, nullable=True)
    i_flowName = Column('i_flowName', String(30), nullable=False)
    i_status = Column('i_status',Enum('pending','active','completed','failed'), nullable=True, default='pending')
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class CampaignNumbers(Base):
    __tablename__ = "p_campaignnumbers"

    c_Id = Column('c_Id', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    c_campaignId = Column('c_campaignId', BigInteger, nullable=False)
    c_campaignName = Column('c_campaignName', String(30), nullable=False)
    c_campaignDescription = Column('c_campaignDescription', String(100), nullable=False)
    c_campaignNumber = Column('c_campaignNumber', String(15), nullable=False)
    c_authId = Column('c_authId', String(255), nullable=True)
    c_status = Column('c_status', Enum('pending','active','completed','failed'), nullable=True, default='pending')
    start_time = Column('start_time', DateTime, nullable=True)
    end_time = Column('end_time', DateTime, nullable=True)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class IvrCarriers(Base):
    __tablename__ = "p_ivrcarriers"

    i_carrierId = Column('i_carrierId', Integer, primary_key=True, autoincrement=True, nullable=False)
    i_carrierName = Column('i_carrierName', String(30), nullable=False)
    i_carrierSecret = Column('i_carrierSecret', String(30), nullable=False)
    i_carrierHost = Column('i_carrierHost', String(30), nullable=False)
    i_carrierPort = Column('i_carrierPort', Integer, nullable=False)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class ApiRequestLogs(Base):
    __tablename__ = "p_apiRequestLogs"

    a_id = Column('a_id', Integer, primary_key=True, autoincrement=True, nullable=False)
    a_requestMethod = Column('a_requestMethod', Enum('GET','POST','PUT','DELETE','PATCH'), nullable=False)
    a_requestUrl = Column('a_requestUrl', String(1024), nullable=False)
    a_requestBody = Column('a_requestBody', Text, nullable=False)
    a_responseStatus = Column('a_responseStatus', Integer, nullable=True)
    a_responseBody = Column('a_responseBody', Text, nullable=False)
    a_responseTime = Column('a_responseTime', Integer, nullable=True)
    a_ipAddress = Column('a_ipAddress', String(45), nullable=False)
    a_userAgent = Column('a_userAgent', String(45), nullable=False)
    a_errorMessage = Column('a_errorMessage', Text, nullable=False)
    a_requestHeaders = Column('a_requestHeaders', Text, nullable=False)
    a_responseHeaders = Column('a_responseHeaders', Text, nullable=False)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class Queues(Base):
    __tablename__ = "p_queue"

    id = Column("id", Integer, primary_key = True, autoincrement=True)
    queue_name = Column("queue_name", String(50), nullable=False, unique=True)
    strategy = Column("strategy", String(50), nullable = False)
    membername = Column("membername",JSON, nullable=False)
    timeout = Column("timeout", Integer, nullable = False)
    
class Holiday(Base):
    __tablename__ = "b_holiday"
    
    name = Column("name", String(100), primary_key=True)
    start_date = Column("start_date",String(100), nullable=False)
    end_date = Column("end_date", String(100), nullable = False)
    msg_enable = Column("msg_enable", String(100), nullable=False)
    message = Column("message",JSON)
    audio_enable = Column("audio_enable", String(100), nullable =False)
    audio_name = Column("audio_name", String(100), nullable = False)

class Shift(Base):
    __tablename__ = "b_shifts"
    
    shift_id = Column("shift_id", Integer, primary_key = True, autoincrement=True)
    display_name = Column("display_name", String(200), nullable = False)
    
class Days(Base):
    __tablename__ = "b_days"
    
    day_id = Column("day_id", Integer, primary_key = True, autoincrement=True)
    shift_id = Column("shift_id", Integer, ForeignKey('b_shifts.shift_id', ondelete='CASCADE'), nullable = False)
    day_name = Column("day_name", String(50), nullable = False)
    
class Hours(Base):
    __tablename__ = "b_hours"
    
    id = Column("id", Integer, primary_key = True, autoincrement=True)
    day_id = Column("day_id", Integer, ForeignKey('b_days.day_id', ondelete='CASCADE'), nullable =False)
    time_from = Column("time_from", String(50), nullable = False)
    time_to = Column("time_to", String(50), nullable = False)
    
    
class BlockList(Base):
    __tablename__ = "p_numberBlockList"

    a_id = Column(Integer, primary_key=True, autoincrement=True)
    a_number = Column(Integer, nullable=True)
    a_discription = Column(Text, nullable=True)
    a_createdOn = Column(DateTime, server_default=func.now())
    a_updatedOn = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
class Carrier(Base):
    __tablename__ = "p_carrier"

    a_id = Column(Integer, primary_key=True, autoincrement=True)
    a_trunkName = Column(String(20), nullable=True)
    a_secret = Column(String(30), nullable=True)
    a_host = Column(String(40), nullable=True)
    a_prefend = Column(Integer, nullable=True)
    a_port = Column(Integer, nullable=True)
    a_createdOn = Column(DateTime, server_default=func.now())
    a_updatedOn = Column(DateTime, server_default=func.now(), onupdate=func.now())

class RequestLog(Base):
    __tablename__ = "p_requestLogs"

    r_id = Column('r_id',Integer, primary_key=True, index=True)
    r_method = Column('r_method',String(10))
    r_url = Column('r_url',Text)
    r_requestBody = Column('r_request_body',Text)
    r_responseBody = Column('r_response_body',Text)
    r_statusCode = Column('r_status_code',Integer)
    r_duration = Column('r_duration',Float)
    r_timestamp = Column('r_timestamp',DateTime, default=datetime.utcnow)
    
class PLiveMonitoring(Base):
    __tablename__ = "p_liveMonitoring"

    l_id = Column("l_id",BigInteger, primary_key=True, autoincrement=True)
    l_memberAccountId = Column("l_memberAccountId",BigInteger, nullable=False)
    l_memberAccountNo = Column("l_memberAccountNo",String(100), nullable=False)
    l_membermemberId = Column("l_membermemberId",BigInteger, ForeignKey("p_members.m_memberId",ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    l_memberExtention = Column("l_memberExtention",String(20), nullable=False)
    l_memberName = Column("l_memberName",String(100), nullable=False)
    l_memberCampaignId = Column("l_memberCampaignId",BigInteger, nullable=True)
    l_memberCampaignName = Column("l_memberCampaignName",String(100), nullable=True)
    l_memberCustomerNumber = Column("l_memberCustomerNumber",String(20), nullable=True)
    l_memberCliNumberId = Column("l_memberCliNumberId",BigInteger, nullable=True)
    l_memberCallDirection = Column("l_memberCallDirection",Enum("INBOUND", "OUTBOUND"), nullable=True)
    l_memberuuid = Column("l_memberuuid",String(64), nullable=True, unique=True)
    l_memberStatus = Column("l_memberStatus",Enum("RINGING","INCALL","AVAILABLE","BREAK","INIT","QUERY","LUNCH","MEETING","UNAVAILABLE"),nullable=True)
    l_memberServerIp = Column("l_memberServerIp",String(45), nullable=True)
    l_memberLastUpdated = Column("l_memberLastUpdated",TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    __table_args__ = (Index("idx_campaign", "l_memberCampaignId"),Index("idx_status", "l_memberStatus"),)


class CallLog(Base):
    __tablename__ = "p_cdrlogs"  # change if your table name is different

    c_logId = Column(BigInteger, primary_key=True, autoincrement=True, unique=True)
    c_callId = Column(String(255), primary_key=True, nullable=False)
    c_accountId = Column(BigInteger, nullable=False)
    c_accountNo = Column(String(100), nullable=False)
    c_campaignId = Column(BigInteger, nullable=False)
    c_campaignName = Column(String(255), nullable=False)
    c_clinumberId = Column(BigInteger, nullable=False)
    c_clinumberName = Column(String(255), nullable=False)
    c_source = Column(String(50), nullable=False)
    c_destination = Column(String(50), nullable=False)
    c_memberExtensionNo = Column(String(50), nullable=True)
    c_calldisposition = Column(String(100), nullable=False)
    c_direction = Column(String(100), nullable=False)
    c_callDateTime = Column(String(100), nullable=False)
    c_startTime = Column(String(100), nullable=False)
    c_endTime = Column(String(100), nullable=False)
    c_answerTime = Column(String(100), nullable=False)
    c_duration = Column(Integer, nullable=False)
    c_billsec = Column(Integer, nullable=False)
    c_hangupBy = Column(String(100), nullable=False)
    c_createdOn = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    c_updatedOn = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))

class Calls(Base):
    __tablename__ = 'p_calls'

    c_logId = Column('c_logId', BigInteger, autoincrement=True, unique=True, nullable=False)
    c_accountId = Column('c_accountId', BigInteger, nullable=True)
    c_accountNo = Column('c_accountNo', String(100), nullable=True)
    c_callId = Column('c_callId', String(255), primary_key=True, nullable=True)
    c_memberExtensionNo = Column('c_memberExtensionNo', Integer, nullable=True)
    c_memberPhoneno = Column('c_memberPhoneno', BigInteger, nullable=True)
    c_customerPhoneno = Column('c_customerPhoneno', BigInteger, nullable=True)
    c_disposition = Column('c_disposition', String(100), nullable=True)
    c_direction = Column('c_direction', String(100), nullable=True)
    c_callDateTime = Column('c_callDateTime', String(100), nullable=True)
    c_startTime = Column('c_startTime', String(100), nullable=True)
    c_endTime = Column('c_endTime', String(100), nullable=True)
    c_answerTime = Column('c_answerTime', String(100), nullable=True)
    c_duration = Column('c_duration', Integer, nullable=True)
    c_talktime = Column('c_talktime', Integer, nullable=True)
    c_terminationEnd = Column('c_terminationEnd', String(100), nullable=True)
    c_campaignId = Column('c_campaignId', BigInteger, nullable=True)
    c_clinumberId = Column('c_clinumberId', BigInteger, nullable=True)
    c_clinumberName = Column('c_clinumberName', String(255), nullable=True)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class LiveCallStatus(Base):
    __tablename__ = "p_liveCallStatus"

    l_liveCallId = Column(BigInteger, primary_key=True, autoincrement=True)
    l_accountId = Column(BigInteger, nullable=False)
    l_accountNo = Column(String(100), nullable=True)
    l_CliNumber = Column(String(100), nullable=False)
    l_CustomerNumber = Column(String(100), nullable=False)
    l_memberExtention = Column(String(100), nullable=True)
    l_callDirection = Column(String(100), nullable=True)
    l_callStatus = Column(String(100), nullable=True)
    l_callServerIP = Column(String(255), nullable=True)
    l_callUUID = Column(String(255), nullable=True)
    l_callStartTime = Column(DateTime, nullable=False, server_default=func.now())
    l_callEndTime = Column(DateTime, nullable=True)

class Teams(Base):
    __tablename__ = "p_teams"

    t_teamId = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    t_accountId = Column(BigInteger, nullable=True)
    t_accountNo = Column(String(100), nullable=True)
    t_teamLeaderId = Column(BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    t_teamMemberId = Column(BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    t_createdOn = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index('idx_team_leader', 't_teamLeaderId'),Index('idx_team_member', 't_teamMemberId'),)

class CallbackReminders(Base):
    __tablename__ = "p_callbackreminders"

    c_recordId = Column(Integer, primary_key=True, autoincrement=True)
    c_accountId = Column(BigInteger, nullable=False)
    c_accountNo = Column(String(100), nullable=False)
    c_phonenumber = Column(BigInteger, nullable=False)
    c_timestamp = Column(DateTime, nullable=False)
    c_memberExtensionNo = Column(Integer, nullable=False)
    c_memberId = Column(BigInteger, nullable=False)
    c_createdOn = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
