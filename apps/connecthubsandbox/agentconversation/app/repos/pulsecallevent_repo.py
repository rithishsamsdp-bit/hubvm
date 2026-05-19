from sqlalchemy import select, Update, and_, Delete, exists, update, Date
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from fastapi_mail import FastMail, ConnectionConfig, MessageSchema
from pymongo.errors import PyMongoError
from db.context import get_async_engine, asyncClientFactory, asyncSessionFactory, get_redis
from models.db import Leads, Tasks, Conversations, Calls, Members, RelationalCallsLeadsConversations, Notifications, ExternalIntegrationAPIs, RelationalExternalIntegrationAPIsCLINumbersCallFlows, ExternalIntegrationAPILogs, Campaigns
from utils.socket_manager import socket_manager
from utils.sha256_hashing import alphanumericUniqueId
from datetime import datetime, date
import pytz
from producer.kafkaproducer import send_message
import json

IST = pytz.timezone("Asia/Kolkata")
conf = ConnectionConfig(
    MAIL_USERNAME="work360@pulse.in",
    MAIL_PASSWORD="yjir ipag lekp hjxu",
    MAIL_FROM="work360@pulse.in",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def outboundInit(phonenumber: int, memberextensionno: int, callid: str, campaignid: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        currentIST = datetime.now(IST)
        datetimeIST = currentIST.strftime("%Y-%m-%d %H:%M:%S")
        recordQuery = select(Leads).where(and_(
            Leads.l_leadPhoneNo == phonenumber,
            Leads.l_accountId == accountid,
            Leads.l_accountNo == accountno
        ))
        leadDetails = (await session.execute(recordQuery)).scalars().first()
        if not leadDetails:
            leadid = '00L' + alphanumericUniqueId()
            Lead = Leads(
                l_accountId = accountid,
                l_accountNo = accountno,
                l_leadId = leadid,
                l_leadPhoneNo = phonenumber,
                l_leadOwner = memberextensionno
            )
            session.add(Lead)
            await session.flush()
        else:
            leadid = leadDetails.l_leadId
        conversationid = '00C' + alphanumericUniqueId()
        Conversation = Conversations(
            c_accountId = accountid,
            c_accountNo = accountno,
            c_conversationId = conversationid,
            c_conversationPhoneNo = phonenumber,
            c_conversationOwner = memberextensionno,
            c_conversationChannel = 'Pulse',
            c_conversationType = 'Call',
            c_conversationDetails = {'callId': callid, 'callDirection': 'Outbound', "callCampaignId": campaignid, 'callStartTime': datetimeIST},
            c_conversationStatus = 'Active',
            c_leadId = leadid
        )
        session.add(Conversation)
        await session.commit()
        return { 'leadId': leadid, 'conversationId': conversationid }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

# async def outboundAnswer(leadid: str, phonenumber: int, memberextensionno: int, callid: str, accountid: int, accountno: str, database: str):
#     async_engine = get_async_engine(database)
#     async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
#     session = async_session_maker()
#     try:
#         currentIST = datetime.now(IST)
#         datetimeIST = currentIST.strftime("%Y-%m-%d %H:%M:%S")
#     except IntegrityError as e:
#         await session.rollback()
#         raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
#     except SQLAlchemyError as e:
#         await session.rollback()
#         raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
#     except Exception as e:
#         await session.rollback()
#         raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
#     finally:
#         await session.close()
#         await async_engine.dispose()

async def outboundTerminationOne(conversationid: str, callid: str, campaignid: int, starttime: str, endtime: str, answertime: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(Update(Conversations).where(
            Conversations.c_conversationId == conversationid,
        ).values({
            Conversations.c_conversationDetails: {'callId': callid, 'callDirection': 'Outbound', "callCampaignId": campaignid, 'callStartTime': starttime, 'callAnswerTime': answertime, 'callEndTime': endtime},
            Conversations.c_conversationStatus: 'InActive'
        }))
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def outboundTerminationTwo(leadid: str, conversationid: str, callmode: str, callid: str, memberextensionno: str, memberphoneno: str, customerphoneno: str, disposition: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, talktime: int, terminationend: str, campaignid: int, clinumberid: int, clinumbername: str, accountid: int, accountno: str, callername: str, clientip: str, recordingUrl: str , database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    client, db = asyncClientFactory(database)
    try:
        recordQuery = (
            select(Members.m_memberName).where(
                and_(
                    Members.m_memberExtensionNo == memberextensionno,
                    Members.m_accountId == accountid,
                    Members.m_accountNo == accountno
                )
            )
        )
        membername = (await session.execute(recordQuery)).scalar_one_or_none()
        dial_method = 'Manual'
        if campaignid != 0:
            campaignQuery = (select(Campaigns.c_dialerType).where(and_(
                    Campaigns.c_campaignId == campaignid,
                    Campaigns.c_accountId == accountid,
                    Campaigns.c_accountNo == accountno
                ))
            )
            dialerType = (await session.execute(campaignQuery)).scalar_one_or_none()
            if dialerType == 'PREDICTIVE':
                dial_method = 'Predictive'

        Call = Calls(
            c_callId = callid,
            c_callRecordingUrl = recordingUrl,
            c_accountId = accountid,
            c_accountNo = accountno,
            c_campaignId = campaignid,
            c_clinumberId = clinumberid,
            c_clinumberName = clinumbername,
            c_memberExtensionNo = memberextensionno,
            c_memberPhoneno = memberphoneno,
            c_callerName = callername,
            c_customerPhoneno = customerphoneno,
            c_disposition = disposition,
            c_direction = 'Outbound',
            c_callDateTime = calldatetime,
            c_startTime = starttime,
            c_endTime = endtime,
            c_answerTime = answertime,
            c_duration = duration,
            c_talktime = talktime,
            c_terminationEnd = terminationend,
            c_callMode = callmode,
            c_clientIp = clientip,
            c_dial_method = dial_method
        )
        session.add(Call)
        await session.flush()
        taskid = '00T' + alphanumericUniqueId()
        Task = Tasks(
            t_accountId = accountid,
            t_accountNo = accountno,
            t_taskId = taskid,
            t_taskPhoneNo = customerphoneno,
            t_taskOwner = memberextensionno,
            t_taskChannel = 'Pulse',
            t_taskDirection = 'Outbound',
            t_taskType = 'Call',
            t_taskDetails = {'c_callId': callid, 'c_callRecordingUrl': recordingUrl, 'c_accountId': accountid, 'c_accountNo': accountno, 'c_campaignId': campaignid, 'c_clinumberId': clinumberid, 'c_clinumberName': clinumbername, 'c_memberExtensionNo': memberextensionno, 'c_memberPhoneno': memberphoneno, 'c_customerPhoneno': customerphoneno, 'c_disposition': disposition, 'c_direction': 'Outbound', 'c_callDateTime': calldatetime, 'c_startTime': starttime, 'c_endTime': endtime, 'c_answerTime': answertime, 'c_duration': duration, 'c_talktime': talktime, 'c_terminationEnd': terminationend, 'c_dial_method': 'Manual'},
            t_taskFollowup = {},
            t_leadId = leadid,
            t_conversationId = conversationid,
            t_campaignId = campaignid
        )
        session.add(Task)
        await session.commit()
        activitytimestamp = datetime.now(IST)
        collection = db['activities']
        record = {
            'accountId': accountid,
            'accountNo': accountno,
            'leadId': leadid,
            'taskId': taskid,
            'conversationId': conversationid,
            'campaignId': campaignid,
            'memberName': membername,
            'channel': 'Pulse',
            'direction': 'Outbound',
            'type': 'Call',
            'activityTimestamp': activitytimestamp.isoformat(),
            'details': {
                'c_callId': callid,
                'c_callRecordingUrl': recordingUrl,
                'c_accountId': accountid,
                'c_accountNo': accountno,
                'c_campaignId': campaignid,
                'c_clinumberId': clinumberid,
                'c_clinumberName': clinumbername,
                'c_memberExtensionNo': memberextensionno,
                'c_memberPhoneno': memberphoneno,
                'c_customerPhoneno': customerphoneno,
                'c_disposition': disposition,
                'c_direction': 'Outbound',
                'c_callDateTime': calldatetime,
                'c_startTime': starttime,
                'c_endTime': endtime,
                'c_answerTime': answertime,
                'c_duration': duration,
                'c_talktime': talktime,
                'c_terminationEnd': terminationend
            }
        }
        await collection.insert_one(record)
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except PyMongoError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
        client.close()

async def outboundTerminationThree(callmode: str, callid: str, memberextensionno: str, memberphoneno: str, customerphoneno: str, disposition: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, talktime: int, terminationend: str, campaignid: int, clinumberid: int, clinumbername: str, accountid: int, accountno: str, callerName: str, clientip: str, database: str, wss:str, clientUniqueId:str, recordingUrl: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    redis = get_redis()
    try:
        dial_method = 'Manual'
        if campaignid != 0:
            campaignQuery = (select(Campaigns.c_dialerType).where(and_(
                    Campaigns.c_campaignId == campaignid,
                    Campaigns.c_accountId == accountid,
                    Campaigns.c_accountNo == accountno
                ))
            )
            dialerType = (await session.execute(campaignQuery)).scalar_one_or_none()
            if dialerType == 'PREDICTIVE':
                dial_method = 'Predictive'

        Call = Calls(
            c_callId = callid,
            c_callRecordingUrl = recordingUrl,
            c_accountId = accountid,
            c_accountNo = accountno,
            c_campaignId = campaignid,
            c_clinumberId = clinumberid,
            c_clinumberName = clinumbername,
            c_memberExtensionNo = memberextensionno,
            c_memberPhoneno = memberphoneno,
            c_callerName = callerName,
            c_customerPhoneno = customerphoneno,
            c_disposition = disposition,
            c_direction = 'Outbound',
            c_callDateTime = calldatetime,
            c_startTime = starttime,
            c_endTime = endtime,
            c_answerTime = answertime,
            c_duration = duration,
            c_talktime = talktime,
            c_terminationEnd = terminationend,
            c_callMode = callmode,
            c_clientIp = clientip,
            c_dial_method = dial_method,
            c_wssUrl = wss,
            c_clientUniqueId = clientUniqueId
        )
        session.add(Call)
        await session.commit()
        
        call_data = {
            "status": "SUCCESS",
            "count": 1,
            "data": [
                {
                    "callId": callid,
                    "direction": "Outbound",
                    "cliName": clinumbername,
                    "customerPhone": customerphoneno,
                    "duration": duration,
                    "callDateTime": calldatetime,
                    "disposition": disposition,
                    "recordingUrl": recordingUrl,
                    "wssUrl": wss
                }
            ]
        }
        redis_key = f"call:{clientUniqueId}"
        # await redis.set(redis_key, json.dumps(call_data), ex=3600)
        await redis.set(redis_key, json.dumps(call_data, separators=(",", ":")), ex=3600)
        
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def getExternalIntegrationAPI(clinumbername: str, accountid: int, event: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(ExternalIntegrationAPIs)
            .join(
                RelationalExternalIntegrationAPIsCLINumbersCallFlows,
                ExternalIntegrationAPIs.e_integrationapiId == RelationalExternalIntegrationAPIsCLINumbersCallFlows.r_integrationapiId
            )
            .where(
                RelationalExternalIntegrationAPIsCLINumbersCallFlows.r_accountId == accountid,
                RelationalExternalIntegrationAPIsCLINumbersCallFlows.r_clinumberName == clinumbername,
                ExternalIntegrationAPIs.e_integrationapiTriggerEvent == event
            )
        )
        externalintegrationapis = (await session.execute(recordQuery)).scalars().all()
        return externalintegrationapis
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def logExternalIntegrationAPIStatus(database: AsyncSession, api_id: int, name: str, endpoint: str, headers: dict, payload: dict, method: str, status: str, response_status: int = None, response_body: str = None, error: str = None, response_time: int = None, clinumber: str = None, accountid: int = None, event: str = None, request_id: str = None):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        ExternalIntegrationAPILog = ExternalIntegrationAPILogs(
            e_integrationapiId=api_id,
            e_integrationapiName=name,
            e_accountId=accountid,
            e_clinumberName=clinumber,
            e_integrationapiTriggerEvent=event,
            e_integrationapiEndpoint=endpoint,
            e_integrationapiMethod=method,
            e_integrationapiHeader=headers,
            e_integrationapiQueryParams=payload,
            e_responseStatusCode=response_status,
            e_responseBody=(response_body[:5000] if response_body else None),
            e_responseStatus=status,
            e_errorMessage=error,
            e_responseTimeMs=response_time,
            e_callId=request_id
        )
        session.add(ExternalIntegrationAPILog)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def inboundInit(phonenumber: int, callid: str, accountid: int, accountno: str, database: str):
    if accountid == 219:
        return
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Leads).where(and_(
            Leads.l_leadPhoneNo == phonenumber,
            Leads.l_accountId == accountid,
            Leads.l_accountNo == accountno
        ))
        leadDetails = (await session.execute(recordQuery)).scalars().first()
        if not leadDetails:
            leadid = '00L' + alphanumericUniqueId()
            Lead = Leads(
                l_accountId = accountid,
                l_accountNo = accountno,
                l_leadId = leadid,
                l_leadPhoneNo = phonenumber,
                l_leadOwner = 0
            )
            session.add(Lead)
            await session.flush()
        else:
            leadid = leadDetails.l_leadId
        record = RelationalCallsLeadsConversations(
            r_accountId = accountid,
            r_accountNo = accountno,
            r_callId = callid,
            r_leadId = leadid,
            r_conversationId = ''
        )
        session.add(record)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def inboundAnswer(phonenumber: int, memberextensionno: int, callid: str, clinumberid: int, accountid: int, accountno: str, database: str):
    if accountid == 219:
        return
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        currentIST = datetime.now(IST)
        datetimeIST = currentIST.strftime("%Y-%m-%d %H:%M:%S")
        conversationid = '00C' + alphanumericUniqueId()
        await session.execute(Update(RelationalCallsLeadsConversations)
            .where(and_(
                    RelationalCallsLeadsConversations.r_callId == callid,
                    RelationalCallsLeadsConversations.r_accountId == accountid,
                    RelationalCallsLeadsConversations.r_accountNo == accountno,
            )).values(r_conversationId=conversationid)
        )
        await session.flush()
        recordQuery = await session.execute(
            select(RelationalCallsLeadsConversations.r_leadId)
            .where(and_(
                    RelationalCallsLeadsConversations.r_callId == callid,
                    RelationalCallsLeadsConversations.r_accountId == accountid,
                    RelationalCallsLeadsConversations.r_accountNo == accountno,
            ))
        )
        leadid = recordQuery.scalar_one_or_none()
        Conversation = Conversations(
            c_accountId = accountid,
            c_accountNo = accountno,
            c_conversationId = conversationid,
            c_conversationPhoneNo = phonenumber,
            c_conversationOwner = memberextensionno,
            c_conversationChannel = 'Pulse',
            c_conversationType = 'Call',
            c_conversationDetails = {'callId': callid, 'callDirection': 'Inbound', 'callCLINumberId': clinumberid, 'callStartTime': datetimeIST},
            c_conversationStatus = 'Active',
            c_leadId = leadid
        )
        session.add(Conversation)
        await session.flush()
        await session.execute(Update(Leads).where(
            Leads.l_leadId == leadid,
            Leads.l_leadOwner == 0
        ).values(l_leadOwner=memberextensionno) )
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def inboundTerminationOne(callid: str, clinumberid: int, starttime: str, endtime: str, answertime: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(RelationalCallsLeadsConversations).where(and_(
            RelationalCallsLeadsConversations.r_callId == callid,
            RelationalCallsLeadsConversations.r_accountId == accountid,
            RelationalCallsLeadsConversations.r_accountNo == accountno
        ))
        result = (await session.execute(recordQuery)).scalars().first()
        conversationid = result.r_conversationId
        await session.execute(Update(Conversations).where(
            Conversations.c_conversationId == conversationid,
        ).values({
            Conversations.c_conversationDetails: {'callId': callid, 'callDirection': 'Inbound', 'callCLINumberId': clinumberid, 'callStartTime': starttime, 'callAnswerTime': answertime, 'callEndTime': endtime},
            Conversations.c_conversationStatus: 'InActive'
        }))
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def inboundTerminationTwo(callmode: str, callid: str, memberextensionno: str, memberphoneno: str, customerphoneno: str, disposition: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, talktime: int, terminationend: str, campaignid: int, clinumberid: int, clinumbername: str, accountid: int, accountno: str, callername: str, clientip: str, recordingUrl: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    client, db = asyncClientFactory(database)
    try:
        recordQuery = select(RelationalCallsLeadsConversations).where(and_(
            RelationalCallsLeadsConversations.r_callId == callid,
            RelationalCallsLeadsConversations.r_accountId == accountid,
            RelationalCallsLeadsConversations.r_accountNo == accountno
        ))
        result = (await session.execute(recordQuery)).scalars().first()
        leadid = result.r_leadId
        conversationid = result.r_conversationId
        recordQuery = (select(Members.m_memberName).where(and_(
                Members.m_memberExtensionNo == memberextensionno,
                Members.m_accountId == accountid,
                Members.m_accountNo == accountno
            ))
        )
        membername = (await session.execute(recordQuery)).scalar_one_or_none()
        Call = Calls(
            c_callId = callid,
            c_callRecordingUrl = recordingUrl,
            c_accountId = accountid,
            c_accountNo = accountno,
            c_campaignId = campaignid,
            c_clinumberId = clinumberid,
            c_clinumberName = clinumbername,
            c_memberExtensionNo = memberextensionno,
            c_memberPhoneno = memberphoneno,
            c_callerName = callername,
            c_customerPhoneno = customerphoneno,
            c_disposition = disposition,
            c_direction = 'Inbound',
            c_callDateTime = calldatetime,
            c_startTime = starttime,
            c_endTime = endtime,
            c_answerTime = answertime,
            c_duration = duration,
            c_talktime = talktime,
            c_terminationEnd = terminationend,
            c_callMode = callmode,
            c_clientIp = clientip,
            
        )
        session.add(Call)
        await session.flush()
        taskid = '00T' + alphanumericUniqueId()
        Task = Tasks(
            t_accountId = accountid,
            t_accountNo = accountno,
            t_taskId = taskid,
            t_taskPhoneNo = customerphoneno,
            t_taskOwner = memberextensionno,
            t_taskChannel = 'Pulse',
            t_taskDirection = 'Inbound',
            t_taskType = 'Call',
            t_taskDetails = {'c_callId': callid, 'c_callRecordingUrl': recordingUrl, 'c_accountId': accountid, 'c_accountNo': accountno, 'c_campaignId': campaignid, 'c_clinumberId': clinumberid, 'c_clinumberName': clinumbername, 'c_memberExtensionNo': memberextensionno, 'c_memberPhoneno': memberphoneno, 'c_customerPhoneno': customerphoneno, 'c_disposition': disposition, 'c_direction': 'Inbound', 'c_callDateTime': calldatetime, 'c_startTime': starttime, 'c_endTime': endtime, 'c_answerTime': answertime, 'c_duration': duration, 'c_talktime': talktime, 'c_terminationEnd': terminationend},
            t_taskFollowup = {},
            t_leadId = leadid,
            t_conversationId = conversationid,
            t_campaignId = campaignid
        )
        session.add(Task)
        await session.commit()
        activitytimestamp = datetime.now(IST)
        collection = db['activities']
        record = {
            'accountId': accountid,
            'accountNo': accountno,
            'leadId': leadid,
            'taskId': taskid,
            'conversationId': conversationid,
            'campaignId': campaignid,
            'memberName': membername,
            'channel': 'Pulse',
            'direction': 'Inbound',
            'type': 'Call',
            'activityTimestamp': activitytimestamp.isoformat(),
            'details': {
                'c_callId': callid,
                'c_callRecordingUrl': recordingUrl,
                'c_accountId': accountid,
                'c_accountNo': accountno,
                'c_campaignId': campaignid,
                'c_clinumberId': clinumberid,
                'c_clinumberName': clinumbername,
                'c_memberExtensionNo': memberextensionno,
                'c_memberPhoneno': memberphoneno,
                'c_customerPhoneno': customerphoneno,
                'c_disposition': disposition,
                'c_direction': 'Inbound',
                'c_callDateTime': calldatetime,
                'c_startTime': starttime,
                'c_endTime': endtime,
                'c_answerTime': answertime,
                'c_duration': duration,
                'c_talktime': talktime,
                'c_terminationEnd': terminationend
            }
        }
        await collection.insert_one(record)
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except PyMongoError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
        client.close()

async def inboundTerminationThree(callmode: str, callid: str, memberextensionno: str, memberphoneno: str, customerphoneno: str, disposition: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, talktime: int, terminationend: str, campaignid: int, clinumberid: int, clinumbername: str, accountid: int, accountno: str, callername: str, clientip: str, recordingUrl: str,  database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        Call = Calls(
            c_callId = callid,
            c_callRecordingUrl = recordingUrl,
            c_accountId = accountid,
            c_accountNo = accountno,
            c_campaignId = campaignid,
            c_clinumberId = clinumberid,
            c_clinumberName = clinumbername,
            c_memberExtensionNo = memberextensionno,
            c_memberPhoneno = memberphoneno,
            c_callerName = callername,
            c_customerPhoneno = customerphoneno,
            c_disposition = disposition,
            c_direction = 'Inbound',
            c_callDateTime = calldatetime,
            c_startTime = starttime,
            c_endTime = endtime,
            c_answerTime = answertime,
            c_duration = duration,
            c_talktime = talktime,
            c_terminationEnd = terminationend,
            c_callMode = callmode,
            c_clientIp = clientip,
            
        )
        session.add(Call)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()

async def Voicemailtoemail(request: dict, database: str):
    subject = f"New Voicemail Received from Extension {request.memberextension}"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <h2 style="color: #ff5200;">📬 New Voicemail Notification</h2>
        
        <!-- Details -->
        <p style="font-size: 15px; color: #333;">
            Hello <strong>{request.memberextension}</strong>,
        </p>
        <p style="font-size: 15px; color: #333;">
            You have received a new voicemail from phonenumber <strong>{request.customerphoneno}</strong>.
        </p>

        <!-- Voicemail Link (Optional) -->
        <p style="font-size: 15px; color: #333;">
            You can listen to the voicemail using the link below:
        </p>
        <div style="margin: 20px 0;">
            <a href="{request.attachmenturl}" style="background-color: #ff5200; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">🎧 Listen to Voicemail</a>
        </div>

        <!-- Notes -->
        <p style="font-size: 14px; color: #555;">
            If you have any trouble accessing the voicemail, please contact your system administrator or support team.
        </p>

        <!-- Footer -->
        <p style="font-size: 13px; color: #999; margin-top: 30px;">
            This voicemail notification was sent by <strong>{request.domain}</strong>.<br>
            This is an automated message. Please do not reply.
        </p>
        </div>
    </body>
    </html>
    """
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    to = request.to
    cc = request.cc
    if not request.to:
        recordQuery = select(Members).where(and_(
            Members.m_memberExtensionNo == request.memberextension
        ))
        memberDetails = (await session.execute(recordQuery)).scalars().first()
        if memberDetails and memberDetails.m_memberMailId:
            to = [memberDetails.m_memberMailId]
            cc = []
        else:
            print("Member email not found. Cannot send voicemail notification.")
            return
    
    # Create email message
    message = MessageSchema(
        subject=subject,
        recipients=to,
        cc=cc,
        body=body,
        subtype="html"
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print("Voicemail email sent successfully.")
    except Exception as e:
        print(f"Failed to send voicemail email: {e}")

async def OutboundConferenceMerge(conversationids: list, conferenceparticipants: list, phonenumber: int, leadid: str, callid: str, campaignid: int, memberextensionno: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(
            Delete(Conversations).where(
                Conversations.c_conversationId.in_(conversationids)
            )
        )
        await session.commit()
        currentIST = datetime.now(IST)
        datetimeIST = currentIST.strftime("%Y-%m-%d %H:%M:%S")
        conversationid = '00C' + alphanumericUniqueId()
        Conversation = Conversations(
            c_accountId = accountid,
            c_accountNo = accountno,
            c_conversationId = conversationid,
            c_conversationPhoneNo = phonenumber,
            c_conversationOwner = memberextensionno,
            c_conversationChannel = 'Pulse',
            c_conversationType = 'Conference Call',
            c_conversationDetails = {'callId': callid, "conferenceParticipants": conferenceparticipants, "callCampaignId": campaignid, 'callStartTime': datetimeIST},
            c_conversationStatus = 'Active',
            c_leadId = leadid
        )
        session.add(Conversation)
        await session.commit()
        return { 'conversationId': conversationid }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
        
async def createNotification(phonenumber: str, notificationtime: str, memberextensionno: int, accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            Notification = Notifications(
                n_accountId = accountid,
                n_accountNo = accountno,
                n_notificationType = 'MISSEDCALL',
                n_notificationData = {"phonenumber":phonenumber},
                n_notificationTime = notificationtime,
                n_memberExtensionNo = str(memberextensionno),
                n_notificationStatus = 'UNREAD'
            )
            session.add(Notification)
            payload = {
                "extention": memberextensionno,
                "data": {
                    "action": "MISSEDCALL",
                    "notificationData": {"phonenumber":phonenumber},
                    "notificationTime": notificationtime
                }
            }
            socket_manager.emit("message", payload)
            await session.commit()
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def listNotifications(memberextensionno: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        today = date.today()
        recordQuery = select(Notifications).where(
            Notifications.n_memberExtensionNo == memberextensionno,
            Notifications.n_accountId == accountid,
            Notifications.n_accountNo == accountno,
            Notifications.n_notificationType == "MISSEDCALL",
            Notifications.n_notificationTime.cast(Date) == today
        )
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        
        unreadQuery = select(
            exists().where(
                and_(
                    Notifications.n_memberExtensionNo == memberextensionno,
                    Notifications.n_accountId == accountid,
                    Notifications.n_accountNo == accountno,
                    Notifications.n_notificationType == "MISSEDCALL",
                    Notifications.n_notificationStatus == "UNREAD",
                    Notifications.n_notificationTime.cast(Date) == today
                )
            )
        )

        result = await session.execute(unreadQuery)
        unread_exists = result.scalar()
        return {
            "message": f"Notifications Fetched SuccessfullyY",
            "data": totalRecordsUnserialized,
            "notification": unread_exists
        }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def listNotificationsUpdate(memberextensionno: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        today = date.today()

        updateQuery = (
            update(Notifications)
            .where(
                Notifications.n_memberExtensionNo == memberextensionno,
                Notifications.n_accountId == accountid,
                Notifications.n_accountNo == accountno,
                Notifications.n_notificationType == "MISSEDCALL",
                Notifications.n_notificationStatus == "UNREAD",
                Notifications.n_notificationTime.cast(Date) == today
            )
            .values(n_notificationStatus="READ")
        )

        result = await session.execute(updateQuery)
        await session.commit()
        
        return {
            "message": "Notifications updated successfully",
        }
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def Predictiveoriginate(request: dict,  database: str):
    
    data = {
            "event_type": "DIAL_RESULT",
            "callUuid": request.callUuid,
            "campaignId": request.campaignId,
            "leadId": request.leadId,
            "result": request.result,
            "accountid": request.accountid,
            "accountno": request.accountno,

            "phoneNumber": request.phoneNumber,
            "duration": request.duration,
            "hangupCause": request.hangupCause,
            "extension": request.extension
            }
    await send_message("dialer.dial_start", request.campaignId, data)

async def PredictiveinboundInit(phonenumber: int, callid: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Leads).where(and_(
            Leads.l_leadPhoneNo == phonenumber,
            Leads.l_accountId == accountid,
            Leads.l_accountNo == accountno
        ))
        leadDetails = (await session.execute(recordQuery)).scalars().first()
        if not leadDetails:
            leadid = '00L' + alphanumericUniqueId()
            Lead = Leads(
                l_accountId = accountid,
                l_accountNo = accountno,
                l_leadId = leadid,
                l_leadPhoneNo = phonenumber,
                l_leadOwner = 0
            )
            session.add(Lead)
            await session.flush()
        else:
            leadid = leadDetails.l_leadId
        record = RelationalCallsLeadsConversations(
            r_accountId = accountid,
            r_accountNo = accountno,
            r_callId = callid,
            r_leadId = leadid,
            r_conversationId = ''
        )
        session.add(record)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
        
async def PredictiveinboundAnswer(phonenumber: int, memberextensionno: int, callid: str, clinumberid: int, accountid: int, accountno: str, campaignid: int, predictiveID: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        currentIST = datetime.now(IST)
        datetimeIST = currentIST.strftime("%Y-%m-%d %H:%M:%S")
        conversationid = '00C' + alphanumericUniqueId()
        await session.execute(Update(RelationalCallsLeadsConversations)
            .where(and_(
                    RelationalCallsLeadsConversations.r_callId == callid,
                    RelationalCallsLeadsConversations.r_accountId == accountid,
                    RelationalCallsLeadsConversations.r_accountNo == accountno,
            )).values(r_conversationId=conversationid)
        )
        await session.flush()
        recordQuery = await session.execute(
            select(RelationalCallsLeadsConversations.r_leadId)
            .where(and_(
                    RelationalCallsLeadsConversations.r_callId == callid,
                    RelationalCallsLeadsConversations.r_accountId == accountid,
                    RelationalCallsLeadsConversations.r_accountNo == accountno,
            ))
        )
        leadid = recordQuery.scalar_one_or_none()
        Conversation = Conversations(
            c_accountId = accountid,
            c_accountNo = accountno,
            c_conversationId = conversationid,
            c_conversationPhoneNo = phonenumber,
            c_conversationOwner = memberextensionno,
            c_conversationChannel = 'Pulse',
            c_conversationType = 'Call',
            c_conversationDetails = {'callId': callid, 'callDirection': 'Inbound', 'callCLINumberId': clinumberid,  'callStartTime': datetimeIST, "callCampaignId": campaignid, "predictiveID": predictiveID},
            c_conversationStatus = 'Active',
            c_leadId = leadid
        )
        session.add(Conversation)
        await session.flush()
        await session.execute(Update(Leads).where(
            Leads.l_leadId == leadid,
            Leads.l_leadOwner == 0
        ).values(l_leadOwner=memberextensionno) )
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
        
async def PredictiveinboundTerminationOne(callid: str, clinumberid: int, starttime: str, endtime: str, answertime: str, accountid: int, accountno: str, campaignid: int, predictiveID: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(RelationalCallsLeadsConversations).where(and_(
            RelationalCallsLeadsConversations.r_callId == callid,
            RelationalCallsLeadsConversations.r_accountId == accountid,
            RelationalCallsLeadsConversations.r_accountNo == accountno
        ))
        result = (await session.execute(recordQuery)).scalars().first()
        conversationid = result.r_conversationId
        await session.execute(Update(Conversations).where(
            Conversations.c_conversationId == conversationid,
        ).values({
            Conversations.c_conversationDetails: {'callId': callid, 'callDirection': 'Inbound', 'callCLINumberId': clinumberid, 'callStartTime': starttime, 'callAnswerTime': answertime, 'callEndTime': endtime, "campaignid": campaignid, "predictiveID": predictiveID},
            Conversations.c_conversationStatus: 'InActive'
        }))
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
        
async def PredictiveinboundTerminationTwo(callmode: str, callid: str, memberextensionno: str, memberphoneno: str, customerphoneno: str, disposition: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, talktime: int, terminationend: str, campaignid: int, clinumberid: int, clinumbername: str, accountid: int, accountno: str, callername: str, clientip: str, recordingUrl: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    client, db = asyncClientFactory(database)
    try:
        recordQuery = select(RelationalCallsLeadsConversations).where(and_(
            RelationalCallsLeadsConversations.r_callId == callid,
            RelationalCallsLeadsConversations.r_accountId == accountid,
            RelationalCallsLeadsConversations.r_accountNo == accountno
        ))
        result = (await session.execute(recordQuery)).scalars().first()
        leadid = result.r_leadId
        conversationid = result.r_conversationId
        recordQuery = (select(Members.m_memberName).where(and_(
                Members.m_memberExtensionNo == memberextensionno,
                Members.m_accountId == accountid,
                Members.m_accountNo == accountno
            ))
        )
        membername = (await session.execute(recordQuery)).scalar_one_or_none()
        Call = Calls(
            c_callId = callid,
            c_callRecordingUrl = recordingUrl,
            c_accountId = accountid,
            c_accountNo = accountno,
            c_campaignId = campaignid,
            c_clinumberId = clinumberid,
            c_clinumberName = clinumbername,
            c_memberExtensionNo = memberextensionno,
            c_memberPhoneno = memberphoneno,
            c_callerName = callername,
            c_customerPhoneno = customerphoneno,
            c_disposition = disposition,
            c_direction = 'Inbound',
            c_callDateTime = calldatetime,
            c_startTime = starttime,
            c_endTime = endtime,
            c_answerTime = answertime,
            c_duration = duration,
            c_talktime = talktime,
            c_terminationEnd = terminationend,
            c_callMode = callmode,
            c_clientIp = clientip,
            c_dial_method = 'Predictive'
        )
        session.add(Call)
        await session.flush()
        taskid = '00T' + alphanumericUniqueId()
        Task = Tasks(
            t_accountId = accountid,
            t_accountNo = accountno,
            t_taskId = taskid,
            t_taskPhoneNo = customerphoneno,
            t_taskOwner = memberextensionno,
            t_taskChannel = 'Pulse',
            t_taskDirection = 'Inbound',
            t_taskType = 'Call',
            t_taskDetails = {'c_callId': callid, 'c_callRecordingUrl': recordingUrl, 'c_accountId': accountid, 'c_accountNo': accountno, 'c_campaignId': campaignid, 'c_clinumberId': clinumberid, 'c_clinumberName': clinumbername, 'c_memberExtensionNo': memberextensionno, 'c_memberPhoneno': memberphoneno, 'c_customerPhoneno': customerphoneno, 'c_disposition': disposition, 'c_direction': 'Inbound', 'c_callDateTime': calldatetime, 'c_startTime': starttime, 'c_endTime': endtime, 'c_answerTime': answertime, 'c_duration': duration, 'c_talktime': talktime, 'c_terminationEnd': terminationend, 'c_dial_method': 'Predictive'},
            t_taskFollowup = {},
            t_leadId = leadid,
            t_conversationId = conversationid,
            t_campaignId = campaignid
        )
        session.add(Task)
        await session.commit()
        activitytimestamp = datetime.now(IST)
        collection = db['activities']
        record = {
            'accountId': accountid,
            'accountNo': accountno,
            'leadId': leadid,
            'taskId': taskid,
            'conversationId': conversationid,
            'campaignId': campaignid,
            'memberName': membername,
            'channel': 'Pulse',
            'direction': 'Inbound',
            'type': 'Call',
            'activityTimestamp': activitytimestamp.isoformat(),
            'details': {
                'c_callId': callid,
                'c_callRecordingUrl': recordingUrl,
                'c_accountId': accountid,
                'c_accountNo': accountno,
                'c_campaignId': campaignid,
                'c_clinumberId': clinumberid,
                'c_clinumberName': clinumbername,
                'c_memberExtensionNo': memberextensionno,
                'c_memberPhoneno': memberphoneno,
                'c_customerPhoneno': customerphoneno,
                'c_disposition': disposition,
                'c_direction': 'Inbound',
                'c_callDateTime': calldatetime,
                'c_startTime': starttime,
                'c_endTime': endtime,
                'c_answerTime': answertime,
                'c_duration': duration,
                'c_talktime': talktime,
                'c_terminationEnd': terminationend
            }
        }
        await collection.insert_one(record)
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except PyMongoError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
        client.close()
        
async def PredictiveinboundTerminationThree(callmode: str, callid: str, memberextensionno: str, memberphoneno: str, customerphoneno: str, disposition: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, talktime: int, terminationend: str, campaignid: int, clinumberid: int, clinumbername: str, accountid: int, accountno: str, callername: str, clientip: str, recordingUrl: str,  database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        Call = Calls(
            c_callId = callid,
            c_callRecordingUrl = recordingUrl,
            c_accountId = accountid,
            c_accountNo = accountno,
            c_campaignId = campaignid,
            c_clinumberId = clinumberid,
            c_clinumberName = clinumbername,
            c_memberExtensionNo = memberextensionno,
            c_memberPhoneno = memberphoneno,
            c_callerName = callername,
            c_customerPhoneno = customerphoneno,
            c_disposition = disposition,
            c_direction = 'Inbound',
            c_callDateTime = calldatetime,
            c_startTime = starttime,
            c_endTime = endtime,
            c_answerTime = answertime,
            c_duration = duration,
            c_talktime = talktime,
            c_terminationEnd = terminationend,
            c_callMode = callmode,
            c_clientIp = clientip,
            c_dial_method = 'Predictive'
        )
        session.add(Call)
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f'Integrity Error, {str(e.orig)}')
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Database Error, {str(e)}')
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f'Unexpected Error, {str(e)}')
    finally:
        await session.close()
        await async_engine.dispose()
