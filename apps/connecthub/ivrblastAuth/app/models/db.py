from enum import Enum
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import JSON, BigInteger, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.sql.functions import current_timestamp
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from sqlalchemy import Integer, Float, String, Enum, DateTime, ForeignKey, JSON, BigInteger, TIMESTAMP, Text

Base = declarative_base()
Basecompany = declarative_base()

class Company(Basecompany):
    __tablename__ = "p__companies"

    c_regId = Column("c_regId", Integer, primary_key=True, autoincrement=True)  # Primary key
    c_companyName = Column("c_companyName", String(50), nullable=True)
    c_companyCode = Column("c_companyCode", String(255), nullable=False)
    c_emailId = Column("c_emailId", String(50), nullable=True)
    c_contactNo = Column("c_contactNo", String(20), nullable=True)
    c_numberOfUser = Column("c_numberOfUser", Integer, nullable=True)
    c_bussinessVertical = Column("c_bussinessVertical", String(40), nullable=True)
    c_encrpytionID = Column("c_encrpytionID", String(100), nullable=True)
    c_username = Column("c_username", String(50), nullable=False)
    c_astDomainName = Column("c_astDomainName", String(40), nullable=True)
    c_astPublicIP = Column("c_astPublicIP", String(30), nullable=False)
    c_astPrivateIP = Column("c_astPrivateIP", String(30), nullable=True)
    c_whatsappNumber = Column("c_whatsappNumber", String(20), nullable=True)
    c_whatsappPWD = Column("c_whatsappPWD", String(25), nullable=True)
    c_smsGateway = Column("c_smsGateway", String(25), nullable=True)
    c_smsUsername = Column("c_smsUsername", String(25), nullable=True)
    c_smsPWD = Column("c_smsPWD", String(20), nullable=True)
    c_createdON = Column("c_createdON", TIMESTAMP, nullable=True, server_default=func.now())
    created_at = Column("created_at", TIMESTAMP, nullable=True)
    updated_at = Column("updated_at", TIMESTAMP, nullable=True)
    c_bucketName = Column("c_bucketName", String(100), nullable=True)
    c_plan = Column("c_plan", String(255), nullable=True)

class Agents(Base):
    __tablename__ = 'p_agents'
    
    a_agentId = Column('a_agentId', Integer, primary_key=True, autoincrement=True, nullable=False)
    a_regId = Column('a_regId', Integer, nullable=False)
    a_companyCode = Column('a_companyCode', String(255), nullable=False)
    a_userName = Column('a_userName', String(30), nullable=False)
    a_password = Column('a_password', String(30), nullable=True, default='Pulse@TPL')
    a_phLogin = Column('a_phLogin', Integer, unique=True, nullable=True)
    a_campaignId = Column('a_campaignId', JSON, nullable=True)
    a_mode = Column('a_mode', Integer, nullable=True, default=0)
    a_platFormType = Column('a_platFormType', Integer, nullable=True, default=0)
    a_role = Column('a_role', Integer, nullable=True, default=0)
    a_callerId = Column('a_callerId', String(15), nullable=True, default='0')
    a_mailId = Column('a_mailId', String(40), nullable=True, default='qwerty@pulse.in')
    a_loginStatus = Column('a_loginStatus', Integer, nullable=True, default=0)
    a_context = Column('a_context', String(50), nullable=True, default='manual_c')
    a_passwordHash = Column('a_passwordHash', String(255), nullable=True)
    a_mobileNumber = Column('a_mobileNumber', BigInteger, nullable=True)
    a_uniqueid = Column('a_uniqueid', String(255), nullable=True)
    a_calltype = Column('a_calltype', String(255), nullable=True)
    a_confdetails = Column('a_confdetails', String(255), nullable=True)
    updated_on = Column('updated_on', TIMESTAMP, nullable=True, default='CURRENT_TIMESTAMP', onupdate='CURRENT_TIMESTAMP')

    class Role(str, Enum):
        ADMIN = "3"
        USER = "5"
        TL = "4"

class VoiceResponses(Base):
    __tablename__ = 'p_voiceresponses'

    v_voiceresponseId = Column('v_voiceresponseId', Integer, primary_key=True, autoincrement=True, nullable=False)
    v_voiceresponseName = Column('v_voiceresponseName', String(30), nullable=False)
    v_voiceresponseUrl = Column('v_voiceresponseUrl', String(100), nullable=False)

class IvrFlows(Base):
    __tablename__ = 'p_ivrflows'

    i_flowId = Column('i_flowId', BigInteger, primary_key=True, autoincrement=True, nullable=False)
    i_flowName = Column('i_flowName', String(30), nullable=False)
    i_flowData = Column('i_flowData', JSON, nullable=False)
    i_flowOData = Column('i_flowOData', JSON, nullable=False)
    i_flowOPosition = Column('i_flowOPosition', JSON, nullable=False)

class IvrCampaigns(Base):
    __tablename__ = 'p_ivrcampaigns'

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
    __tablename__ = 'p_campaignnumbers'

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
    __tablename__ = 'p_ivrcarriers'

    i_carrierId = Column('i_carrierId', Integer, primary_key=True, autoincrement=True, nullable=False)
    i_carrierName = Column('i_carrierName', String(30), nullable=False)
    i_carrierSecret = Column('i_carrierSecret', String(30), nullable=False)
    i_carrierHost = Column('i_carrierHost', String(30), nullable=False)
    i_carrierPort = Column('i_carrierPort', Integer, nullable=False)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class ApiRequestLogs(Base):
    __tablename__ = 'p_apiRequestLogs'

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
    __tablename__ = 'p_numberBlockList'

    a_id = Column(Integer, primary_key=True, autoincrement=True)
    a_number = Column(Integer, nullable=True)
    a_discription = Column(Text, nullable=True)
    a_createdOn = Column(DateTime, server_default=func.now())
    a_updatedOn = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
class Carrier(Base):
    __tablename__ = 'p_carrier'

    a_id = Column(Integer, primary_key=True, autoincrement=True)
    a_trunkName = Column(String(20), nullable=True)
    a_secret = Column(String(30), nullable=True)
    a_host = Column(String(40), nullable=True)
    a_prefend = Column(Integer, nullable=True)
    a_port = Column(Integer, nullable=True)
    a_createdOn = Column(DateTime, server_default=func.now())
    a_updatedOn = Column(DateTime, server_default=func.now(), onupdate=func.now())