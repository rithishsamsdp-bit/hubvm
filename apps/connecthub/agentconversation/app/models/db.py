from sqlalchemy import Integer, Float, String, Enum, DateTime, ForeignKey,JSON, BigInteger, TIMESTAMP, Text, func, UniqueConstraint, Index, Column
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import enum
def get_database(db_name: str):
    MONGO_URI = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[db_name]
    return client, db

Base = declarative_base()

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

class Tasks(Base):
    __tablename__ = "p_tasks"

    t_recordId = Column("t_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    t_accountId = Column("t_accountId", BigInteger, nullable=True)
    t_accountNo = Column("t_accountNo", String(100), nullable=True)
    t_taskId = Column("t_taskId", String(255), unique=True, nullable=True)
    t_taskPhoneNo = Column("t_taskPhoneNo", BigInteger, nullable=True)
    t_taskOwner = Column("t_taskOwner", Integer, nullable=True)
    t_taskChannel = Column("t_taskChannel", Enum('Pulse','Whatsapp','SMS'), nullable=True)
    t_taskDirection = Column("t_taskDirection", Enum('Inbound','Outbound'), nullable=True)
    t_taskType = Column("t_taskType", Enum('Call','Message'), nullable=True)
    t_taskDetails = Column("t_taskDetails", JSON, nullable=True)
    t_taskFollowup = Column("t_taskFollowup", JSON, nullable=True)
    t_taskFollowupDuration = Column("t_taskFollowupDuration", Integer, nullable=True)
    t_leadId = Column("t_leadId", String(255), nullable=True)
    t_conversationId = Column("t_conversationId", String(255), unique=True, nullable=True)
    t_campaignId = Column("t_campaignId", BigInteger, nullable=True)
    t_createdOn = Column("t_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    t_updatedOn = Column("t_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class RelationalCallsLeadsConversations(Base):
    __tablename__ = "r_calls_leads_conversations"
    r_recordId = Column("r_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    r_accountId = Column("r_accountId", BigInteger, nullable=True)
    r_accountNo = Column("r_accountNo", String(100), nullable=True)
    r_callId = Column('r_callId', String(255), unique=True, nullable=True)
    r_leadId = Column("r_leadId", String(255), nullable=True)
    r_conversationId = Column("r_conversationId", String(255), nullable=True)

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
    c_campaignId = Column('c_campaignId', BigInteger, nullable=True)
    c_clinumberId = Column('c_clinumberId', BigInteger, nullable=True)
    c_clinumberName = Column('c_clinumberName', String(255), nullable=True)
    c_wssUrl = Column('c_wssUrl', Text, nullable=True)
    c_clientUniqueId = Column('c_clientUniqueId', String(255), nullable=True)
    c_dial_method = Column('c_dial_method', String(50), nullable=True)
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

class Accounts(Base):
    __tablename__ = "p_accounts"
    def __repr__(self):
        return f"<{self.__class__.__name__}(" + ", ".join(
            f"{col.name}={getattr(self, col.name)!r}"
            for col in self.__table__.columns
        ) + ")>"
    a_accountId = Column("a_accountId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    a_accountNo = Column("a_accountNo", String(100), unique=True, nullable=False)
    a_accountName = Column("a_accountName", String(255), nullable=False)
    a_accountCode = Column("a_accountCode", String(100), unique=True, nullable=False)
    a_accountEncryption = Column("a_accountEncryption", String(255), nullable=False)
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
    m_memberFCMToken = Column('m_memberFCMToken', Text, nullable=True)
    m_memberOSType = Column('m_memberOSType', String(255), nullable=True)
    m_memberPlatformType = Column('m_memberPlatformType',Enum('CALLCENTER','RCM'), nullable=False, server_default='CALLCENTER')
    m_readyStatus = Column('m_readyStatus',Enum('READY','NOTREADY'), nullable=True)
    m_readyStatusStartTime = Column('m_readyStatusStartTime',DateTime, nullable=True)
    m_status = Column('m_status',Enum('LOGIN','LOGOUT','BREAK','QUERY','RESTROOM','LUNCH','MEETING'), nullable=True)
    m_statusTime = Column('m_statusTime',DateTime, nullable=True)
    m_campaignId = Column('m_campaignId',BigInteger, nullable=True)
    m_createdOn = Column('m_createdOn',TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column('m_updatedOn',TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    plan = relationship("MemberPlans", backref="member", cascade="all, delete-orphan", uselist=False, passive_deletes=True)
    # liveMonitoring = relationship("LiveMonitoring",back_populates="member",cascade="all, delete-orphan")

class Agents(Base):
    __tablename__ = "agents"
    queue = Column("queue", String(255), nullable=True)
    name = Column("name", String(255), ForeignKey('p_queuegroups.q_memberExtensionNo', ondelete='CASCADE'), primary_key=True, nullable=True)
    instance_id = Column("instance_id", String(255), nullable=True)
    uuid = Column("uuid", String(255), nullable=True)
    type = Column("type", String(255), nullable=True)
    contact = Column("contact", String(255), nullable=True)
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
    dialer_type = Column("dialer_type", String(255), nullable=True)
    agent_exten = Column("agent_exten", String(255), nullable=True)
    
class MemberPlans(Base):
    __tablename__ = "p_memberplans"

    m_memberplanId = Column("m_memberplanId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_memberId = Column("m_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), unique=True, nullable=False)
    m_memberplanDetails = Column("m_memberplanDetails", JSON, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

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
    p_proxyId = Column('p_proxyId', String(255), nullable=True)
    p_proxyName = Column('p_peerProxyName', String(255), nullable=True)
    p_createdOn = Column('p_createdOn', DateTime, nullable=True, server_default=func.current_timestamp())
    p_updatedOn = Column('p_updatedOn', DateTime, nullable=True, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    cli_numbers = relationship("CLINumbers", back_populates="peer", cascade="all, delete-orphan")

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
    c_peerId = Column('c_peerId', BigInteger, ForeignKey("p_peers.p_peerId", ondelete="CASCADE"), nullable=True)
    c_createdOn = Column('c_createdOn', DateTime, nullable=False, server_default=func.current_timestamp())
    c_updatedOn = Column('c_updatedOn', DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    peer = relationship("Peers", back_populates="cli_numbers")
    group_mapping = relationship("RelationalDidnumbersGroups",back_populates="clinumber",uselist=False,cascade="all, delete-orphan")

class DidNumberGroup(Base):
    __tablename__ = "p_didnumbergroups"

    d_didnumbergroupId = Column(BigInteger, primary_key=True, autoincrement=True)
    d_accountId = Column(BigInteger, nullable=False)
    d_accountNo = Column(String(100), nullable=False)
    d_didnumbergroupName = Column(String(255), nullable=False)
    d_didnumbergroupStatus = Column(Integer, nullable=False, default=1)
    d_createdOn = Column(DateTime, nullable=False, server_default=func.current_timestamp())

    # Relationships
    didnumber_mappings = relationship(
        "RelationalDidnumbersGroups",
        back_populates="didnumbergroup",
        cascade="all, delete-orphan"
    )
    
class RelationalDidnumbersGroups(Base):
    __tablename__ = "p_relationaltable_didnumbers_didnumbergroups"
    r_recordId = Column(BigInteger, primary_key=True, autoincrement=True)
    r_accountId = Column(BigInteger, nullable=True)
    r_accountNo = Column(String(100), nullable=True)
    r_didnumbergroupId = Column(BigInteger, ForeignKey("p_didnumbergroups.d_didnumbergroupId", ondelete="CASCADE"), nullable=False)
    r_didnumberId = Column(BigInteger, ForeignKey("p_clinumbers.c_clinumberId", ondelete="CASCADE"), nullable=False, unique=True)
    didnumbergroup = relationship("DidNumberGroup", back_populates="didnumber_mappings")
    clinumber = relationship("CLINumbers", back_populates="group_mapping")

class AgentStatus(Base):
    __tablename__ = 'p_agentstatus'

    a_logId = Column(BigInteger, primary_key=True, autoincrement=True)
    a_memberId = Column(BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    a_accountId = Column(BigInteger, nullable=False)
    a_accountNo = Column(String(100), nullable=False)
    a_memberExtensionNo = Column(Integer, nullable=False)
    a_status = Column(Enum('READY','NOTREADY','BREAK','QUERY','LUNCH','MEETING','RESTROOM','LOGIN','LOGOUT', name='agent_status_enum'), nullable=False)
    a_startTime = Column(DateTime, nullable=False)
    a_endTime = Column(DateTime, nullable=True)
    a_durationSeconds = Column(Integer, nullable=True)
    a_createdOn = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index('idx_a_memberId', 'a_memberId'),Index('idx_a_status', 'a_status'),Index('idx_a_createdOn', 'a_createdOn'),{'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_0900_ai_ci'})
    
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

class LiveMonitoring(Base):
    __tablename__ = "p_liveMonitoring"

    l_id = Column("l_id",BigInteger, primary_key=True, autoincrement=True)
    l_memberAccountId = Column("l_memberAccountId",BigInteger, nullable=False)
    l_memberAccountNo = Column("l_memberAccountNo",String(100), nullable=False)
    l_membermemberId = Column("l_membermemberId",BigInteger, ForeignKey("p_members.m_memberId", ondelete="CASCADE"), nullable=False, index=True)
    l_memberExtention = Column("l_memberExtention",String(20), nullable=False)
    l_memberName = Column("l_memberName",String(100), nullable=False)
    l_memberCampaignId = Column("l_memberCampaignId",BigInteger, nullable=True, index=True)
    l_memberCampaignName = Column("l_memberCampaignName",String(100), nullable=True)
    l_memberCustomerNumber = Column("l_memberCustomerNumber",String(20), nullable=True)
    l_memberCliNumberId = Column("l_memberCliNumberId",BigInteger, nullable=True)
    l_memberCallDirection = Column("l_memberCallDirection",Enum('INBOUND','OUTBOUND'), nullable=True)
    l_memberuuid = Column("l_memberuuid",String(64), unique=True, nullable=True)
    l_memberStatus = Column("l_memberStatus",Enum('RINGING','INCALL','AVAILABLE','BREAK','QUERY','LUNCH','MEETING','UNAVAILABLE'),nullable=True,index=True)
    l_memberServerIp = Column("l_memberServerIp",String(45), nullable=True)
    l_memberLastUpdated = Column("l_memberLastUpdated",TIMESTAMP, nullable=True, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # member = relationship("Members", back_populates="liveMonitoring")

class CallBackReminders(Base):
    __tablename__ = "p_callbackreminders"

    c_recordId = Column("c_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    c_accountId = Column("c_accountId", BigInteger, nullable=False)
    c_accountNo = Column("c_accountNo", String(100), nullable=False)
    c_phonenumber = Column("c_phonenumber", String(255), nullable=True)
    c_timestamp = Column("c_timestamp", String(255), nullable=True)
    c_memberExtensionNo = Column("c_memberExtensionNo", String(100), nullable=True)
    c_memberId = Column("c_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=True)
    c_createdOn = Column("c_createdOn", TIMESTAMP, nullable=False, default=datetime.utcnow)

class Notifications(Base):
    __tablename__ = "p_notifications"

    n_notificationId = Column("n_notificationId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    n_accountId = Column("n_accountId", BigInteger, nullable=True)
    n_accountNo = Column("n_accountNo", String(100), nullable=True)
    n_notificationType = Column("n_notificationType",Enum('CALLBACK', 'INCOMING', 'MISSEDCALL', 'CUSTOM', 'INCOMINGSMS'),nullable=True)
    n_notificationData = Column("n_notificationData", JSON, nullable=True)
    n_notificationTime = Column("n_notificationTime", String(255), nullable=True)
    n_memberExtensionNo = Column("n_memberExtensionNo", String(100), nullable=True)
    n_memberId = Column("n_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), nullable=True)
    n_notificationStatus = Column("n_notificationStatus", Enum('READ','UNREAD', 'DISMISSED'), server_default='UNREAD', nullable=True)
    n_createdOn = Column("n_createdOn", TIMESTAMP, nullable=False, default=datetime.utcnow)


class Teams(Base):
    __tablename__ = "p_teams"

    t_teamId = Column("t_teamId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    t_accountId = Column("t_accountId", BigInteger, nullable=True)
    t_accountNo = Column("t_accountNo", String(100), nullable=True)
    t_teamLeaderId = Column("t_teamLeaderId", BigInteger, nullable=False)
    t_teamLeaderExtensionNo = Column("t_teamLeaderExtensionNo", String(100), nullable=True)
    t_teamMemberId = Column("t_teamMemberId", BigInteger, nullable=False)
    t_teamMemberExtensionNo = Column("t_teamMemberExtensionNo", String(100), nullable=True)
    t_createdOn = Column("t_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())

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
    c_memberExtensionNo = Column(String(50), nullable=True)
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

class ExternalIntegrationAPIs(Base):
    __tablename__ = "p_externalintegrationapis"

    e_integrationapiId = Column("e_integrationapiId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    e_accountId = Column("e_accountId", BigInteger, nullable=True)
    e_integrationapiName = Column("e_integrationapiName", String(255), nullable=True)
    e_integrationapiTriggerEvent = Column("e_integrationapiTriggerEvent", Enum("OUTBOUND_CALL_COMPLETED","INBOUND_CALL_COMPLETED","INBOUND_CALL_RECEIVED"), nullable=False)
    e_integrationapiEndpoint = Column("e_integrationapiEndpoint", String(500), nullable=True)
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

class ExternalIntegrationAPILogs(Base):
    __tablename__ = "p_externalintegrationapilogs"

    e_logId = Column("e_logId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    e_integrationapiId = Column("e_integrationapiId", BigInteger, nullable=False)
    e_integrationapiName = Column("e_integrationapiName", String(255), nullable=True)
    e_accountId = Column("e_accountId", BigInteger, nullable=True)
    e_clinumberName = Column("e_clinumberName", String(100), nullable=True)
    e_integrationapiTriggerEvent = Column("e_integrationapiTriggerEvent", Enum("OUTBOUND_CALL_COMPLETED","INBOUND_CALL_COMPLETED","INBOUND_CALL_RECEIVED"), nullable=False)

    e_integrationapiEndpoint = Column("e_integrationapiEndpoint", Text, nullable=True)
    e_integrationapiMethod = Column("e_integrationapiMethod", Enum("GET", "POST", "PUT", "DELETE"), default="POST", nullable=False)
    e_integrationapiHeader = Column("e_integrationapiHeader", JSON, nullable=True)
    e_integrationapiQueryParams = Column("e_integrationapiQueryParams", JSON, nullable=True)

    e_responseStatusCode = Column("e_responseStatusCode", Integer, nullable=True)
    e_responseBody = Column("e_responseBody", Text, nullable=True)
    e_responseStatus = Column("e_responseStatus", Enum('SUCCESS', 'FAILED', name='api_log_status'), nullable=False)
    e_errorMessage = Column("e_errorMessage", Text, nullable=True)
    e_executedAt = Column("e_executedAt", DateTime, server_default=func.now())
    e_responseTimeMs = Column("e_responseTimeMs", Integer, nullable=True)
    e_callId = Column("e_callId", String(255), nullable=True)

class StatusEnum(str, enum.Enum):
    READY = "READY"
    NOTREADY = "NOTREADY"

class DIDNumbers(Base):
    __tablename__  = "p_didnumbers"

    d_didnumberId = Column("d_didnumberId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    d_accountId = Column("d_accountId", BigInteger, nullable=False)
    d_accountNo = Column("d_accountNo", String(100), nullable=False)
    d_didnumberName = Column("d_didnumberName", String(255), nullable=False)
    d_didnumberSecret = Column("d_didnumberSecret", String(100), nullable=False)
    d_didnumberHost = Column("d_didnumberHost", String(100), nullable=False)
    d_didnumberPrefix = Column("d_didnumberPrefix", Integer, nullable=False)
    d_didnumberPort = Column("d_didnumberPort", Integer, nullable=False)
    d_didnumberStatus = Column("d_didnumberStatus", String(50), nullable=False)
    d_createdOn = Column("d_createdOn", DateTime, nullable=False, server_default=func.now())
    d_updatedOn = Column("d_updatedOn", DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

class stress(Base):
    __tablename__ = 'stress'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)

class Queues(Base):
    __tablename__ = 'p_queue'

    id = Column("id", Integer, primary_key = True, autoincrement=True)
    queue_name = Column("queue_name", String(50), nullable=False, unique=True)
    strategy = Column("strategy", String(50), nullable = False)
    membername = Column("membername",JSON, nullable=False)
    timeout = Column("timeout", Integer, nullable = False)
    
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
    
class BlockList(Base):
    __tablename__ = 'p_blacklists'

    b_blacklistId = Column("b_blacklistId", Integer, primary_key=True, autoincrement=True, nullable=False)
    b_blacklistNo = Column("b_blacklistNo", BigInteger, unique=True, nullable=False)
    b_blacklistDescription = Column("b_blacklistDescription", Text, nullable=False)
    b_createdOn = Column("b_createdOn", DateTime, nullable=False, server_default=func.now())
    b_updatedOn = Column("b_updatedOn", DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

class IvrCarriers(Base):
    __tablename__ = 'p_ivrcarriers'

    i_carrierId = Column('i_carrierId', Integer, primary_key=True, autoincrement=True, nullable=False)
    i_carrierName = Column('i_carrierName', String(30), nullable=False)
    i_carrierSecret = Column('i_carrierSecret', String(30), nullable=False)
    i_carrierHost = Column('i_carrierHost', String(30), nullable=False)
    i_carrierPort = Column('i_carrierPort', Integer, nullable=False)
    i_carrierPrefix = Column('i_carrierPrefix', Integer, nullable=True)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    r_account_id = Column('r_account_id', BigInteger, nullable=True)
    r_pod_name = Column('r_pod_name', String(100), nullable=True)

# class Contact(Base):
#     __tablename__ = "p_contacts"

#     c_recordId = Column('c_recordId', primary_key=True, autoincrement=True, nullable=False)
#     c_memberExtensionNo = Column('c_memberExtensionNo', Integer, nullable=True)
#     c_accountId = Column('c_accountId', Integer, nullable=True)
#     c_accountNo = Column('c_accountNo', String(100), nullable=True)
#     c_contactName = Column('c_contactName', String(255), nullable=True)
#     c_contactPhoneNo = Column('c_contactPhoneNo', BigInteger, nullable=True)
#     c_contactMailId = Column('c_contactMailId', String(255), nullable=True)
#     c_contactOrgName = Column('c_contactOrgName', String(255), nullable=True)
#     c_contactAddress = Column('c_contactAddress', String(255), nullable=True)
#     c_createdOn = Column('c_createdOn', DateTime, nullable=False, default=datetime.utcnow)
#     c_updatedOn = Column('c_updatedOn', DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class LiveQueueMembers(Base):
    __tablename__ = "p_live_queue_members"
    
    member_uuid = Column("member_uuid", String(64), primary_key=True)
    queue_name = Column("queue_name", String(128), nullable=False)
    account_no = Column("account_no", String(64), nullable=False)
    agent_id = Column("agent_id", String(64), nullable=True)
    status = Column("status", String(32), nullable=False)
    joined_time = Column("joined_time", DateTime, server_default=func.now())
    updated_time = Column("updated_time", DateTime, onupdate=func.now())

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
    q_memberId = Column("q_memberId", BigInteger, nullable=False)
    q_memberExtensionNo = Column("q_memberExtensionNo", String(255), nullable=False)
    q_createdOn = Column('q_createdOn', TIMESTAMP, nullable=False, default=datetime.utcnow)


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
    
class Tiers(Base):
    __tablename__ = "tiers"

    queue = Column("queue", String(255), nullable=True)
    agent = Column("agent", String(255), ForeignKey('p_queuegroups.q_memberExtensionNo', ondelete='CASCADE'), primary_key=True, nullable=True)
    state = Column("state", String(255), nullable=True)
    level = Column("level", Integer, default=1, nullable=False)
    position = Column("position", Integer, default=1, nullable=False)
