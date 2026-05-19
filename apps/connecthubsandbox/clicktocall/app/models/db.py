from enum import Enum
from sqlalchemy import Column
from datetime import datetime
from sqlalchemy import Integer, Float, String, Enum, DateTime, ForeignKey,JSON, BigInteger, TIMESTAMP, Text, func, UniqueConstraint, Index
from sqlalchemy.dialects.mysql import BIGINT as MySQLBigInt
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum
from enum import IntEnum

def get_database(db_name: str):
    MONGO_URI = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[db_name]
    return client, db

Base = declarative_base()

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
    c_calldisposition = Column('c_calldisposition', String(100), nullable=False)
    c_agentdisposition = Column('c_agentdisposition', String(100), nullable=False)
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
    

class Contact(Base):
    __tablename__ = "p_contacts"

    c_id = Column('c_id',Integer, primary_key=True, index=True)
    c_phLogin = Column('c_phLogin',String, nullable=True)
    c_accountId = Column('c_accountId',String, nullable=True)
    c_accountNo = Column('c_accountNo',String, nullable=True)
    c_Name = Column('c_Name',String, nullable=False)
    c_phoneNumber = Column('c_phoneNumber',String, nullable=False)
    c_mailId = Column('c_mailId',String, nullable=False)
    c_organizationName = Column('c_organizationName',String, nullable=True)
    c_address = Column('c_address',String, nullable=True)
    c_leadId = Column('c_leadId', String(255), nullable=True, unique=True)
    c_createdOn = Column('c_createdOn',DateTime, default=datetime.utcnow)
    c_updatedOn = Column('c_updatedOn',DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    m_memberCallerIdMode = Column('m_memberCallerIdMode', Integer, nullable=False)
    m_memberMobileNo = Column('m_memberMobileNo', Integer, nullable=False)
    m_memberMailId = Column('m_memberMailId', String(255), unique=True, nullable=True)
    m_clicktocallType = Column('m_clicktocallType', String(255), nullable=True)
    m_memberMode = Column('m_memberMode', Enum('BROWSER','SOFTPHONE'), nullable=False, default='BROWSER')
    m_memberPlatformType = Column('m_memberPlatformType', Enum('CALLCENTER','RCM'), nullable=False, default='CALLCENTER')
    m_campaignId = Column('m_campaignId', BigInteger, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    plan = relationship("MemberPlans", backref="member", cascade="all, delete-orphan", uselist=False, passive_deletes=True)
    MemberPlansRelationship = relationship("MemberPlans", backref="MembersRelationship", cascade="all, delete-orphan", uselist=False, passive_deletes=True)

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


class PRelationalTableCampaignsDidNumberGroups(Base):
    __tablename__ = "p_relationaltable_campaigns_didnumbergroups"

    rcd_recordId = Column("rcd_recordId",BigInteger, primary_key=True, autoincrement=True)
    rcd_accountId = Column("rcd_accountId",BigInteger, nullable=False)
    rcd_accountNo = Column("rcd_accountNo",String(100), nullable=False)
    rcd_campaignsId = Column("rcd_campaignsId",BigInteger,ForeignKey("p_campaigns.c_campaignId", ondelete="CASCADE", onupdate="CASCADE"),nullable=False)
    rcd_didnumbergroupsId = Column("rcd_didnumbergroupsId",BigInteger,ForeignKey("p_didnumbergroups.d_didnumbergroupId", ondelete="CASCADE", onupdate="CASCADE"),nullable=False)
    

class RelationalCLINumbersMembers(Base):
    __tablename__ = "r_clinumbers_members"
    r_recordId = Column(BigInteger, primary_key=True, autoincrement=True)
    r_accountId = Column(BigInteger, nullable=True)
    r_accountNo = Column(String(100), nullable=True)
    r_memberId = Column(BigInteger, ForeignKey("p_members.m_memberId", ondelete="CASCADE"), nullable=False)
    r_clinumberId = Column(BigInteger, ForeignKey("p_clinumbers.c_clinumberId", ondelete="CASCADE"), nullable=False)


class ApiRequestLogs(Base):
    __tablename__ = "p_apiRequestsLogs"

    a_requestId = Column("a_requestId",MySQLBigInt(unsigned=True), primary_key=True, autoincrement=True)
    a_uniqueId = Column("a_uniqueId",String(255), primary_key=True, index=True)
    a_requestTime = Column("a_requestTime",DateTime, default=datetime.utcnow, index=True)
    a_method = Column("a_method",String(10), index=True)
    a_endpoint = Column("a_endpoint",String(255), index=True)
    a_queryParams = Column("a_queryParams",JSON)
    a_requestHeaders = Column("a_requestHeaders",JSON)
    a_requestBody = Column("a_requestBody",JSON)
    a_clientIp = Column("a_clientIp",String(45), index=True)
    a_userAgent = Column("a_userAgent",String)

    __table_args__ = (Index('idx_req_method_time', 'a_method', 'a_requestTime'),Index('idx_req_endpoint_time', 'a_endpoint', 'a_requestTime'),)

    responses = relationship("ApiResponseLogs", back_populates="request")
      
class ApiResponseLogs(Base):
    __tablename__ = "p_apiResponsesLogs"

    a_responseId = Column("a_responseId",MySQLBigInt(unsigned=True), primary_key=True, autoincrement=True)
    a_uniqueId = Column("a_uniqueId",String(255),ForeignKey("p_apiRequestsLogs.a_uniqueId"),nullable=False, index=True)
    a_responseTime = Column("a_responseTime",DateTime, default=datetime.utcnow, index=True)
    a_responseCode = Column("a_responseCode",Integer, index=True)
    a_responseBody = Column("a_responseBody",JSON)
    a_responseTimeMs = Column("a_responseTimeMs",Integer)
    a_serverNode = Column("a_serverNode",String(50))
    a_extraMeta = Column("a_extraMeta",JSON)

    __table_args__ = (Index('idx_resp_code_time', 'a_responseCode', 'a_responseTime'),Index('idx_resp_node_time', 'a_serverNode', 'a_responseTime'),)

    request = relationship("ApiRequestLogs", back_populates="responses")

class RelationalProxyInstancesAccounts(Base):
    __tablename__ = "r_proxyinstances_accounts"

    r_recordId = Column("r_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    r_accountId = Column('r_accountId', BigInteger, ForeignKey("p_accounts.a_accountId", ondelete="CASCADE"), unique=True, nullable=False)
    r_accountNo = Column("r_accountNo", String(100), nullable=False)
    r_proxyId = Column("r_proxyId", BigInteger, ForeignKey("p_proxyinstances.p_proxyId", ondelete="CASCADE"), nullable=False)
    
class MediaInstances(Base):
    __tablename__ = "p_mediainstances"

    m_mediaId = Column(BigInteger, primary_key=True, autoincrement=True)
    m_mediaName = Column(String(255), nullable=False)
    m_mediaPublicIPAddress = Column(String(100), nullable=False)
    m_mediaPrivateIPAddress = Column(String(100), nullable=False)
    m_proxyId = Column(BigInteger, nullable=False, index=True)
    
class ProxyInstances(Base):
    __tablename__ = "p_proxyinstances"

    p_proxyId = Column("p_proxyId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    p_proxyName = Column("p_proxyName", String(255), nullable=False)
    p_proxyDomainName = Column("p_proxyDomainName", String(255), nullable=False)
    p_proxyIPAddress = Column("p_proxyIPAddress", String(100), nullable=False)
    # p_proxyPublicIPAddress = Column("p_proxyPublicIPAddress", String(100), nullable=False)
    p_proxyPrivateIPAddress = Column("p_proxyPrivateIPAddress", String(100), nullable=False)
    p_codexName = Column("p_codexName", String(100), nullable=False)
    p_proxyDirectoryName = Column("p_proxyDirectoryName", String(100), nullable=False)