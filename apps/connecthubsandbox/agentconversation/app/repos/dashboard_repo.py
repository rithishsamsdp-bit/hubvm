from sqlalchemy import select, func, case, and_, cast, Integer
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import get_async_engine
from models.db import Calls, Conversations, CallFollowups, AgentStatus, LiveQueueMembers
from models.db import QueueGroups
from typing import Dict
from datetime import datetime
from decimal import Decimal

def convert_to_json_serializable(value):
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return int(value)
    return value

async def statsfetch(accountid: int, accountno: str, member_extension_no: str, database: str) -> Dict:
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    try:
        today = datetime.now().date()
        
        calls_query = select(
            func.count(Calls.c_logId).label('total_calls'),
            
            # Inbound statistics
            func.sum(case((Calls.c_direction == 'Inbound', 1), else_=0)).label('inbound_calls'),
            func.sum(case((and_(Calls.c_direction == 'Inbound', Calls.c_disposition == 'ANSWERED'), 1), else_=0)).label('inbound_answered'),
            func.sum(case((and_(Calls.c_direction == 'Inbound', Calls.c_disposition.in_(['NO ANSWER', 'BUSY', 'FAILED', 'nil'])), 1), else_=0)).label('inbound_missed'),
            
            # Outbound statistics
            func.sum(case((Calls.c_direction == 'Outbound', 1), else_=0)).label('outbound_calls'),
            func.sum(case((and_(Calls.c_direction == 'Outbound', Calls.c_disposition == 'ANSWERED'), 1), else_=0)).label('outbound_answered'),
            func.sum(case((and_(Calls.c_direction == 'Outbound', Calls.c_disposition.in_(['NO ANSWER', 'BUSY', 'FAILED', 'nil'])), 1), else_=0)).label('outbound_unanswered'),
            
            # Voicemail count
            func.sum(case((Calls.c_disposition == 'VOICEMAIL', 1), else_=0)).label('voicemail_count'),
            
            # Duration statistics
            func.coalesce(func.sum(Calls.c_duration), 0).label('total_duration'),
            func.coalesce(func.sum(Calls.c_talktime), 0).label('total_talktime')
        ).where(
            and_(
                Calls.c_accountId == accountid,
                Calls.c_accountNo == accountno,
                Calls.c_memberExtensionNo == cast(member_extension_no, Integer),
                func.date(Calls.c_callDateTime) == today
            )
        )
        
        calls_result = await session.execute(calls_query)
        calls_row = calls_result.fetchone()
        
        # ==================== CONVERSATIONS STATISTICS (ORM) ====================
        conversations_query = select(
            func.count(Conversations.c_recordId).label('total_conversations'),
            func.sum(case((Conversations.c_conversationChannel == 'SMS', 1), else_=0)).label('sms_conversations'),
            func.sum(case((Conversations.c_conversationChannel == 'Whatsapp', 1), else_=0)).label('whatsapp_conversations'),
            func.sum(case((Conversations.c_conversationStatus == 'Active', 1), else_=0)).label('open_conversations'),
            func.sum(case((Conversations.c_conversationStatus == 'Inactive', 1), else_=0)).label('closed_conversations')
        ).where(
            and_(
                Conversations.c_accountId == accountid,
                Conversations.c_accountNo == accountno,
                Conversations.c_conversationOwner == cast(member_extension_no, Integer),
                func.date(Conversations.c_createdOn) == today
            )
        )
        
        conv_result = await session.execute(conversations_query)
        conv_row = conv_result.fetchone()
        
        # ==================== CALL FOLLOWUPS (ORM) ====================
        followup_query = select(
            func.count(CallFollowups.c_recordId).label('callback_scheduled')
        ).where(
            and_(
                CallFollowups.c_accountId == accountid,
                CallFollowups.c_accountNo == accountno,
                func.date(CallFollowups.c_createdOn) == today
            )
        )
        
        followup_result = await session.execute(followup_query)
        followup_row = followup_result.fetchone()
        
        # ==================== AGENT STATUS STATISTICS (ORM) ====================
        status_query = select(
            func.sum(case((AgentStatus.a_status.in_(['LOGIN', 'READY']), func.coalesce(AgentStatus.a_durationSeconds, 0)), else_=0)).label('login_time_seconds'),
            func.sum(case((AgentStatus.a_status.in_(['BREAK', 'QUERY', 'LUNCH', 'MEETING', 'RESTROOM']), func.coalesce(AgentStatus.a_durationSeconds, 0)), else_=0)).label('break_time_seconds'),
            func.sum(case((AgentStatus.a_status == 'READY', func.coalesce(AgentStatus.a_durationSeconds, 0)), else_=0)).label('available_time_seconds'),
            func.count(case((AgentStatus.a_status.in_(['BREAK', 'QUERY', 'LUNCH', 'MEETING', 'RESTROOM']), 1))).label('break_count')
        ).where(
            and_(
                AgentStatus.a_accountId == accountid,
                AgentStatus.a_accountNo == accountno,
                AgentStatus.a_memberExtensionNo == cast(member_extension_no, Integer),
                func.date(AgentStatus.a_startTime) == today
            )
        )
        
        status_result = await session.execute(status_query)
        status_row = status_result.fetchone()
        
        # ==================== CONVERT ALL VALUES TO JSON-SERIALIZABLE TYPES ====================
        total_calls = convert_to_json_serializable(calls_row.total_calls if calls_row else 0)
        inbound_calls = convert_to_json_serializable(calls_row.inbound_calls if calls_row else 0)
        inbound_answered = convert_to_json_serializable(calls_row.inbound_answered if calls_row else 0)
        inbound_missed = convert_to_json_serializable(calls_row.inbound_missed if calls_row else 0)
        outbound_calls = convert_to_json_serializable(calls_row.outbound_calls if calls_row else 0)
        outbound_answered = convert_to_json_serializable(calls_row.outbound_answered if calls_row else 0)
        outbound_unanswered = convert_to_json_serializable(calls_row.outbound_unanswered if calls_row else 0)
        voicemail_count = convert_to_json_serializable(calls_row.voicemail_count if calls_row else 0)
        total_duration = convert_to_json_serializable(calls_row.total_duration if calls_row else 0)
        total_talktime = convert_to_json_serializable(calls_row.total_talktime if calls_row else 0)
        
        total_conversations = convert_to_json_serializable(conv_row.total_conversations if conv_row else 0)
        sms_conversations = convert_to_json_serializable(conv_row.sms_conversations if conv_row else 0)
        whatsapp_conversations = convert_to_json_serializable(conv_row.whatsapp_conversations if conv_row else 0)
        open_conversations = convert_to_json_serializable(conv_row.open_conversations if conv_row else 0)
        closed_conversations = convert_to_json_serializable(conv_row.closed_conversations if conv_row else 0)
        
        callback_scheduled = convert_to_json_serializable(followup_row.callback_scheduled if followup_row else 0)
        
        login_time_seconds = convert_to_json_serializable(status_row.login_time_seconds if status_row else 0)
        break_time_seconds = convert_to_json_serializable(status_row.break_time_seconds if status_row else 0)
        available_time_seconds = convert_to_json_serializable(status_row.available_time_seconds if status_row else 0)
        break_count = convert_to_json_serializable(status_row.break_count if status_row else 0)
        idle_time_seconds = max(0, available_time_seconds - total_duration)
        
        stats = {
            "total_calls": total_calls,
            "inbound_calls": inbound_calls,
            "inbound_answered": inbound_answered,
            "inbound_missed": inbound_missed,
            "outbound_calls": outbound_calls,
            "outbound_answered": outbound_answered,
            "outbound_unanswered": outbound_unanswered,
            "voicemail_count": voicemail_count,
            "idle_time": idle_time_seconds,
            "available_time": available_time_seconds,
            "login_time": login_time_seconds,
            "total_break_time": break_time_seconds,
            "break_time_stamps": break_count,
            "total_duration": total_duration,
            "total_talktime": total_talktime,
            "callback_scheduled": callback_scheduled,
            "sms_inbound": sms_conversations,
            "sms_outbound": 0,
            "whatsapp_conversations": whatsapp_conversations,
            "total_conversations": total_conversations,
            "open_conversations": open_conversations,
            "closed_conversations": closed_conversations
        }
        
        return stats
        
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def fetch_live_queues(accountno: str, member_id: int, database: str) -> Dict:
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    try:
        # 1. Fetch queues this agent is assigned to (Source: p_queuegroups)
        agent_queues_query = select(QueueGroups.q_queuegroupId).where(
            and_(
                QueueGroups.q_memberId == member_id,
                QueueGroups.q_accountNo == accountno
            )
        )
        # Note: q_queuegroupStatus='Inactive' (from repo logic) seems to imply active assignment.
        # Wait, repo used: if Record.q_queuegroupStatus == "Inactive": groupDetails[groupId]["members"].append(...)
        # This implies Inactive means ASSIGNED? That seems backwards but let's stick to simple membership check first.
        # QueueGroup Repo logic implies rows in p_queuegroups ARE assignments.
        
        agent_queues_result = await session.execute(agent_queues_query)
        queue_ids = agent_queues_result.scalars().all()
        
        if not queue_ids:
             return { "total_waiting": 0 }

        # 2. Construct Queue Names for FreeSWITCH (format: ID@AccountNo)
        # e.g. 123@1000
        target_queues = [str(qid) for qid in queue_ids]

        # 3. Fetch waiting count ONLY for these queues
        query = select(func.count(LiveQueueMembers.member_uuid).label('total_waiting')).where(
            and_(
                LiveQueueMembers.account_no == accountno,
                LiveQueueMembers.status == 'WAITING',
                LiveQueueMembers.queue_name.in_(target_queues)
            )
        )
        
        result = await session.execute(query)
        total_waiting = result.scalar() or 0
            
        return {
            "total_waiting": total_waiting
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in fetch_live_queues: {str(e)}")
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error fetching live queues: {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

