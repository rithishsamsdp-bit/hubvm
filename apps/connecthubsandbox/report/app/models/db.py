from enum import Enum
from sqlalchemy import Column
from datetime import datetime
from sqlalchemy import Integer, Float, String, Enum, DateTime, ForeignKey,JSON, BigInteger, TIMESTAMP, Text, func, Index, Date, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.ext.mutable import MutableDict
import enum
from enum import IntEnum

Base = declarative_base()


class Accounts(Base):
    __tablename__ = "p_accounts"
    a_accountId = Column("a_accountId", BigInteger, primary_key=True, nullable=False)
    a_accountNo = Column("a_accountNo", String(100), unique=True, nullable=False)
    a_accountName = Column("a_accountName", String(255), nullable=False)
    a_accountCode = Column("a_accountCode", String(100), unique=True, nullable=False)
    a_accountEncryption = Column("a_accountEncryption", String(255), nullable=False)
    a_accountDomainId = Column("a_accountDomainId", String(255), unique=True, nullable=True)
    a_accountMailId = Column("a_accountMailId", String(255), nullable=False)
    a_accountContactNo = Column("a_accountContactNo", String(50), nullable=False)
    a_accountBusinessVertical = Column("a_accountBusinessVertical", String(255), nullable=False)
    a_accountServiceRegion = Column("a_accountServiceRegion", Enum('Domestic','International','Global','International-mid', 'Domestic-mid'), nullable=True)
    a_accountPrefix = Column("a_accountPrefix", BigInteger, nullable=False)
    a_salesRepName = Column("a_salesRepName", String(255), nullable=False)
    a_planName = Column("a_planName", String(255), nullable=False)
    a_planDetails = Column(MutableDict.as_mutable(JSON), nullable=False)
    a_createdOn = Column("a_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    a_updatedOn = Column("a_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

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

class Members(Base):
    __tablename__ = "p_members"

    m_memberId = Column('m_memberId', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_accountId = Column('m_accountId', BigInteger, nullable=False)
    m_accountNo = Column('m_accountNo', String(100), nullable=False)
    m_accountCode = Column('m_accountCode', String(100), nullable=False)
    m_memberName = Column('m_memberName', String(255), nullable=False)
    m_memberPassword = Column('m_memberPassword', String(100), nullable=False, default='Pulse@TPL')
    m_memberPasswordHash = Column('m_memberPasswordHash', String(255), nullable=False)
    m_memberRole = Column('m_memberRole', Enum('SUPERADMIN','ADMIN','TL','USER'), nullable=False, default='USER')
    m_memberExtensionNo = Column('m_memberExtensionNo', Integer, unique=True, nullable=False)
    m_memberCallerId = Column('m_memberCallerId', Integer, nullable=False)
    m_memberMobileNo = Column('m_memberMobileNo', Integer, nullable=False)
    m_memberMailId = Column('m_memberMailId', String(255), unique=True, nullable=True)
    m_memberMode = Column('m_memberMode', Enum('BROWSER','SOFTPHONE'), nullable=False, default='BROWSER')
    m_memberPlatformType = Column('m_memberPlatformType', Enum('CALLCENTER','RCM'), nullable=False, default='CALLCENTER')
    m_campaignId = Column('m_campaignId', BigInteger, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    plan = relationship("MemberPlans", backref="member", cascade="all, delete-orphan", uselist=False, passive_deletes=True)

class MemberPlans(Base):
    __tablename__ = "p_memberplan"

    m_memberplanId = Column("m_memberplanId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_memberId = Column("m_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), unique=True, nullable=False)
    m_memberplanDetails = Column("m_memberplanDetails", JSON, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())


class MemberGroups(Base):
    __tablename__ = "p_membergroups"

    m_recordId = Column("m_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_accountId = Column("m_accountId", BigInteger, nullable=False)
    m_accountNo = Column("m_accountNo", String(100), nullable=False)
    m_membergroupId = Column("m_membergroupId", BigInteger, nullable=False)
    m_membergroupName = Column("m_membergroupName", String(255), nullable=False)
    m_membergroupStatus = Column("m_membergroupStatus", String(50), nullable=False)
    m_memberId = Column("m_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    m_campaignId = Column("m_campaignId", BigInteger, nullable=False)
    m_createdOn = Column('m_createdOn', TIMESTAMP, nullable=False, default=datetime.utcnow)

class Campaigns(Base):
    __tablename__ = "p_campaigns"

    c_campaignId = Column("c_campaignId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    c_accountId = Column("c_accountId", BigInteger, nullable=False)
    c_accountNo = Column("c_accountNo", String(100), nullable=False)
    c_campaignName = Column("c_campaignName", String(255), nullable=False)
    c_campaignStatus = Column("c_campaignStatus", String(50), nullable=False)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class Leads(Base):
    __tablename__ = "p_leads"
    l_sequenceId = Column("l_sequenceId", BigInteger, autoincrement=True, unique=True)
    l_leadId = Column("l_leadId", String(255), primary_key=True, nullable=False)
    l_accountId = Column('l_accountId', BigInteger, nullable=False)
    l_accountNo = Column('l_accountNo', String(100), nullable=False)
    l_leadMobileNumber = Column('l_leadMobileNumber', String(100), nullable=False)
    l_leadName = Column('l_leadName', String(255), nullable=True)
    l_leadOwner = Column('l_leadOwner', String(100), nullable=True)
    l_leadOrigin = Column('l_leadOrigin', JSON, nullable=False)
    l_leadStatus = Column('l_leadStatus', String(100), nullable=True)
    l_createdOn = Column("l_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    l_updatedOn = Column("l_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class CdrLogs(Base):
    __tablename__ = 'p_cdrlogs'

    c_logId = Column('c_logId', BigInteger, autoincrement=True, unique=True, nullable=False)
    c_callId = Column('c_callId', String(255), primary_key=True, nullable=False)
    c_accountId = Column('c_accountId', BigInteger, nullable=False)
    c_accountNo = Column('c_accountNo', String(100), nullable=False)
    c_campaignId = Column('c_campaignId', BigInteger, nullable=False)
    c_campaignName = Column('c_campaignName', String(255), nullable=False)
    c_clinumberId = Column('c_clinumberId', BigInteger, nullable=False)
    c_clinumberName = Column('c_clinumberName', String(255), nullable=False)
    c_source = Column('c_source', String(50), nullable=False)
    c_destination = Column('c_destination', String(50), nullable=False)
    c_memberExtensionNo = Column('c_memberExtensionNo', String(50), nullable=False)
    c_calldisposition = Column('c_calldisposition', String(100), nullable=False)
    c_direction = Column('c_direction', String(100), nullable=False)
    c_callDateTime = Column('c_callDateTime', String(100), nullable=False)
    c_startTime = Column('c_startTime', String(100), nullable=False)
    c_endTime = Column('c_endTime', String(100), nullable=False)
    c_answerTime = Column('c_answerTime', String(100), nullable=False)
    c_duration = Column('c_duration', Integer, nullable=False)
    c_billsec = Column('c_billsec', Integer, nullable=False)
    c_hangupBy = Column('c_hangupBy', String(100), nullable=False)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
class Calls(Base):
    __tablename__ = 'p_calls'

    c_logId = Column('c_logId', BigInteger, autoincrement=True, unique=True, nullable=False)
    c_accountId = Column('c_accountId', BigInteger, nullable=True)
    c_accountNo = Column('c_accountNo', String(100), nullable=True)
    c_callMode = Column('c_callMode', Enum('BROWSER','SOFTPHONE'), nullable=True)
    c_callId = Column('c_callId', String(255), primary_key=True, nullable=True)
    c_callRecordingUrl = Column('c_callRecordingUrl', Text, nullable=True)
    c_memberExtensionNo = Column('c_memberExtensionNo', Integer, nullable=True)
    c_memberPhoneno = Column('c_memberPhoneno', BigInteger, nullable=True)
    c_callerName = Column('c_callerName', String(255), nullable=True)
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
    c_dial_method = Column('c_dial_method', String(50), nullable=True)
    c_campaignId = Column('c_campaignId', BigInteger, nullable=True)
    c_clinumberId = Column('c_clinumberId', BigInteger, nullable=True)
    c_clinumberName = Column('c_clinumberName', String(255), nullable=True)
    c_wssUrl = Column('c_wssUrl', Text, nullable=True)
    c_clientUniqueId = Column('c_clientUniqueId', String(255), nullable=True)
    c_clientIp = Column('c_clientIp', String(100), nullable=True)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class CallFollowups(Base):
    __tablename__ = 'p_callfollowups'

    c_recordId = Column("c_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    c_accountId = Column("c_accountId", BigInteger, nullable=True)
    c_accountNo = Column("c_accountNo", String(100), nullable=True)
    c_callfollowupId = Column("c_callfollowupId", String(255), unique=True, nullable=True)
    c_callfollowupDuration = Column("c_callfollowupDuration", Integer, nullable=True)
    c_callfollowupData = Column("c_callfollowupData", JSON, nullable=True)
    c_callId = Column("c_callId", String(255), unique=True, nullable=True)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class AgentStatus(Base):
    __tablename__ = 'p_agentstatus'

    a_logId = Column('a_logId',BigInteger, primary_key=True, autoincrement=True)
    a_memberId = Column('a_memberId',BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    a_accountId = Column('a_accountId',BigInteger, nullable=False)
    a_accountNo = Column('a_accountNo',String(100), nullable=False)
    a_memberExtensionNo = Column('a_memberExtensionNo',Integer, nullable=False)
    a_status = Column('a_status',Enum('READY','NOTREADY','BREAK','QUERY','LUNCH','MEETING','RESTROOM','LOGIN','LOGOUT', name='agent_status_enum'), nullable=False)
    a_startTime = Column('a_startTime',DateTime, nullable=False)
    a_endTime = Column('a_endTime',DateTime, nullable=True)
    a_durationSeconds = Column('a_durationSeconds',Integer, nullable=True)
    a_createdOn = Column('a_createdOn',TIMESTAMP, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index('idx_a_memberId', 'a_memberId'),Index('idx_a_status', 'a_status'),Index('idx_a_createdOn', 'a_createdOn'),{'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_0900_ai_ci'})
    
class MemberProductionReport(Base):
    __tablename__ = "p_memberProductionReport"

    m_productionID = Column('m_productionID',Integer, primary_key=True, autoincrement=True)
    m_productionDate = Column('m_productionDate',Date, nullable=False)
    m_accountId = Column('m_accountId',Integer, nullable=False)
    m_accountNo = Column('m_accountNo',String(50), nullable=False)
    m_memberId = Column('m_memberId',Integer, nullable=False)
    m_memberName = Column('m_memberName',String(255), nullable=False)
    m_memberExtensionNo = Column('m_memberExtensionNo',String(50), nullable=False)
    m_readySeconds = Column('m_readySeconds',Integer, default=0)
    m_notreadySeconds = Column('m_notreadySeconds',Integer, default=0)
    m_breakSeconds = Column('m_breakSeconds',Integer, default=0)
    m_lunchSeconds = Column('m_lunchSeconds',Integer, default=0)
    m_meetingSeconds = Column('m_meetingSeconds',Integer, default=0)
    m_querySeconds = Column('m_querySeconds',Integer, default=0)
    m_loginSeconds = Column('m_loginSeconds',Integer, default=0)
    m_logoutSeconds = Column('m_logoutSeconds',Integer, default=0)
    m_inboundTotal = Column('m_inboundTotal',Integer, default=0)
    m_inboundTalkTime = Column('m_inboundTalkTime',Integer, default=0)
    m_inboundAnswered = Column('m_inboundAnswered',Integer, default=0)
    m_inboundUnanswered = Column('m_inboundUnanswered',Integer, default=0)
    m_outboundTotal = Column('m_outboundTotal',Integer, default=0)
    m_outboundTalkTime = Column('m_outboundTalkTime',Integer, default=0)
    m_outboundAnswered = Column('m_outboundAnswered',Integer, default=0)
    m_outboundUnanswered = Column('m_outboundUnanswered',Integer, default=0)

    __table_args__ = (
        UniqueConstraint('m_productionDate', 'm_memberId', name='unique_date_member'),
        Index('idx_productionDate', 'm_productionDate'),
        Index('idx_accountId', 'm_accountId'),
        Index('idx_memberExtensionNo', 'm_memberExtensionNo'),
        Index('idx_date_account_extension', 'm_productionDate', 'm_accountId', 'm_memberExtensionNo'),
    )

class PConferences(Base):
    __tablename__ = 'p_conferences'

    p_conferenceID = Column(Integer, primary_key=True, autoincrement=True)
    p_accountId = Column(BigInteger, nullable=True)
    p_accountNo = Column(String(100), nullable=True)
    p_conferenceUniqueId = Column(String(100), nullable=False)
    p_confName = Column(String(100), nullable=False)
    p_customerNumber = Column(String(50), nullable=False)
    p_confDuration = Column(String(100), nullable=False)
    p_confStartTime = Column(String(100), nullable=False)
    p_confEndTime = Column(String(100), nullable=False)
    p_confHours = Column(String(100), nullable=False)
    p_action = Column(String(50), nullable=False)
    p_createdAt = Column(DateTime, nullable=True, server_default=func.current_timestamp())


class Teams(Base):
    __tablename__ = "p_teams"

    t_teamId = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    t_accountId = Column(BigInteger, nullable=True)
    t_accountNo = Column(String(100), nullable=True)
    t_teamLeaderId = Column(BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    t_teamMemberId = Column(BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    t_createdOn = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index('idx_team_leader', 't_teamLeaderId'),Index('idx_team_member', 't_teamMemberId'),)


class QueueLogs(Base):
    __tablename__ = "p_queueLogs"

    q_queueId = Column("q_queueId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    q_accountNo = Column("q_accountNo", String(255), nullable=True)
    q_eventType = Column("q_eventType", String(50), nullable=False)
    q_eventSubtype = Column("q_eventSubtype", String(50), nullable=True)
    p_queueCallDate = Column("p_queueCallDate", String(255), nullable=True)
    q_Queue = Column("q_Queue", String(255), nullable=True)
    q_Action = Column("q_Action", String(255), nullable=True)
    q_member = Column("q_member", String(255), nullable=True)
    q_memberType = Column("q_memberType", String(100), nullable=True)
    q_memberSystem = Column("q_memberSystem", String(255), nullable=True)
    q_memberUuid = Column("q_memberUuid", String(255), nullable=True)
    q_memberLeavingTime = Column("q_memberLeavingTime", String(50), nullable=True)
    q_memberJoinedTime = Column("q_memberJoinedTime", String(50), nullable=True)
    q_hangupCause = Column("q_hangupCause", String(255), nullable=True)
    q_cause = Column("q_cause", String(255), nullable=True)
    q_memberSessionUuid = Column("q_memberSessionUuid", String(255), nullable=True)
    q_memberCidName = Column("q_memberCidName", String(255), nullable=True)
    q_memberCidNumber = Column("q_memberCidNumber", String(50), nullable=True)
    q_cliNumber = Column("q_cliNumber", String(50), nullable=True)
    p_createdAt = Column("p_createdAt", TIMESTAMP, nullable=True)
    
class QueueGroups(Base):
    __tablename__ = "p_queuegroups"

    q_recordId = Column("q_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    q_accountId = Column("q_accountId", BigInteger, nullable=False)
    q_accountNo = Column("q_accountNo", String(100), nullable=False)
    q_queuegroupId = Column("q_queuegroupId", BigInteger, nullable=False)
    q_queuegroupName = Column("q_queuegroupName", String(255), nullable=False)
    q_queuegroupStatus = Column("q_queuegroupStatus", String(50), nullable=False)
    q_queuegroupStrategy = Column("q_queuegroupStrategy", String(100), nullable=False)
    q_queuegroupTimeout = Column("q_queuegroupTimeout", Integer, nullable=False)
    q_memberId = Column("q_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    q_memberExtensionNo = Column("q_memberExtensionNo", String(255), nullable=False, unique=True)
    q_createdOn = Column('q_createdOn', TIMESTAMP, nullable=False, default=datetime.utcnow)

class PForm(Base):
    __tablename__ = 'p_form'

    f_formId = Column("f_formId",Integer, primary_key=True, autoincrement=True)
    f_accountId = Column("f_accountId",BigInteger, nullable=False)
    f_accountNo = Column("f_accountNo",String(100), nullable=False)
    f_formName = Column("f_formName",String(255), nullable=False)
    f_formPayload = Column("f_formPayload",JSON, nullable=False)
    f_formcolumnName = Column("f_formcolumnName",Text, nullable=False)
    f_createdOn = Column("f_createdOn",DateTime, server_default=func.now())
    f_updatedOn = Column("f_updatedOn",DateTime, server_default=func.now(), onupdate=func.now())
    
class PRelationalTableCampaignsForm(Base):
    __tablename__ = "p_relationaltable_campaigns_form"

    rcf_recordId = Column("rcf_recordId",BigInteger, primary_key=True, autoincrement=True)
    rcf_accountId = Column("rcf_accountId",BigInteger, nullable=False)
    rcf_accountNo = Column("rcf_accountNo",String(100), nullable=False)
    rcf_campaignsId = Column("rcf_campaignsId",BigInteger, ForeignKey("p_campaigns.c_campaignId", ondelete="CASCADE"), nullable=False)
    rcf_formId = Column("rcf_formId",Integer, ForeignKey("p_form.f_formId", ondelete="CASCADE"), nullable=False)

class MailAutomation(Base):
    __tablename__ = "p_mailAutomation"

    ma_id = Column("ma_id", Integer, primary_key=True, autoincrement=True)
    ma_accountId = Column("ma_accountId", BigInteger, nullable=False)
    ma_accountNo = Column("ma_accountNo", String(100), nullable=False)
    ma_name = Column("ma_name", String(255), nullable=False)
    ma_reportName = Column("ma_reportName", String(100), nullable=False)
    ma_schedule = Column("ma_schedule", String(50), nullable=False)
    ma_time = Column("ma_time", String(20), nullable=False)
    ma_day = Column("ma_day", String(20), nullable=True)
    ma_dataRange = Column("ma_dataRange", String(50), nullable=True, default="previous_day")
    ma_toEmail = Column("ma_toEmail", String(255), nullable=False)
    ma_ccEmail = Column("ma_ccEmail", JSON, nullable=True)
    ma_status = Column("ma_status", String(20), default="ACTIVE")
    ma_extensionFilter = Column("ma_extensionFilter", JSON, nullable=True)
    ma_timezoneFilter = Column("ma_timezoneFilter", String(100), nullable=True)
    ma_fieldsFilter = Column("ma_fieldsFilter", JSON, nullable=True)
    ma_createdOn = Column("ma_createdOn", TIMESTAMP, server_default=func.current_timestamp())


class OneDriveIn(Base):
    __tablename__ = "p_onedrive"

    od_id = Column("od_id", Integer, primary_key=True, autoincrement=True)
    od_accountId = Column("od_accountId", BigInteger, nullable=False)
    od_accountNo = Column("od_accountNo", String(100), nullable=False)
    od_tenantId = Column("od_tenantId", String(255), nullable=False)
    od_clientId = Column("od_clientId", String(225), nullable=False)
    od_clientSecret = Column("od_clientSecret", String(225), nullable=False)
    od_refresh_token = Column("od_refresh_token", Text, nullable=False)
    created_at = Column("od_createdOn",TIMESTAMP,server_default=func.now())
    updated_at = Column("od_updatedOn",TIMESTAMP,server_default=func.now(),onupdate=func.now())
