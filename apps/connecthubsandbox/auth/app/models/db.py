from sqlalchemy import Integer, Float, String, Enum, DateTime, JSON, BigInteger, Text, CHAR, TIMESTAMP, Column, ForeignKey, text, Index
from sqlalchemy.sql import func
from sqlalchemy.sql.functions import current_timestamp
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.ext.mutable import MutableDict

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
    a_accountServiceRegion = Column("a_accountServiceRegion", Enum('Domestic','International','International-mid', 'Domestic-mid'), nullable=True)
    a_accountPrefix = Column("a_accountPrefix", BigInteger, nullable=False)
    a_salesRepName = Column("a_salesRepName", String(255), nullable=False)
    a_planName = Column("a_planName", String(255), nullable=False)
    a_accountTimeZone = Column("a_accountTimeZone", String(255), nullable=False) 
    a_planDetails = Column(MutableDict.as_mutable(JSON), nullable=False)
    a_createdOn = Column("a_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    a_updatedOn = Column("a_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class Plans(Base):
    __tablename__ = "p_plans"

    p_planId = Column("p_planId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    p_planName = Column("p_planName", String(100), nullable=False)
    p_planDetails = Column("p_planDetails", JSON, nullable=False)
    p_createdOn = Column("p_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    p_updatedOn = Column("p_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class MediaInstances(Base):
    __tablename__ = "p_mediainstances"

    m_mediaId = Column("m_mediaId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_mediaDomainName = Column("m_mediaDomainName", String(255), nullable=False)
    m_mediaIPAddress = Column("m_mediaIPAddress", String(100), nullable=False)

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

class RelationalProxyInstancesAccounts(Base):
    __tablename__ = "r_proxyinstances_accounts"

    r_recordId = Column("r_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    r_accountId = Column('r_accountId', BigInteger, ForeignKey("p_accounts.a_accountId", ondelete="CASCADE"), unique=True, nullable=False)
    r_accountNo = Column("r_accountNo", String(100), nullable=False)
    r_proxyId = Column("r_proxyId", BigInteger, ForeignKey("p_proxyinstances.p_proxyId", ondelete="CASCADE"), nullable=False)

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
    m_memberCallerId = Column('m_memberCallerId', Integer, nullable=False)
    m_memberMobileNo = Column('m_memberMobileNo', Integer, nullable=False)
    m_memberMailId = Column('m_memberMailId', String(255), unique=True, nullable=True)
    m_memberMode = Column('m_memberMode', Enum('BROWSER','SOFTPHONE'), nullable=False, default='BROWSER')
    m_memberPlatformType = Column('m_memberPlatformType', Enum('CALLCENTER','RCM'), nullable=False, default='CALLCENTER')
    m_memberFCMToken = Column('m_memberFCMToken', Text, nullable=True)
    m_readyStatus = Column('m_readyStatus', Enum('READY','NOTREADY'), nullable=True)
    m_readyStatusStartTime = Column('m_readyStatusStartTime', DateTime, nullable=True)
    m_status = Column('m_status', Enum('LOGIN','LOGOUT','BREAK','QUERY', 'LUNCH', 'MEETING'), nullable=True)
    m_memberAdStatus = Column('m_memberAdStatus', Enum('ACTIVE','INACTIVE'), nullable=True)
    m_statusTime = Column('m_statusTime', DateTime, nullable=True)
    m_campaignId = Column('m_campaignId', BigInteger, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    MemberPlansRelationship = relationship("MemberPlans", backref="MembersRelationship", cascade="all, delete-orphan", uselist=False, passive_deletes=True)

class MemberPlans(Base):
    __tablename__ = "p_memberplans"

    m_memberplanId = Column("m_memberplanId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_memberId = Column("m_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), unique=True, nullable=False)
    m_memberplanDetails = Column("m_memberplanDetails", JSON, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class Subscriber(Base):
    __tablename__ = "subscriber"

    id = Column("id", Integer, primary_key=True, autoincrement=True)
    username = Column("username", CHAR(64), nullable=False, index=True)
    domain = Column("domain", CHAR(64), nullable=False)
    password = Column("password", CHAR(50), nullable=True)
    email_address = Column("email_address", CHAR(64), nullable=False)
    ha1 = Column("ha1", CHAR(64), nullable=False)
    ha1_sha256 = Column("ha1_sha256", CHAR(64), nullable=False)
    ha1_sha512t256 = Column("ha1_sha512t256", CHAR(64), nullable=False)
    rpid = Column("rpid", CHAR(64), nullable=True)
    custId = Column("custId", String(255), nullable=False)
    userType = Column("userType", Enum('USER','AGENT','ADMIN','SUPERADMIN'), nullable=True)

class SamlConfigs(Base):
    __tablename__ = "p_samlconfigs"

    s_samlId = Column('s_samlId', Integer, primary_key=True, autoincrement=True, nullable=False)
    s_samlDomain = Column('s_samlDomain', String(255), unique=True, nullable=False)
    s_samlEntityId = Column('s_samlEntityId', Text, nullable=False)
    s_samlLoginUrl = Column('s_samlLoginUrl', Text, nullable=False)
    s_samlCertificate = Column('s_samlCertificate', Text, nullable=False)
    s_createdOn = Column("s_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    s_updatedOn = Column("s_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    s_accountId = Column('s_accountId', BigInteger, nullable=True)
    s_synchronize_apis = Column('s_synchronize_apis', JSON, nullable=True)
    s_provider = Column('s_provider', String(50), nullable=True, default='azure')

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


class SSOMemberSyncLogs(Base):
    __tablename__ = "p_ssomembersynclogs"

    s_logId = Column("s_logId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    s_accountId = Column("s_accountId", BigInteger, nullable=True)
    s_accountNo = Column("s_accountNo", String(255), nullable=True)
    s_memberMailId = Column("s_memberMailId", String(255), nullable=True)
    s_memberName = Column("s_memberName", String(255), nullable=True)
    s_ssoprovider = Column("s_ssoprovider", String(255), nullable=True)
    s_syncSource = Column("s_syncSource", Enum("DIRECT", "GROUP"), nullable=True)
    s_syncAction = Column("s_syncAction", Enum("INSERTED", "INACTIVATED", "REACTIVATED", "UNCHANGED"), nullable=False)
    s_groupId = Column("s_groupId", String(64))
    s_groupName = Column("s_groupName", String(255))
    s_createdOn = Column("s_createdOn", DateTime, server_default=func.now())

class SuperAdminIp(Base):
    __tablename__ = "p_whitelistedip"

    s_id = Column("s_id", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    s_accountId = Column("s_accountId", BigInteger, nullable=False)
    s_ip = Column("s_ip", String(255), nullable=False)
    s_label = Column("s_label", String(255), nullable=False)
    s_type = Column("s_type", Enum("Allow", "Block"), nullable=False)
    s_createdOn = Column("s_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())

