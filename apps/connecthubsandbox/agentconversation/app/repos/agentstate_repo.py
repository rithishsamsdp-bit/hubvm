from db.context import  get_async_engine, get_async_engine_db2
from sqlalchemy import Delete
from sqlalchemy import Update, select,func,delete
from sqlalchemy import or_
from sqlalchemy import and_, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import Agents, AgentStatus, Members, StateLogs, LiveMonitoring, Campaigns, Tiers
from fastapi import HTTPException
from sqlalchemy.exc import  SQLAlchemyError
import json
from fastapi import  status
from fastapi.responses import JSONResponse
from typing import Optional
from fastapi import status
import random
import colorsys
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from producer.kafkaproducer import send_message
from sqlalchemy.dialects import mysql
import traceback
import logging
import json
import os

IST_OFFSET = timedelta(hours=5, minutes=30)
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "livemonitor-topic")
logger = logging.getLogger("livemonitor")

async def readynotreadystate(m_accountId: int,m_accountNo: str,accountEncryption: str,m_memberId: int,m_memberExtensionNo: int,  m_memberName:str, m_memberRole:str, p_proxyId:int, p_proxyPrivateIPAddress:str, r_status: str,campId:int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session: AsyncSession = async_session_maker()

    async_engine2 = get_async_engine_db2('onedb')
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2: AsyncSession = async_session_maker2()
    
    try:
        nowIstup = datetime.now(ZoneInfo("Asia/Kolkata"))
        MembersUpdate = (update(Members).where(Members.m_memberExtensionNo == m_memberExtensionNo).values(m_readyStatus=r_status,m_readyStatusStartTime=nowIstup))
        resultMembersupdate = await session.execute(MembersUpdate)
        await session.commit()
        
        result = await session.execute(select(Campaigns).where(Campaigns.c_campaignId == campId))
        campaign = result.scalar_one_or_none()
        nowIst = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
        
        if campaign:
            dialer_type = campaign.c_dialerType
            c_queuegroupId = campaign.c_queuegroupId
            status = "Available" if r_status == "READY" else "On Break"
            if dialer_type == 'PREDICTIVE':
                status = "On Break"
                pattern = f"{m_memberExtensionNo}@%"
                agentUpdate = (update(Agents).where(Agents.name.like(pattern)).values(status=status,no_answer_count=0))
                resultagentupdate = await session2.execute(agentUpdate)
                await session2.commit()
                
                
                if r_status == "READY":
                    status = "Available"
                    agentUpdate = (Update(Agents).where(and_(Agents.name == f"{m_memberExtensionNo}@{c_queuegroupId}",Agents.queue == f"{c_queuegroupId}@{m_accountNo}")).values(status=status,no_answer_count=0))
                    result = await session2.execute(agentUpdate)
                    await session2.commit()
                    compiled = agentUpdate.compile(
                        dialect=mysql.dialect(),
                        compile_kwargs={"literal_binds": True}
                    )
                    print(str(compiled))
            else:
                agent_names = (await session2.scalars(select(Agents.name).where(and_(Agents.dialer_type == "PREDICTIVE",Agents.agent_exten == m_memberExtensionNo)))).all()
                if agent_names:
                    await session2.execute(delete(Tiers).where(Tiers.agent.in_(agent_names)))
                    await session2.execute(delete(Agents).where(and_(Agents.dialer_type == "PREDICTIVE", Agents.agent_exten == m_memberExtensionNo)))
                pattern = f"{m_memberExtensionNo}@%"
                
                agentUpdate = (Update(Agents).where(Agents.name.like(pattern)).values(status=status,no_answer_count=0))
                result = await session2.execute(agentUpdate)
                await session2.commit()
                print("Rows updated:", result.rowcount)
            
        data = {
            "type": "AgentReadyAPI",
            "nowIst":nowIst,
            "accountId": m_accountId,
            "memberId": m_memberId,
            "accountNo": m_accountNo,
            "extension": str(m_memberExtensionNo),
            "status": r_status,
            "memberName": m_memberName,
            "memberRole": m_memberRole,
        }
        await send_message(KAFKA_TOPIC, "Livemonitor", data)

        return {
            "accountId": m_accountId,
            "memberId": m_memberId,
            "accountNo": m_accountNo,
            "extensionNo": m_memberExtensionNo,
            "status": r_status 
        }

    except SQLAlchemyError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    except Exception as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
        await session2.close()
        await async_engine2.dispose()     
     
async def readynotreadystatemid(m_accountId: int,m_accountNo: str,accountEncryption: str,m_memberId: int,m_memberExtensionNo: int,  m_memberName:str, m_memberRole:str,  p_proxyId:int, p_proxyPrivateIPAddress:str, r_status: str,campId:int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session: AsyncSession = async_session_maker()

    async_engine2 = get_async_engine_db2('onedb')
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2: AsyncSession = async_session_maker2()
    
    try:
        nowIstup = datetime.now(ZoneInfo("Asia/Kolkata"))
        MembersUpdate = (update(Members).where(Members.m_memberExtensionNo == m_memberExtensionNo).values(m_readyStatus=r_status,m_readyStatusStartTime=nowIstup))
        resultMembersupdate = await session.execute(MembersUpdate)
        await session.commit()
        
        result = await session.execute(select(Campaigns).where(Campaigns.c_campaignId == campId))
        campaign = result.scalar_one_or_none()
        nowIst = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
        
        if campaign:
            dialer_type = campaign.c_dialerType
            c_queuegroupId = campaign.c_queuegroupId
            state = "Waiting" if r_status == "READY" else "Idle"
            if dialer_type == 'PREDICTIVE':
                state = "Waiting"
                pattern = f"{m_memberExtensionNo}@%"
                agentUpdate = (update(Agents).where(Agents.name.like(pattern)).values(state=state,no_answer_count=0))
                resultagentupdate = await session2.execute(agentUpdate)
                await session2.commit()
                
                
                if r_status == "READY":
                    state = "Idle"
                    agentUpdate = (Update(Agents).where(and_(Agents.name == f"{m_memberExtensionNo}@{c_queuegroupId}",Agents.queue == f"{c_queuegroupId}@{m_accountNo}")).values(state=state,no_answer_count=0))
                    result = await session2.execute(agentUpdate)
                    await session2.commit()
                    compiled = agentUpdate.compile(
                        dialect=mysql.dialect(),
                        compile_kwargs={"literal_binds": True}
                    )
                    print(str(compiled))
            else:
                agent_names = (await session2.scalars(select(Agents.name).where(and_(Agents.dialer_type == "PREDICTIVE",Agents.agent_exten == m_memberExtensionNo)))).all()
                if agent_names:
                    await session2.execute(delete(Tiers).where(Tiers.agent.in_(agent_names)))
                    await session2.execute(delete(Agents).where(and_(Agents.dialer_type == "PREDICTIVE", Agents.agent_exten == m_memberExtensionNo)))
                pattern = f"{m_memberExtensionNo}@%"
                
                agentUpdate = (Update(Agents).where(Agents.name.like(pattern)).values(state=state,no_answer_count=0))
                result = await session2.execute(agentUpdate)
                await session2.commit()
                print("Rows updated:", result.rowcount)
            
        data = {
            "type": "AgentReadyAPI",
            "nowIst":nowIst,
            "accountId": m_accountId,
            "memberId": m_memberId,
            "accountNo": m_accountNo,
            "extension": str(m_memberExtensionNo),
            "status": r_status,
            "memberName": m_memberName,
            "memberRole": m_memberRole,
        }
        await send_message(KAFKA_TOPIC, "Livemonitor", data)

        return {
            "accountId": m_accountId,
            "memberId": m_memberId,
            "accountNo": m_accountNo,
            "extensionNo": m_memberExtensionNo,
            "status": r_status 
        }

    except SQLAlchemyError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    except Exception as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
        await session2.close()
        await async_engine2.dispose()  
           
async def agentbreak(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int,m_memberExtensionNo:int , m_memberName:str, m_memberRole:str, r_status:str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    async_engine2 = get_async_engine_db2('onedb')
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2: AsyncSession = async_session_maker2()
    
    try:
        
        pattern = f"{m_memberExtensionNo}@%"
        status =  "Available" if r_status == "AVAILABLE" else "On Break"
        nowIst = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
        agentupdate = (Update(Agents).where(Agents.name.like(pattern)).values(status=status))
        result = await session2.execute(agentupdate)
        updated_rows = result.rowcount
        await session2.commit()
        
        if r_status != "AVAILABLE":
            old_member = await session.execute(select(Members.m_status, Members.m_statusTime).where(Members.m_memberId == m_memberId))
            old_member = old_member.mappings().first()
            oldstatus = old_member["m_status"] if old_member else None
            oldstatusTime = old_member["m_statusTime"] if old_member else None
            
            nowIstup = datetime.now(ZoneInfo("Asia/Kolkata"))
            stmtUpdateMembers = (update(Members).where(Members.m_memberId == m_memberId).values(m_status=r_status,m_statusTime=nowIstup))
            await session.execute(stmtUpdateMembers)
            
            stmtupdateagentstatus = (update(LiveMonitoring).where(LiveMonitoring.l_membermemberId == m_memberId).values(l_memberStatus=r_status))
            await session.execute(stmtupdateagentstatus)
            
            data = {
                "type": "AgentBreakAPI",
                "nowIst":nowIst,
                "accountId": m_accountId,
                "memberId": m_memberId,
                "accountNo": m_accountNo,
                "extension": str(m_memberExtensionNo),
                "status": r_status,
                "memberName": m_memberName,
                "memberRole": m_memberRole,
                "oldstatus":oldstatus,
                "oldstatusTime":oldstatusTime.strftime("%Y-%m-%d %H:%M:%S") if oldstatusTime else None,
            }
            await send_message(KAFKA_TOPIC, "Livemonitor", data)
        await session.commit()
        return {
            "accountId": m_accountId,
            "memberId": m_memberId,
            "extensionNo": m_memberExtensionNo,
            "status": status,
            "updatedRows": updated_rows
        }
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await async_engine.dispose()
        await session2.close()
        await async_engine2.dispose()

async def changecampaign(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int,m_memberExtensionNo:str , m_memberName:str, m_memberRole:str, campName:str, campId:int, p_proxyId:int, p_proxyPrivateIPAddress:str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    async_engine2 = get_async_engine_db2('onedb')
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2: AsyncSession = async_session_maker2()
    
    try:
        result = await session.execute(select(Campaigns).where(Campaigns.c_campaignId == campId))
        campaign = result.scalar_one_or_none()
        dialer_type = campaign.c_dialerType
        if campaign:
            queuegroupid = campaign.c_queuegroupId
            if dialer_type == 'PREDICTIVE':
                c_campaignRules = campaign.c_campaignRules
                wrapuptime = c_campaignRules.get("wrapupInterval", 0)
                row =  await session.execute(select(Members.m_status,Members.m_readyStatus).where(Members.m_memberId == m_memberId))
                result = row.one_or_none()
                if result:
                    agstatus = result.m_status
                    agready_status = result.m_readyStatus
                    status = "On Break"
                    pattern = f"{m_memberExtensionNo}@%"
                    agentUpdate = (update(Agents).where(Agents.name.like(pattern)).values(status=status,no_answer_count=0))
                    resultagentupdate = await session2.execute(agentUpdate)
                    await session2.commit()
                    if agstatus == "LOGOUT":
                        status = "Logged Out"
                    elif agready_status == "READY" and agstatus != "LOGOUT":
                        status = "Available"
                    elif agready_status == "NOTREADY" and agstatus != "LOGOUT":
                        status = "On Break"
                    else:
                        status = "Logged Out"
                
                    Tier = Tiers(
                        queue=f"{queuegroupid}@{m_accountNo}",
                        agent=f"{m_memberExtensionNo}@{queuegroupid}",
                        state="Ready",
                        level=1,
                        position=1
                    )
                    session2.add(Tier)
                    Agent = Agents(
                        queue=f"{queuegroupid}@{m_accountNo}",
                        name=f"{m_memberExtensionNo}@{queuegroupid}",
                        instance_id='single_box',
                        uuid="",
                        type="callback",
                        contact = f"{{call_timeout=30,sip_h_X-predictiveleadID=${{predictiveleadId}},hangup_after_bridge=true,execute_on_answer='lua /opt/freeswitch/storage/script/Predictive_inbound_queue_answer.lua ${{uuid}} {m_accountId} {m_accountNo} {campId}'}}sofia/internal/sip:{m_memberExtensionNo}@{p_proxyPrivateIPAddress}:5182",
                        status=status,
                        state="Waiting",
                        max_no_answer=0,
                        wrap_up_time=wrapuptime,
                        reject_delay_time=0,
                        busy_delay_time=0,
                        no_answer_delay_time=30,
                        last_bridge_start=0,
                        last_bridge_end=0,
                        last_offered_call=0,
                        last_status_change=0,
                        no_answer_count=0,
                        calls_answered=0,
                        talk_time=0,
                        ready_time=0,
                        external_calls_count=0,
                        dialer_type="PREDICTIVE",
                        agent_exten=m_memberExtensionNo
                    
                    )
                    session2.add(Agent)
            else:
                agent_names = (await session2.scalars(select(Agents.name).where(and_(Agents.dialer_type == "PREDICTIVE",Agents.agent_exten == m_memberExtensionNo)))).all()
                if agent_names:
                    await session2.execute(delete(Tiers).where(Tiers.agent.in_(agent_names)))
                    await session2.execute(delete(Agents).where(and_(Agents.dialer_type == "PREDICTIVE", Agents.agent_exten == m_memberExtensionNo)))
                row =  await session.execute(select(Members.m_status,Members.m_readyStatus).where(Members.m_memberId == m_memberId))
                result = row.one_or_none()
                if result:
                    agstatus = result.m_status
                    agready_status = result.m_readyStatus
                    status = "Logged Out"
                    if agstatus == "LOGOUT":
                        status = "Logged Out"
                    elif agready_status == "READY" and agstatus != "LOGOUT":
                        status = "Available"
                    elif agready_status == "NOTREADY" and agstatus != "LOGOUT":
                        status = "On Break"
                    else:
                        status = "Logged Out"
                    pattern = f"{m_memberExtensionNo}@%"
                    agentUpdate = (update(Agents).where(Agents.name.like(pattern)).values(status=status,no_answer_count=0))
                    resultagentupdate = await session2.execute(agentUpdate)
        
        membercampupdate = update(Members).where(Members.m_memberId == m_memberId).values(m_campaignId=campId)
        result = await session.execute(membercampupdate)
        
        memberlivemonupdate = update(LiveMonitoring).where(LiveMonitoring.l_membermemberId == m_memberId).values(l_memberCampaignId=campId, l_memberCampaignName=campName)
        result = await session.execute(memberlivemonupdate)
        
        await session2.commit()
        await session.commit() 
        
        updated_rows = result.rowcount
        nowIst = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
        data = {
            "type": "ChangeCampaignAPI",
            "nowIst":nowIst,
            "accountId": m_accountId,
            "memberId": m_memberId,
            "accountNo": m_accountNo,
            "extension": m_memberExtensionNo,
            "campaignId": campId,
            "campaignName": campName,
            "memberName": m_memberName,
            "memberRole": m_memberRole,
        }
        await send_message(KAFKA_TOPIC, "Livemonitor", data)
        return {
            "accountId": m_accountId,
            "memberId": m_memberId,
            "extensionNo": m_memberExtensionNo,
            "campaignId": campId,
            "campaignName": campName,
            "dialertype": dialer_type,
            "updatedRows": updated_rows
        }
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await session2.close()
        await async_engine.dispose()
        await async_engine2.dispose()

async def changecampaignmid(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberId: int,m_memberExtensionNo:str , m_memberName:str, m_memberRole:str, campName:str, campId:int, p_proxyId:int, p_proxyPrivateIPAddress:str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    async_engine2 = get_async_engine_db2('onedb')
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2: AsyncSession = async_session_maker2()
    
    try:
        result = await session.execute(select(Campaigns).where(Campaigns.c_campaignId == campId))
        campaign = result.scalar_one_or_none()
        dialer_type = campaign.c_dialerType
        if campaign:
            queuegroupid = campaign.c_queuegroupId
            if dialer_type == 'PREDICTIVE':
                c_campaignRules = campaign.c_campaignRules
                wrapuptime = c_campaignRules.get("wrapupInterval", 0)
                print(wrapuptime)
                print(c_campaignRules)
                row =  await session.execute(select(Members.m_status,Members.m_readyStatus).where(Members.m_memberId == m_memberId))
                result = row.one_or_none()
                if result:
                    agstatus = result.m_status
                    agready_status = result.m_readyStatus
                    state = "Idle"
                    pattern = f"{m_memberExtensionNo}@%"
                    agentUpdate = (update(Agents).where(Agents.name.like(pattern)).values(state=state,no_answer_count=0))
                    resultagentupdate = await session2.execute(agentUpdate)
                    await session2.commit()
                    if agstatus == "LOGOUT":
                        state = "Idle"
                        status = "Logged Out"
                    elif agready_status == "READY" and agstatus != "LOGOUT":
                        state = "Waiting"
                        status = "Available"
                    elif agready_status == "NOTREADY" and agstatus != "LOGOUT":
                        state = "Idle"
                        status = "Available"
                    else:
                        state = "Idle"
                        status = "Logged Out"
                
                    Tier = Tiers(
                        queue=f"{queuegroupid}@{m_accountNo}",
                        agent=f"{m_memberExtensionNo}@{queuegroupid}",
                        state="Ready",
                        level=1,
                        position=1
                    )
                    session2.add(Tier)
                    Agent = Agents(
                        queue=f"{queuegroupid}@{m_accountNo}",
                        name=f"{m_memberExtensionNo}@{queuegroupid}",
                        instance_id='single_box',
                        uuid="",
                        type="callback",
                        contact = f"{{call_timeout=30,sip_h_X-predictiveleadID=${{predictiveleadId}},hangup_after_bridge=true,execute_on_answer='lua /opt/freeswitch/storage/script/Predictive_inbound_queue_answer.lua ${{uuid}} {m_accountId} {m_accountNo} {campId}'}}sofia/internal/sip:{m_memberExtensionNo}@{p_proxyPrivateIPAddress}:5182",
                        status=status,
                        state=state,
                        max_no_answer=0,
                        wrap_up_time=wrapuptime,
                        reject_delay_time=0,
                        busy_delay_time=0,
                        no_answer_delay_time=30,
                        last_bridge_start=0,
                        last_bridge_end=0,
                        last_offered_call=0,
                        last_status_change=0,
                        no_answer_count=0,
                        calls_answered=0,
                        talk_time=0,
                        ready_time=0,
                        external_calls_count=0,
                        dialer_type="PREDICTIVE",
                        agent_exten=m_memberExtensionNo
                    
                    )
                    session2.add(Agent)
            else:
                agent_names = (await session2.scalars(select(Agents.name).where(and_(Agents.dialer_type == "PREDICTIVE",Agents.agent_exten == m_memberExtensionNo)))).all()
                if agent_names:
                    await session2.execute(delete(Tiers).where(Tiers.agent.in_(agent_names)))
                    await session2.execute(delete(Agents).where(and_(Agents.dialer_type == "PREDICTIVE", Agents.agent_exten == m_memberExtensionNo)))
                row =  await session.execute(select(Members.m_status,Members.m_readyStatus).where(Members.m_memberId == m_memberId))
                result = row.one_or_none()
                if result:
                    agstatus = result.m_status
                    agready_status = result.m_readyStatus
                    state = "Idle"
                    if agstatus == "LOGOUT":
                        state = "Idle"
                        status = "Logged Out"
                    elif agready_status == "READY" and agstatus != "LOGOUT":
                        state = "Waiting"
                        status = "Available"
                    elif agready_status == "NOTREADY" and agstatus != "LOGOUT":
                        state = "Idle"
                        status = "On Break"
                    else:
                        state = "Idle"
                        status = "Logged Out"
                    pattern = f"{m_memberExtensionNo}@%"
                    agentUpdate = (update(Agents).where(Agents.name.like(pattern)).values(state=state,no_answer_count=0))
                    resultagentupdate = await session2.execute(agentUpdate)
        
        membercampupdate = update(Members).where(Members.m_memberId == m_memberId).values(m_campaignId=campId)
        result = await session.execute(membercampupdate)
        
        memberlivemonupdate = update(LiveMonitoring).where(LiveMonitoring.l_membermemberId == m_memberId).values(l_memberCampaignId=campId, l_memberCampaignName=campName)
        result = await session.execute(memberlivemonupdate)
        
        await session2.commit()
        await session.commit() 
        
        updated_rows = result.rowcount
        nowIst = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S")
        data = {
            "type": "ChangeCampaignAPI",
            "nowIst":nowIst,
            "accountId": m_accountId,
            "memberId": m_memberId,
            "accountNo": m_accountNo,
            "extension": m_memberExtensionNo,
            "campaignId": campId,
            "campaignName": campName,
            "memberName": m_memberName,
            "memberRole": m_memberRole,
        }
        await send_message(KAFKA_TOPIC, "Livemonitor", data)
        return {
            "accountId": m_accountId,
            "memberId": m_memberId,
            "extensionNo": m_memberExtensionNo,
            "campaignId": campId,
            "campaignName": campName,
            "dialertype": dialer_type,
            "updatedRows": updated_rows
        }
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await session.close()
        await session2.close()
        await async_engine.dispose()
        await async_engine2.dispose()
