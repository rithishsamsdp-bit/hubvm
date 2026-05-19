from sqlalchemy import Integer, BigInteger, Float, String, Text, Enum, DateTime, TIMESTAMP, JSON, ForeignKey, func, Index, Column
from sqlalchemy.sql.functions import current_timestamp
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from enum import IntEnum
Base = declarative_base()

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
    a_accountServiceRegion = Column("a_accountServiceRegion", Enum('Domestic','International','International-mid', 'Domestic-mid'), nullable=True)
    a_accountPrefix = Column("a_accountPrefix", BigInteger, nullable=False)
    a_salesRepName = Column("a_salesRepName", String(255), nullable=False)
    a_planName = Column("a_planName", String(255), nullable=False)
    a_planDetails = Column("a_planDetails", JSON, nullable=False)
    a_createdOn = Column("a_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    a_updatedOn = Column("a_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class MediaInstances(Base):
    __tablename__ = "p_mediainstances"

    m_mediaId = Column("m_mediaId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_mediaName = Column("m_mediaName", String(255), nullable=False)
    m_mediaPublicIPAddress = Column("m_mediaPublicIPAddress", String(100), nullable=False)
    m_mediaPrivateIPAddress = Column("m_mediaPrivateIPAddress", String(100), nullable=False)
    m_proxyId = Column("m_proxyId", BigInteger, ForeignKey("p_proxyinstances.p_proxyId", ondelete="CASCADE"), nullable=False)

class ProxyInstances(Base):
    __tablename__ = "p_proxyinstances"

    p_proxyId = Column("p_proxyId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    p_proxyName = Column("p_proxyName", String(255), nullable=False)
    p_proxyDomainName = Column("p_proxyDomainName", String(255), nullable=False)
    p_proxyIPAddress = Column("p_proxyIPAddress", String(100), nullable=False)
    p_proxyPrivateIPAddress = Column("p_proxyPrivateIPAddress", String(100), nullable=False)
    p_codexName = Column("p_codexName", String(100), nullable=False)
    p_proxyDirectoryName = Column("p_proxyDirectoryName", String(100), nullable=False)

class RelationalProxyInstancesAccounts(Base):
    __tablename__ = "r_proxyinstances_accounts"

    r_recordId = Column("r_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    r_accountId = Column('r_accountId', BigInteger, ForeignKey("p_accounts.a_accountId", ondelete="CASCADE"), unique=True, nullable=False)
    r_accountNo = Column("r_accountNo", String(100), nullable=False)
    r_proxyId = Column("r_proxyId", BigInteger, ForeignKey("p_proxyinstances.p_proxyId", ondelete="CASCADE"), nullable=False)


class BlockList(Base):
    __tablename__ = 'p_blacklists'

    p_blacklistId = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    p_blacklistAccountId = Column(Integer, nullable=True)
    p_blacklistAccountNO = Column(String(100), nullable=True)
    p_blacklistNo = Column(BigInteger, unique=True, nullable=False)
    p_blacklistDescription = Column(Text, nullable=False)
    p_blacklistCalltype = Column(String(50), nullable=True)
    p_blacklistStatus = Column(String(20), nullable=True)
    p_blacklistCreatedOn = Column(DateTime, nullable=False, server_default=func.now())
    p_blacklistUpdatedOn = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

class Holiday(Base):
    __tablename__ = 'b_holiday'
    
    name = Column("name", String(100), primary_key=True)
    start_date = Column("start_date",String(100), nullable=False)
    end_date = Column("end_date", String(100), nullable = False)
    msg_enable = Column("msg_enable", String(100), nullable=False)
    message = Column("message",JSON)
    audio_enable = Column("audio_enable", String(100), nullable =False)
    audio_name = Column("audio_name", String(100), nullable = False)

class Shift(Base):
    __tablename__ = 'b_shifts'
    
    shift_id = Column("shift_id", Integer, primary_key = True, autoincrement=True)
    display_name = Column("display_name", String(200), nullable = False)
    
class Days(Base):
    __tablename__ = 'b_days'
    
    day_id = Column("day_id", Integer, primary_key = True, autoincrement=True)
    shift_id = Column("shift_id", Integer, ForeignKey('b_shifts.shift_id', ondelete='CASCADE'), nullable = False)
    day_name = Column("day_name", String(50), nullable = False)
    
class Hours(Base):
    __tablename__ = 'b_hours'
    
    id = Column("id", Integer, primary_key = True, autoincrement=True)
    day_id = Column("day_id", Integer, ForeignKey('b_days.day_id', ondelete='CASCADE'), nullable =False)
    time_from = Column("time_from", String(50), nullable = False)
    time_to = Column("time_to", String(50), nullable = False)
    
    
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

class Contact(Base):
    __tablename__ = "p_contacts"

    c_id = Column('c_id',Integer, primary_key=True, index=True)
    c_phLogin = Column('c_phLogin',String, nullable=True)
    c_accountId = Column('c_accountId',String, nullable=True)
    c_accountNo = Column('c_accountNo',String, nullable=True)
    c_Name = Column('c_Name',String, nullable=False)
    c_countryCode = Column('c_countryCode',String, nullable=True)
    c_phoneNumber = Column('c_phoneNumber',String, nullable=False)
    c_mailId = Column('c_mailId',String, nullable=False)
    c_organizationName = Column('c_organizationName',String, nullable=True)
    c_address = Column('c_address',String, nullable=True)
    c_leadId = Column('c_leadId', String(255), nullable=True, unique=True)
    c_createdOn = Column('c_createdOn',DateTime, default=datetime.utcnow)
    c_updatedOn = Column('c_updatedOn',DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class stress(Base):
    __tablename__ = 'stress'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)

class Peers(Base):
    __tablename__ = 'p_peers'

    p_peerId = Column('p_peerId', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    p_peerName = Column('p_peerName', String(255), nullable=True, unique=True)
    p_peerSecret = Column('p_peerSecret', String(100), nullable=True)
    p_peerHost = Column('p_peerHost', String(100), nullable=True)
    p_peerPort = Column('p_peerPort', String(100), nullable=True)
    p_peerPrefix = Column('p_peerPrefix', String(100), nullable=True)
    p_peerPilotno = Column('p_peerPilotno', String(255), nullable=True)
    p_peerOutboundPrefix = Column('p_peerOutboundPrefix', String(100), nullable=True)
    p_peerInboundPrefix = Column('p_peerInboundPrefix', String(100), nullable=True)
    p_peerType = Column('p_peerType', String(255), nullable=True)
    p_proxyId = Column('p_proxyId', String(255), nullable=True)
    p_proxyName = Column('p_peerProxyName', String(255), nullable=True)
    p_createdOn = Column('p_createdOn', DateTime, nullable=True, server_default=func.current_timestamp())
    p_updatedOn = Column('p_updatedOn', DateTime, nullable=True, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    CLINumbersRelationship = relationship("CLINumbers", back_populates="PeersRelationship", cascade="all, delete-orphan")

class CLINumbers(Base):
    __tablename__ = "p_clinumbers"

    c_clinumberId = Column('c_clinumberId', BigInteger, primary_key=True, autoincrement=True)
    c_accountId = Column('c_accountId', BigInteger, nullable=True)
    c_accountNo = Column('c_accountNo', String(100), nullable=True)
    c_accountPrefix = Column('c_accountPrefix', BigInteger, nullable=True)
    c_clinumberName = Column('c_clinumberName', String(255), unique=True, nullable=False)
    c_clinumberType = Column('c_clinumberType', Enum('Tollfree','Prepaid','Unlimited'), nullable=False)
    c_clinumberCountryCode = Column('c_clinumberCountryCode', String(50), nullable=False)
    c_clinumberCountryName = Column('c_clinumberCountryName', String(255), nullable=False)
    c_clinumberStatus = Column('c_clinumberStatus', Enum('Active','Inactive'), nullable=False)
    c_clinumbermapName = Column('c_clinumbermapName', String(255), nullable=True)
    c_callflowId = Column('c_callflowId', BigInteger, nullable=True)
    c_callflowName = Column('c_callflowName', String(255), nullable=True)
    c_apiIntegration = Column('c_apiIntegration', String(255), nullable=True)
    c_peerId = Column('c_peerId', BigInteger, ForeignKey("p_peers.p_peerId", ondelete="CASCADE"), nullable=True)
    c_createdOn = Column('c_createdOn', DateTime, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column('c_updatedOn', DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    PeersRelationship = relationship("Peers", back_populates="CLINumbersRelationship")
    CLINumberGroupsRelationship = relationship("RelationalDidnumbersGroups",back_populates="CLINumbersRelationship",uselist=False,cascade="all, delete-orphan")
    MembersRelationship = relationship("RelationalCLINumbersMembers",back_populates="CLINumbersRelationship",cascade="all, delete-orphan")
    
class DidNumberGroup(Base):
    __tablename__ = "p_didnumbergroups"

    d_didnumbergroupId = Column(BigInteger, primary_key=True, autoincrement=True)
    d_accountId = Column(BigInteger, nullable=False)
    d_accountNo = Column(String(100), nullable=False)
    d_didnumbergroupName = Column(String(255), nullable=False)
    d_didnumbergroupStatus = Column(Integer, nullable=False, default=1)
    d_createdOn = Column(DateTime, nullable=False, server_default=func.current_timestamp())

    CLINumbersRelationship = relationship("RelationalDidnumbersGroups",back_populates="CLINumberGroupsRelationship",cascade="all, delete-orphan")

class RelationalDidnumbersGroups(Base):
    __tablename__ = "p_relationaltable_didnumbers_didnumbergroups"
    r_recordId = Column(BigInteger, primary_key=True, autoincrement=True)
    r_accountId = Column(BigInteger, nullable=True)
    r_accountNo = Column(String(100), nullable=True)
    r_didnumbergroupId = Column(BigInteger, ForeignKey("p_didnumbergroups.d_didnumbergroupId", ondelete="CASCADE"), nullable=False)
    r_didnumberId = Column(BigInteger, ForeignKey("p_clinumbers.c_clinumberId", ondelete="CASCADE"), nullable=False, unique=True)

    CLINumberGroupsRelationship = relationship("DidNumberGroup", back_populates="CLINumbersRelationship")
    CLINumbersRelationship = relationship("CLINumbers", back_populates="CLINumberGroupsRelationship")

class RelationalCLINumbersMembers(Base):
    __tablename__ = "r_clinumbers_members"
    r_recordId = Column(BigInteger, primary_key=True, autoincrement=True)
    r_accountId = Column(BigInteger, nullable=True)
    r_accountNo = Column(String(100), nullable=True)
    r_memberId = Column(BigInteger, ForeignKey("p_members.m_memberId", ondelete="CASCADE"), nullable=False)
    r_clinumberId = Column(BigInteger, ForeignKey("p_clinumbers.c_clinumberId", ondelete="CASCADE"), nullable=False)
    MembersRelationship = relationship("Members", back_populates="CLINumbersRelationship")
    CLINumbersRelationship = relationship("CLINumbers", back_populates="MembersRelationship")

class Members(Base):
    __tablename__ = "p_members"

    m_memberId = Column('m_memberId', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_accountId = Column('m_accountId', BigInteger, nullable=False)
    m_accountNo = Column('m_accountNo', String(100), nullable=False)
    m_accountCode = Column('m_accountCode', String(100), nullable=False)
    m_memberName = Column('m_memberName', String(255), nullable=False)
    m_memberPassword = Column('m_memberPassword', String(100), nullable=False, default='Pulse@TPL')
    m_memberPasswordHash = Column('m_memberPasswordHash', String(255), nullable=False)
    m_member2FAStatus = Column('m_member2FAStatus', Enum('Active','Inactive'), nullable=False, default='Inactive')
    m_memberRole = Column('m_memberRole', Enum('SUPERADMIN','ADMIN','TL','USER'), nullable=False, default='USER')
    m_memberExtensionNo = Column('m_memberExtensionNo', Integer, unique=True, nullable=False)
    m_memberCallerIdMode = Column(Enum('YES', 'NO', name="membercalleridmode_enum"),nullable=True,default='NO')
    m_memberCallerId = Column('m_memberCallerId', Integer, nullable=False)
    m_memberMobileNo = Column('m_memberMobileNo', Integer, nullable=False)
    m_memberMailId = Column('m_memberMailId', String(255), unique=True, nullable=True)
    m_memberMode = Column('m_memberMode', Enum('BROWSER','SOFTPHONE'), nullable=False, default='BROWSER')
    m_memberPlatformType = Column('m_memberPlatformType', Enum('CALLCENTER','RCM'), nullable=False, default='CALLCENTER')
    m_memberFCMToken = Column('m_memberFCMToken', Text, nullable=True)
    m_clicktocallType = Column('m_clicktocallType', String(255), nullable=True)
    m_readyStatus = Column('m_readyStatus', Enum('READY','NOTREADY'), nullable=True)
    m_readyStatusStartTime = Column('m_readyStatusStartTime', DateTime, nullable=True)
    m_status = Column('m_status', Enum('LOGIN','LOGOUT','BREAK','QUERY', 'LUNCH', 'MEETING'), nullable=True)
    m_statusTime = Column('m_statusTime', DateTime, nullable=True)
    m_campaignId = Column('m_campaignId', BigInteger, nullable=False)
    m_smsMode = Column('m_smsMode', Enum('WEB','MAIL'), nullable=False, server_default='WEB')
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    MemberPlansRelationship = relationship("MemberPlans", backref="MembersRelationship", cascade="all, delete-orphan", uselist=False, passive_deletes=True)
    CLINumbersRelationship = relationship("RelationalCLINumbersMembers", back_populates="MembersRelationship", cascade="all, delete-orphan")

class MemberPlans(Base):
    __tablename__ = "p_memberplans"

    m_memberplanId = Column("m_memberplanId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_memberId = Column("m_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), unique=True, nullable=False)
    m_memberplanDetails = Column("m_memberplanDetails", JSON, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # MembersRelationship = relationship("Peers", back_populates="CLINumbersRelationship")

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
    c_dialerType = Column("c_dialerType", String(255), nullable=False)
    c_campaignRules = Column("c_campaignRules" ,JSON, nullable=True)
    c_queuegroupId = Column("c_queuegroupId" ,String(255), nullable=True)
    c_campaignStatus = Column("c_campaignStatus", String(50), nullable=False)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class Queues(Base):
    __tablename__ = 'p_queue'

    id = Column("id", Integer, primary_key = True, autoincrement=True)
    queue_name = Column("queue_name", String(50), nullable=False, unique=True)
    strategy = Column("strategy", String(50), nullable = False)
    membername = Column("membername",JSON, nullable=False)
    timeout = Column("timeout", Integer, nullable = False)

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
    q_agentwaittime = Column("q_agentwaittime", Integer, nullable=False, default=5)
    q_memberId = Column("q_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    q_memberExtensionNo = Column("q_memberExtensionNo", String(255), nullable=False)
    q_createdOn = Column('q_createdOn', TIMESTAMP, nullable=False, default=datetime.utcnow)

class Tiers(Base):
    __tablename__ = "tiers"

    queue = Column("queue", String(255), nullable=True)
    agent = Column("agent", String(255), primary_key=True, nullable=False)
    state = Column("state", String(255), nullable=True)
    level = Column("level", Integer, default=1, nullable=False)
    position = Column("position", Integer, default=1, nullable=False)

class Agents(Base):
    __tablename__ = "agents"

    queue = Column("queue", String(255), nullable=True)
    name = Column("name", String(255), primary_key=True, nullable=False)
    instance_id = Column("instance_id", String(255), nullable=True)
    uuid = Column("uuid", String(255), nullable=True)
    type = Column("type", String(255), nullable=True)
    contact = Column("contact", String(1024), nullable=True)
    status = Column("status", String(255), nullable=True)
    state = Column("state", String(255), nullable=True)
    max_no_answer = Column("max_no_answer", Integer, default=0, nullable=False)
    wrap_up_time = Column("wrap_up_time", Integer, default=0, nullable=False)
    reject_delay_time = Column("reject_delay_time", Integer, default=0, nullable=False)
    busy_delay_time = Column("busy_delay_time", Integer, default=0, nullable=False)
    no_answer_delay_time = Column("no_answer_delay_time", Integer, default=0, nullable=False)
    last_bridge_start = Column("last_bridge_start", Integer, default=0, nullable=False)
    last_bridge_end = Column("last_bridge_end", Integer, default=0, nullable=False)
    last_offered_call = Column("last_offered_call", Integer, default=0, nullable=False)
    last_status_change = Column("last_status_change", Integer, default=0, nullable=False)
    no_answer_count = Column("no_answer_count", Integer, default=0, nullable=False)
    calls_answered = Column("calls_answered", Integer, default=0, nullable=False)
    talk_time = Column("talk_time", Integer, default=0, nullable=False)
    ready_time = Column("ready_time", Integer, default=0, nullable=False)
    external_calls_count = Column("external_calls_count", Integer, default=0, nullable=False)
    dialer_type = Column("dialer_type", String(255), default="MANUAL", nullable=True)
    agent_exten = Column("agent_exten", String(255), nullable=True)

class CallFlows(Base):
    __tablename__ = "p_callflows"

    c_callflowId = Column('c_callflowId', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    c_accountId = Column("c_accountId", BigInteger, nullable=False)
    c_accountNo = Column("c_accountNo", String(100), nullable=False)
    c_callflowName = Column('c_callflowName', String(255), nullable=False)
    c_callflowData = Column('c_callflowData', JSON, nullable=False)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class Leads(Base):
    __tablename__ = "p_leads"

    l_recordId = Column("l_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    l_accountId = Column('l_accountId', BigInteger, nullable=True)
    l_accountNo = Column('l_accountNo', String(100), nullable=True)
    l_leadId = Column("l_leadId", String(255), unique=True, nullable=True)
    l_leadPhoneNo = Column('l_leadPhoneNo', BigInteger, nullable=True)
    l_leadOwner = Column('l_leadOwner', Integer, nullable=True)
    l_createdOn = Column("l_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    l_updatedOn = Column("l_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())


class Conversations(Base):
    __tablename__ = "p_conversations"

    c_recordId = Column("c_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    c_accountId = Column("c_accountId", BigInteger, nullable=True)
    c_accountNo = Column("c_accountNo", String(100), nullable=True)
    c_conversationId = Column("c_conversationId", String(255), unique=True, nullable=True)
    c_conversationPhoneNo = Column("c_conversationPhoneNo", BigInteger, nullable=True)
    c_conversationOwner = Column("c_conversationOwner", Integer, nullable=True)
    c_conversationChannel = Column("c_conversationChannel", Enum('Pulse','Whatsapp','SMS'), nullable=True)
    c_conversationType = Column("c_conversationType", Enum('Call','Message','Conference Call'), nullable=True)
    c_conversationDetails = Column("c_conversationDetails", JSON, nullable=True)
    c_conversationStatus = Column("c_conversationStatus", Enum('Active','Inactive'), nullable=True)
    c_leadId = Column("c_leadId", String(255), nullable=True)
    c_taskId = Column("c_taskId", String(255), nullable=True)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())       
    
class PForm(Base):
    __tablename__ = 'p_form'

    f_formId = Column("f_formId",Integer, primary_key=True, autoincrement=True)
    f_accountId = Column("f_accountId",BigInteger, nullable=False)
    f_accountNo = Column("f_accountNo",String(100), nullable=False)
    f_formName = Column("f_formName",String(255), nullable=False)
    f_formPayload = Column("f_formPayload",JSON, nullable=False)
    f_formCsvTemplate = Column("f_formCsvTemplate",JSON, nullable=True)
    f_formcolumnName = Column("f_formcolumnName",Text, nullable=False)
    f_createdOn = Column("f_createdOn",DateTime, server_default=func.now())
    f_updatedOn = Column("f_updatedOn",DateTime, server_default=func.now(), onupdate=func.now())
    
class PRelationalTableCampaignsDidNumberGroups(Base):
    __tablename__ = "p_relationaltable_campaigns_didnumbergroups"

    rcd_recordId = Column("rcd_recordId",BigInteger, primary_key=True, autoincrement=True)
    rcd_accountId = Column("rcd_accountId",BigInteger, nullable=False)
    rcd_accountNo = Column("rcd_accountNo",String(100), nullable=False)
    rcd_campaignsId = Column("rcd_campaignsId",BigInteger,ForeignKey("p_campaigns.c_campaignId", ondelete="CASCADE", onupdate="CASCADE"),nullable=False)
    rcd_didnumbergroupsId = Column("rcd_didnumbergroupsId",BigInteger,ForeignKey("p_didnumbergroups.d_didnumbergroupId", ondelete="CASCADE", onupdate="CASCADE"),nullable=False)
    
class PRelationalTableCampaignsForm(Base):
    __tablename__ = "p_relationaltable_campaigns_form"

    rcf_recordId = Column("rcf_recordId",BigInteger, primary_key=True, autoincrement=True)
    rcf_accountId = Column("rcf_accountId",BigInteger, nullable=False)
    rcf_accountNo = Column("rcf_accountNo",String(100), nullable=False)
    rcf_campaignsId = Column("rcf_campaignsId",BigInteger, ForeignKey("p_campaigns.c_campaignId", ondelete="CASCADE"), nullable=False)
    rcf_formId = Column("rcf_formId",Integer, ForeignKey("p_form.f_formId", ondelete="CASCADE"), nullable=False)

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
    l_memberStatus = Column("l_memberStatus",Enum("RINGING","INCALL","IDLE","BREAK","QUERY","LUNCH","MEETING","UNAVAILABLE"),nullable=True)
    l_memberServerIp = Column("l_memberServerIp",String(45), nullable=True)
    l_memberLastUpdated = Column("l_memberLastUpdated",TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    __table_args__ = (Index("idx_campaign", "l_memberCampaignId"),Index("idx_status", "l_memberStatus"),)

class Teams(Base):
    __tablename__ = "p_teams"

    t_teamId = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    t_accountId = Column(BigInteger, nullable=True)
    t_accountNo = Column(String(100), nullable=True)
    t_teamLeaderId = Column(BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    t_teamLeaderExtensionNo = Column(String(100), nullable=True)
    t_teamMemberId = Column(BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=False)
    t_teamMemberExtensionNo = Column(String(100), nullable=True)
    t_createdOn = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index('idx_team_leader', 't_teamLeaderId'),Index('idx_team_member', 't_teamMemberId'),)

class API(Base):
    __tablename__ = "p_api"

    a_apiId = Column("a_apiId",Integer, primary_key=True, autoincrement=True)
    a_cliNumberId = Column(Integer,ForeignKey("p_clinumbers.c_clinumberId", ondelete="CASCADE"),nullable=False)
    a_apiType = Column("a_apiType",Enum("CALLINIT", "POSTCALL", name="api_type_enum"),nullable=False)
    a_apiURL = Column("a_apiURL",String(500), nullable=False)
    a_method = Column("a_method",Enum("GET", "POST", "PUT", "DELETE", name="http_method_enum"),default="POST")
    a_jsonBody = Column("a_jsonBody",JSON, nullable=True)
    a_createdAt = Column("a_createdAt",TIMESTAMP,server_default=func.current_timestamp())
    a_updatedAt = Column("a_updatedAt",TIMESTAMP,server_default=func.current_timestamp(),onupdate=func.current_timestamp())

    __table_args__ = (Index("idx_number_api", "a_cliNumberId", "a_apiType"),)

class SmsFlow(Base):
    __tablename__ = "p_smsFlow"

    s_flowId = Column("s_flowId", BigInteger, primary_key=True, autoincrement=True)
    s_accountId = Column("s_accountId", BigInteger, nullable=True)
    s_accountNo = Column("s_accountNo", String(100), nullable=True)
    s_smsclinumberId = Column("s_smsclinumberId", BigInteger, nullable=True)
    s_smsFlowJson = Column("s_smsFlowJson", JSON, nullable=True)
    s_createdAt = Column("s_createdAt", TIMESTAMP, nullable=True)
    s_updatedAt = Column("s_updatedAt", TIMESTAMP, nullable=True)

# class IntegrationAPIs(Base):
#     __tablename__ = "p_integrationapis"

#     i_integrationapiId = Column("i_integrationapiId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
#     i_clinumberId = Column("i_clinumberId", BigInteger, ForeignKey("p_clinumbers.c_clinumberId", ondelete="CASCADE"),nullable=True)
#     i_clinumberName = Column("i_clinumberName", String(255), nullable=True)
#     i_callflowId = Column("i_callflowId", BigInteger, nullable=True)
#     i_callflowName = Column("i_callflowName", String(255), nullable=True)
#     i_integrationapiTriggerEvent = Column("i_integrationapiTriggerEvent", Enum("OUTBOUND-INITIATION", "OUTBOUND-ANSWER", "OUTBOUND-TERMINATION"), nullable=False)
#     i_integrationapiEndpoint = Column("i_integrationapiEndpoint",String(500), nullable=True)
#     i_integrationapiMethod = Column("i_integrationapiMethod", Enum("GET", "POST", "PUT", "DELETE"), default="POST", nullable=False)
#     i_integrationapiHeader = Column("i_integrationapiHeader", String(500), nullable=True)
#     i_integrationapiPayload = Column("i_integrationapiPayload", JSON, nullable=True)

class ExternalIntegrationAPIs(Base):
    __tablename__ = "p_externalintegrationapis"

    e_integrationapiId = Column("e_integrationapiId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    e_accountId = Column("e_accountId", BigInteger, nullable=True)
    e_integrationapiName = Column("e_integrationapiName",String(255), nullable=True)
    e_integrationapiTriggerEvent = Column("e_integrationapiTriggerEvent", Enum("OUTBOUND-INITIATION", "OUTBOUND-ANSWER", "OUTBOUND-TERMINATION"), nullable=False)
    e_integrationapiEndpoint = Column("e_integrationapiEndpoint",String(500), nullable=True)
    e_integrationapiMethod = Column("e_integrationapiMethod", Enum("GET", "POST", "PUT", "DELETE"), default="POST", nullable=False)
    e_integrationapiHeader = Column("e_integrationapiHeader", JSON, nullable=True)
    e_integrationapiQueryParams = Column("e_integrationapiQueryParams", JSON, nullable=True)

class RelationalExternalIntegrationAPIsCLINumbersCallFlows(Base):
    __tablename__ = "r_externalintegrationapis_clinumbers_callflows"
    
    r_recordId = Column("r_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    r_accountId = Column("r_accountId", BigInteger, nullable=True)
    r_callflowId = Column("r_callflowId", BigInteger, ForeignKey("p_callflows.c_callflowId", ondelete="CASCADE"), nullable=True)
    r_clinumberId = Column("r_clinumberId", BigInteger, ForeignKey("p_clinumbers.c_clinumberId", ondelete="CASCADE"), nullable=True)
    r_clinumberName = Column("r_clinumberName",String(100), nullable=True)
    r_integrationapiId = Column("r_integrationapiId", BigInteger, ForeignKey("p_externalintegrationapis.e_integrationapiId", ondelete="CASCADE"), nullable=True)

class EmergencyCampaign(Base):
    __tablename__ = "p_emergency_campaigns"

    e_campaignId = Column("e_campaignId", BigInteger, primary_key=True, autoincrement=True)
    e_accountId = Column("e_accountId", BigInteger, nullable=False)
    e_accountNo = Column("e_accountNo", String(100), nullable=False)
    e_campaignName = Column("e_campaignName", String(255), nullable=False)
    e_priority = Column("e_priority", Enum('HIGH', 'MEDIUM', 'LOW'), nullable=False)
    e_category = Column("e_category", String(100), nullable=False) # e.g., SECURITY, HEALTH
    e_primaryLanguage = Column("e_primaryLanguage", String(100), nullable=False)
    e_interactionMode = Column("e_interactionMode", String(100), nullable=False)
    e_status = Column("e_status", Enum('DRAFT', 'SCHEDULED', 'EXECUTING', 'COMPLETED', 'FAILED'), default='DRAFT', nullable=False)
    e_scheduleType = Column("e_scheduleType", Enum('IMMEDIATE', 'SCHEDULED'), default='IMMEDIATE', nullable=False)
    e_scheduleTime = Column("e_scheduleTime", DateTime, nullable=True)
    e_orchestrationId = Column("e_orchestrationId", String(255), nullable=True) # Linked to MongoDB Document
    e_totalLeads = Column("e_totalLeads", Integer, default=0)
    e_reachedLeads = Column("e_reachedLeads", Integer, default=0)
    e_proxyId = Column("e_proxyId", BigInteger, nullable=True) # For domain based SIP URI
    e_proxyDomainName = Column("e_proxyDomainName", String(255), nullable=True) # For SSL compatibility
    e_proxyDirectoryName = Column("e_proxyDirectoryName", String(100), nullable=True) # For FSW directory access
    e_createdOn = Column("e_createdOn", TIMESTAMP, server_default=func.current_timestamp())
    e_updatedOn = Column("e_updatedOn", TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class EmergencyGroup(Base):
    __tablename__ = "p_emergency_groups"

    eg_groupId = Column("eg_groupId", BigInteger, primary_key=True, autoincrement=True)
    eg_accountId = Column("eg_accountId", BigInteger, nullable=False)
    eg_accountNo = Column("eg_accountNo", String(100), nullable=False)
    eg_groupName = Column("eg_groupName", String(255), nullable=False)
    eg_createdOn = Column("eg_createdOn", TIMESTAMP, server_default=func.current_timestamp())

class EmergencyGroupContact(Base):
    __tablename__ = "p_emergency_group_contacts"

    egc_recordId = Column("egc_recordId", BigInteger, primary_key=True, autoincrement=True)
    egc_groupId = Column("egc_groupId", BigInteger, ForeignKey("p_emergency_groups.eg_groupId", ondelete="CASCADE"), nullable=False)
    egc_contactName = Column("egc_contactName", String(255), nullable=True)
    egc_contactPhone = Column("egc_contactPhone", String(20), nullable=False)


class EmergencyIVRLog(Base):
    __tablename__ = "p_ivr_calls"

    c_logId = Column("c_logId", BigInteger, primary_key=True, autoincrement=True)
    c_accountId = Column("c_accountId", BigInteger, nullable=True)
    c_accountNo = Column("c_accountNo", String(100), nullable=True)
    c_callId = Column("c_callId", String(255), nullable=False)
    c_customerPhoneno = Column("c_customerPhoneno", String(255), nullable=True)
    c_disposition = Column("c_disposition", String(100), nullable=True)
    c_startTime = Column("c_startTime", String(100), nullable=True)
    c_endTime = Column("c_endTime", String(100), nullable=True)
    c_answerTime = Column("c_answerTime", String(100), nullable=True)
    c_duration = Column("c_duration", Integer, nullable=True)
    c_ivrResponse = Column("c_ivrResponse", Text, nullable=True)
    c_campaignId = Column("c_campaignId", BigInteger, nullable=True)
    c_createdOn = Column("c_createdOn", TIMESTAMP, server_default=func.current_timestamp())
    c_updatedOn = Column("c_updatedOn", TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class SmsReport(Base):
    __tablename__ = "sms_reports"

    id = Column("id", Integer, primary_key=True, autoincrement=True)
    msg_type = Column("msg_type", String(10))
    sender_id = Column("sender_id", String(15))
    mobile_number = Column("mobile_number", String(20))
    message_content = Column("message_content", Text)
    delivery_status = Column("delivery_status", String(50))
    submit_date = Column("submit_date", String(50))
    done_date = Column("done_date", String(50))
    status_code = Column("status_code", String(10))
    unit = Column("unit", Integer)
    unique_id = Column("unique_id", String(100), index=True)
    extra_res = Column("extra_res", String(50))
    dlt_temp_id = Column("dlt_temp_id", String(50))
    dlt_entity_id = Column("dlt_entity_id", String(50))
    client_uid = Column("client_uid", String(50))
    internal_created_at = Column("internal_created_at", TIMESTAMP)

class EmergencySmsTemplate(Base):
    __tablename__ = "p_emergency_sms_templates"

    est_templateId = Column("est_templateId", Integer, primary_key=True, autoincrement=True)
    est_sender = Column("est_sender", String(15), nullable=False)
    est_templateName = Column("est_templateName", String(255), nullable=False)
    est_dltTemplateId = Column("est_dltTemplateId", String(50), nullable=False)
    est_templateMessage = Column("est_templateMessage", Text, nullable=False)
    est_dltEntityId = Column("est_dltEntityId", String(50), nullable=False)
    est_status = Column("est_status", Integer, default=1)
    est_createdOn = Column("est_createdOn", TIMESTAMP, server_default=func.current_timestamp())
