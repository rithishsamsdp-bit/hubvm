from sqlalchemy import Integer, BigInteger, Float, String, Text, Enum, DateTime, TIMESTAMP, JSON, ForeignKey, func, Index, Column
from sqlalchemy.sql.functions import current_timestamp
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

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
    a_accountServiceRegion = Column("a_accountServiceRegion", Enum('Domestic','International','Global'), nullable=True)
    a_accountPrefix = Column("a_accountPrefix", BigInteger, nullable=False)
    a_salesRepName = Column("a_salesRepName", String(255), nullable=False)
    a_planName = Column("a_planName", String(255), nullable=False)
    a_planDetails = Column("a_planDetails", JSON, nullable=False)
    a_createdOn = Column("a_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    a_updatedOn = Column("a_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

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
    p_codexName = Column("p_codexName", String(100), nullable=False)
    p_proxyDirectoryName = Column("p_proxyDirectoryName", String(100), nullable=False)

class RelationalProxyInstancesAccounts(Base):
    __tablename__ = "r_proxyinstances_accounts"

    r_recordId = Column("r_recordId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    r_accountId = Column('r_accountId', BigInteger, ForeignKey("p_accounts.a_accountId", ondelete="CASCADE"), unique=True, nullable=False)
    r_accountNo = Column("r_accountNo", String(100), nullable=False)
    r_proxyId = Column("r_proxyId", BigInteger, ForeignKey("p_proxyinstances.p_proxyId", ondelete="CASCADE"), nullable=False)


    
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


class WhatsappAccounts(Base):
    __tablename__ = "p_whatsappaccounts"

    w_whatsappAccountId = Column("w_whatsappAccountId",BigInteger, primary_key=True, nullable=False)
    w_accountId = Column("w_accountId",String(100), nullable=True)
    w_whatsappNumber = Column("w_whatsappNumber",String(20), nullable=True)
    w_phNumberId = Column(String(50), nullable=True)
    w_apiKey = Column(String(50), nullable=True)
    w_wabaID = Column(String(50), nullable=True)
    w_amountDeduction = Column(JSON, nullable=True)  # ✅ Changed to JSON
    w_currectBalance = Column(String(10), nullable=True)
    w_createdOn = Column(
        TIMESTAMP, nullable=False, server_default=func.current_timestamp()
    )
    w_updatedOn = Column(
        TIMESTAMP,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    w_status = Column(String(10), nullable=True)




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
    

class MemberPlans(Base):
    __tablename__ = "p_memberplans"

    m_memberplanId = Column("m_memberplanId", BigInteger, primary_key=True, autoincrement=True, nullable=False)
    m_memberId = Column("m_memberId", BigInteger, ForeignKey('p_members.m_memberId', ondelete='CASCADE'), unique=True, nullable=False)
    m_memberplanDetails = Column("m_memberplanDetails", JSON, nullable=False)
    m_createdOn = Column("m_createdOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column("m_updatedOn", TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
        
    
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
    m_status = Column('m_status',Enum('LOGIN','LOGOUT','BREAK','QUERY','RESTROOM','LUNCH','MEETING'), nullable=True)
    m_statusTime = Column('m_statusTime',DateTime, nullable=True)
    m_campaignId = Column('m_campaignId',BigInteger, nullable=True)
    m_createdOn = Column('m_createdOn',TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    m_updatedOn = Column('m_updatedOn',TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    plan = relationship("MemberPlans", backref="member", cascade="all, delete-orphan", uselist=False, passive_deletes=True)
    # liveMonitoring = relationship("LiveMonitoring",back_populates="member",cascade="all, delete-orphan")    



class CampaignWhatsApp(Base):
    __tablename__ = "p_campaigns_whatsapp"

    cw_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cw_campaign_name = Column(String(255), nullable=True)
    cw_campaign_category = Column(String(255), nullable=True)
    cw_template_name = Column(String(255), nullable=True)
    cw_template_id = Column(String(255), nullable=True)
    cw_schedule_time = Column(DateTime, nullable=True)
    cw_duplicate_removal_status = Column(String(255), nullable=True)
    cw_account_id = Column(String(255), nullable=True)
    cw_account_no = Column(String(255), nullable=True) # Added missing status column
    cw_status = Column(String(50), nullable=True, default="SCHEDULED") 
    cw_created_on = Column('cw_created_on',TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    cw_updated_on = Column('cw_updated_on',TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())   


class CampaignLeadsWhatsApp(Base):
    __tablename__ = "p_leads_whatsapp"
    
    lw_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lw_campaign_id = Column(Integer, nullable=True)
    lw_mobile_number = Column(String(20), nullable=True)
    lw_country_code = Column(String(20), nullable=True)
    lw_account_id = Column(String(50), nullable=True)
    lw_account_no = Column(String(50), nullable=True)
    lw_created_on = Column('lw_created_on',TIMESTAMP, nullable=False, server_default=func.current_timestamp())