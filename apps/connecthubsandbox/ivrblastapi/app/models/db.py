from enum import Enum
from datetime import datetime
from sqlalchemy import Column
from sqlalchemy import Integer, Float, String, Enum, DateTime, ForeignKey, JSON, BigInteger, TIMESTAMP, Text, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ApiLog(Base):
    __tablename__ = 'api_logs'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(String(255), unique=True, nullable=False)  # Unique request-response matching ID
    client_ip = Column(String(45))
    client_host = Column(String(255))
    regId = Column(String(255))
    agentId = Column(String(255))
    comp_code = Column(String(255))
    user_name = Column(String(255))
    encrypt = Column(String(255))
    phLogin = Column(String(255))
    method = Column(String(10))
    path = Column(Text)
    headers = Column(JSON)
    content_type = Column(String(255))
    request_data = Column(JSON)
    file_uploads = Column(JSON)
    status_code = Column(Integer)
    response_body = Column(Text)
    request_time = Column(DateTime)
    response_time = Column(DateTime)
    duration = Column(Float)
    log_type = Column(String(20), nullable=True, default='request')
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

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
    i_status = Column('i_status',Enum('pending','active','completed','failed', 'stopped', 'running'), nullable=True, default='pending')
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    i_ratio = Column('i_ratio', BigInteger, nullable=False)

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
    i_carrierPrefix = Column('i_carrierPrefix', Integer, nullable=True)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column('updated_at', TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class IvrBlastLogs(Base):
    __tablename__ = 'p_ivrblastlogs'

    i_Id = Column('i_Id', Integer, primary_key=True, autoincrement=True, nullable=False)
    i_uniqueId = Column('i_uniqueId', String(255), nullable=True)
    i_campaignName = Column('i_campaignName', String(255), nullable=True)
    i_carrier = Column('i_carrier', String(255), nullable=True)
    i_source = Column('i_source', String(50), nullable=True)
    i_destination = Column('i_destination', String(50), nullable=True)
    i_disposition = Column('i_disposition', String(100), nullable=True)
    i_userInput = Column('i_userInput', String(100), nullable=True)
    i_callType = Column('i_callType', String(255), nullable=True)
    i_channelName = Column('i_channelName', String(255), nullable=True)
    i_callDate = Column('i_callDate', String(255), nullable=True)
    i_callerId = Column('i_callerId', String(255), nullable=True)
    i_startTime = Column('i_startTime', String(255), nullable=True)
    i_endTime = Column('i_endTime', String(255), nullable=True)
    i_duration = Column('i_duration', String(255), nullable=True)
    i_billsec = Column('i_billsec', String(255), nullable=True)
    i_answerTime = Column('i_answerTime', String(255), nullable=True)
    i_campaignId = Column('i_campaignId', String(255), nullable=True)
    created_at = Column('created_at', TIMESTAMP, nullable=False, default=datetime.utcnow)

class IvrCallerIds(Base):
    __tablename__ = 'campaign_carrier_pool'

    id = Column('id', Integer, primary_key=True, autoincrement=True, nullable=False)
    campaign_id = Column('campaign_id', Integer, nullable=False)
    carrier_name = Column('carrier_name', String(255), nullable=False)
    carrier_prefix = Column('carrier_prefix', String(10), nullable=True)
    sequence = Column('sequence', Integer, nullable=False)
    status = Column('status', Enum('active','inactive'), nullable=True, default='active')