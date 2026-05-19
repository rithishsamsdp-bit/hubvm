from db.context import get_sync_engine, get_async_engine
from sqlalchemy import select, insert, Delete, Update, distinct, literal, or_, and_, func, text, case, Date, cast, desc, extract, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import PLiveMonitoring, Members, CallLog, Calls, LiveCallStatus, Teams, CallbackReminders
# from models.dto import CampaignsModel
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.dialects import mysql
from datetime import datetime, timedelta, time

async def fetch(m_accountId: int,m_accountNo: int,accountEncryption: any,m_memberRole: str, m_memberId: int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    try:
        
        # Inbound/outbound conditions
        inbound = (Calls.c_direction == "Inbound")
        outbound = (Calls.c_direction == "Outbound")
        today_start = datetime.combine(datetime.now().date(), time.min)
        tomorrow_start = today_start + timedelta(days=1)
        
        # Aggregate call logs per member
        call_stats_subq = (
            select(
                Calls.c_memberExtensionNo.label("agent"),
                func.sum(case((inbound, 1), else_=0)).label("inbound_total"),
                func.sum(case((inbound & (Calls.c_disposition == 'ANSWERED'), 1), else_=0)).label("inbound_answered"),
                func.sum(case((inbound & (Calls.c_disposition == 'No Answer'), 1), else_=0)).label("inbound_unanswered"),
                func.sum(case((outbound, 1), else_=0)).label("outbound_total"),
                func.sum(case((outbound & (Calls.c_disposition == 'ANSWERED'), 1), else_=0)).label("outbound_answered"),
                func.sum(case((outbound & (Calls.c_disposition == 'No Answer'), 1), else_=0)).label("outbound_unanswered"),
            )
            .where(and_(Calls.c_accountId == m_accountId, Calls.c_callDateTime >= today_start, Calls.c_callDateTime < tomorrow_start))
            .group_by(Calls.c_memberExtensionNo)
        ).subquery()

        # Main query: Members LEFT JOIN call stats and live monitoring
        stmt = (
            select(
                Members.m_memberExtensionNo,
                Members.m_accountId,
                Members.m_accountNo,
                Members.m_memberName,
                Members.m_memberId,
                Members.m_readyStatus,
                call_stats_subq.c.inbound_total,
                call_stats_subq.c.inbound_answered,
                call_stats_subq.c.inbound_unanswered,
                call_stats_subq.c.outbound_total,
                call_stats_subq.c.outbound_answered,
                call_stats_subq.c.outbound_unanswered,
                PLiveMonitoring.l_memberCampaignId,
                PLiveMonitoring.l_memberCampaignName,
                PLiveMonitoring.l_memberCustomerNumber,
                PLiveMonitoring.l_memberCallDirection,
                PLiveMonitoring.l_memberuuid,
                PLiveMonitoring.l_memberStatus,
                PLiveMonitoring.l_memberCliNumberId,
                PLiveMonitoring.l_memberServerIp,
                PLiveMonitoring.l_memberLastUpdated,

            )
            .outerjoin(call_stats_subq, call_stats_subq.c.agent == Members.m_memberExtensionNo)
            .outerjoin(PLiveMonitoring, PLiveMonitoring.l_memberExtention == Members.m_memberExtensionNo)
            .where(and_(Members.m_accountId == m_accountId, Members.m_memberRole == 'USER')).group_by(Members.m_memberExtensionNo)
        )
        
        if m_memberRole == "TL":
            tl_memberIds_subq = (
                select(Members.m_memberId)
                .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                .where(
                    Teams.t_teamLeaderId == m_memberId,
                    Teams.t_accountId == m_accountId,
                    Teams.t_accountNo == m_accountNo
                )
            ).subquery()
            stmt = stmt.where(Members.m_memberId.in_(tl_memberIds_subq))
        
        print(stmt.compile(dialect=mysql.dialect(), compile_kwargs={"literal_binds": True}))
        # Execute
        result = await session.execute(stmt)
        rows = result.all()

        # Convert to JSON-friendly dict
        merged_data = []
        for row in rows:
            merged_data.append({
                "l_memberAccountId": row.m_accountId,
                "l_memberAccountNo": row.m_accountNo,
                "l_membermemberId": row.m_memberId,
                "l_memberName": row.m_memberName,
                "l_readyStatus": row.m_readyStatus,
                "l_memberExtention": str(row.m_memberExtensionNo),
                "l_inboundTotal": int(row.inbound_total or 0),
                "l_inboundAnswered": int(row.inbound_answered or 0),
                "l_inboundUnAnswered": int(row.inbound_unanswered or 0),
                "l_outboundTotal": int(row.outbound_total or 0),
                "l_outboundAnswered": int(row.outbound_answered or 0),
                "l_outboundUnAnswered": int(row.outbound_unanswered or 0),
                "l_memberCampaignId": row.l_memberCampaignId or 0,
                "l_memberCampaignName": row.l_memberCampaignName or "",
                "l_memberCustomerNumber": row.l_memberCustomerNumber or "",
                "l_memberCliNumberId": row.l_memberCliNumberId or 0,
                "l_memberCallDirection": row.l_memberCallDirection or "",
                "l_memberuuid": row.l_memberuuid or "",
                "l_memberStatus": row.l_memberStatus or "",
                "l_memberServerIp": row.l_memberServerIp or "",
                "l_memberLastUpdated": str(row.l_memberLastUpdated) if row.l_memberLastUpdated else ""
            })


        return merged_data

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

async def metrics(m_accountId: int,m_accountNo: int,accountEncryption: any,m_memberRole: str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    
    try:
        inbound = (Calls.c_direction == "Inbound")
        outbound = (Calls.c_direction == "Outbound")
        today_start = datetime.combine(datetime.now().date(), time.min)
        tomorrow_start = today_start + timedelta(days=1)

        stmt = (
            select(
                Members.m_memberExtensionNo.label("agent"),
                Members.m_accountId.label("account_id"),
                func.sum(case((inbound, 1), else_=0)).label("inbound_total"),
                func.sum(case((inbound & (Calls.c_talktime > 0), 1), else_=0)).label("inbound_answered"),
                func.sum(case((inbound & (Calls.c_talktime == 0), 1), else_=0)).label("inbound_unanswered"),
                func.sum(case((outbound, 1), else_=0)).label("outbound_total"),
                func.sum(case((outbound & (Calls.c_talktime > 0), 1), else_=0)).label("outbound_answered"),
                func.sum(case((outbound & (Calls.c_talktime == 0), 1), else_=0)).label("outbound_unanswered"),
            )
            .select_from(Members)
            .outerjoin(Calls, and_(Calls.c_memberExtensionNo == Members.m_memberExtensionNo, and_(Calls.c_callDateTime >= today_start, Calls.c_callDateTime < tomorrow_start)))
            .where(Members.m_accountId == m_accountId)
            .group_by(Members.m_memberExtensionNo, Members.m_accountId)
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Convert Decimal/None -> int/float for JSON serialization
        return [
            {
                "l_memberExtention": row.agent,
                "l_inboundTotal": int(row.inbound_total or 0),
                "l_inboundAnswered": int(row.inbound_answered or 0),
                "l_inboundUnAnswered": int(row.inbound_unanswered or 0),
                "l_outboundTotal": int(row.outbound_total or 0),
                "l_outboundAnswered": int(row.outbound_answered or 0),
                "l_outboundUnAnswered": int(row.outbound_unanswered or 0),
            }
            for row in rows
        ]
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

async def mainmetrics(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberRole: str, m_memberId: int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    
    try:
        inbound = (Calls.c_direction == "Inbound")
        outbound = (Calls.c_direction == "Outbound")
        today_start = datetime.combine(datetime.now().date(), time.min)
        tomorrow_start = today_start + timedelta(days=1)
        today_clause = and_(Calls.c_callDateTime >= today_start, Calls.c_callDateTime < tomorrow_start)

        # --- Main Metrics Query ---
        stmt = (
            select(
                # --- Totals ---
                func.sum(case((inbound, 1), else_=0)).label("inbound_total"),
                func.sum(case((inbound & (Calls.c_disposition == 'ANSWERED'), 1), else_=0)).label("inbound_answered"),
                func.sum(case((inbound & (Calls.c_disposition != 'ANSWERED'), 1), else_=0)).label("inbound_unanswered"),
                func.sum(case((inbound & (Calls.c_disposition == 'MISSED'), 1), else_=0)).label("inbound_missed"),

                func.sum(case((outbound, 1), else_=0)).label("outbound_total"),
                func.sum(case((outbound & (Calls.c_disposition == 'ANSWERED'), 1), else_=0)).label("outbound_answered"),
                func.sum(case((outbound & (Calls.c_disposition != 'ANSWERED'), 1), else_=0)).label("outbound_unanswered"),
                func.sum(case((outbound & (Calls.c_disposition == 'MISSED'), 1), else_=0)).label("outbound_missed"),

                # --- Talktime ---
                func.sum(Calls.c_talktime).label("total_talktime"),
                func.sum(case((inbound, Calls.c_talktime), else_=0)).label("inbound_duration"),
                func.sum(case((outbound, Calls.c_talktime), else_=0)).label("outbound_duration"),
                
                func.max(case((inbound, Calls.c_talktime), else_=0)).label("inbound_max_duration"),
                func.max(case((outbound, Calls.c_talktime), else_=0)).label("outbound_max_duration"),

                # Count only answered calls for avg
                func.sum(case((Calls.c_talktime > 0, 1), else_=0)).label("answered_call_count"),
                func.sum(case((inbound & (Calls.c_talktime > 0), 1), else_=0)).label("inbound_answered_count"),
                func.sum(case((outbound & (Calls.c_talktime > 0), 1), else_=0)).label("outbound_answered_count")
            )
            .select_from(Calls)
            .where(
                and_(
                    Calls.c_accountId == m_accountId,
                    today_clause
                )
            )
        )
        
        # --- Repeat Calls Logic (Inbound) ---
        # Count customer numbers with > 1 inbound call today
        repeat_inbound_subq = (
            select(Calls.c_customerPhoneno)
            .where(
                Calls.c_accountId == m_accountId,
                today_clause,
                Calls.c_direction == "Inbound"
            )
            .group_by(Calls.c_customerPhoneno)
            .having(func.count(Calls.c_customerPhoneno) > 1)
        ).subquery()
        
        repeat_inbound_stmt = select(func.count()).select_from(repeat_inbound_subq)

        # --- Repeat Calls Logic (Outbound) ---
        # Count customer numbers with > 1 outbound call today
        repeat_outbound_subq = (
            select(Calls.c_customerPhoneno)
            .where(
                Calls.c_accountId == m_accountId,
                today_clause,
                Calls.c_direction == "Outbound"
            )
            .group_by(Calls.c_customerPhoneno)
            .having(func.count(Calls.c_customerPhoneno) > 1)
        ).subquery()

        repeat_outbound_stmt = select(func.count()).select_from(repeat_outbound_subq)

        # --- Callback Requests (Outbound only) ---
        # Assuming we count records created today
        callback_req_stmt = (
            select(func.count())
            .select_from(CallbackReminders)
            .where(
                CallbackReminders.c_accountId == m_accountId,
                and_(CallbackReminders.c_createdOn >= today_start, CallbackReminders.c_createdOn < tomorrow_start)
            )
        )

        # Team Leader Filtering
        if m_memberRole == "TL":
            tl_memberExtensionNo_subq = (
                select(Members.m_memberExtensionNo)
                .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                .where(
                    Teams.t_teamLeaderId == m_memberId,
                    Teams.t_accountId == m_accountId,
                    Teams.t_accountNo == m_accountNo
                )
            ).subquery()
            
            stmt = stmt.where(Calls.c_memberExtensionNo.in_(tl_memberExtensionNo_subq))
            # Note: Repeat calls logic might need TL filtering if strictly per-agent, 
            # but usually repeat calls are account-wide or list-wide. 
            # If TL needs to see only repeats handled by their team:
            # repeat_inbound_subq = repeat_inbound_subq.where(Calls.c_memberExtensionNo.in_(tl_memberExtensionNo_subq))
            # For now keeping repeat calls as account-wide metric or standard logic unless specified.
            # actually, usually metrics adjust to view scope. I should apply TL filter to updates if possible.
            # But 'group by customer' with multiple agents is tricky. 
            # I will apply filters to the subqueries just to be safe and consistent.
            
            repeat_inbound_subq_tl = (
                 select(Calls.c_customerPhoneno)
                .where(
                    Calls.c_accountId == m_accountId,
                    today_clause,
                    Calls.c_direction == "Inbound",
                    Calls.c_memberExtensionNo.in_(tl_memberExtensionNo_subq)
                )
                .group_by(Calls.c_customerPhoneno)
                .having(func.count(Calls.c_customerPhoneno) > 1)
            ).subquery()
            repeat_inbound_stmt = select(func.count()).select_from(repeat_inbound_subq_tl)

            repeat_outbound_subq_tl = (
                 select(Calls.c_customerPhoneno)
                .where(
                    Calls.c_accountId == m_accountId,
                    today_clause,
                    Calls.c_direction == "Outbound",
                    Calls.c_memberExtensionNo.in_(tl_memberExtensionNo_subq)
                )
                .group_by(Calls.c_customerPhoneno)
                .having(func.count(Calls.c_customerPhoneno) > 1)
            ).subquery()
            repeat_outbound_stmt = select(func.count()).select_from(repeat_outbound_subq_tl)
            
            # Callback reminders typically don't have member extension populated reliably strictly for 'requests' 
            # unless assigned. The table has c_memberExtensionNo, so I'll filter.
            callback_req_stmt = callback_req_stmt.where(CallbackReminders.c_memberExtensionNo.in_(tl_memberExtensionNo_subq))

        # --- Peak Hour Logic (Inbound) ---
        peak_inbound_stmt = (
            select(extract('hour', cast(Calls.c_callDateTime, DateTime)).label('hour'))
            .where(
                Calls.c_accountId == m_accountId,
                today_clause,
                Calls.c_direction == "Inbound"
            )
        )
        if m_memberRole == "TL":
             peak_inbound_stmt = peak_inbound_stmt.where(Calls.c_memberExtensionNo.in_(tl_memberExtensionNo_subq))
             
        peak_inbound_stmt = (
            peak_inbound_stmt
            .group_by('hour')
            .order_by(desc(func.count()))
            .limit(1)
        )

        # --- Peak Hour Logic (Outbound) ---
        peak_outbound_stmt = (
            select(extract('hour', cast(Calls.c_callDateTime, DateTime)).label('hour'))
            .where(
                Calls.c_accountId == m_accountId,
                today_clause,
                Calls.c_direction == "Outbound"
            )
        )
        if m_memberRole == "TL":
             peak_outbound_stmt = peak_outbound_stmt.where(Calls.c_memberExtensionNo.in_(tl_memberExtensionNo_subq))

        peak_outbound_stmt = (
            peak_outbound_stmt
            .group_by('hour')
            .order_by(desc(func.count()))
            .limit(1)
        )

        result = await session.execute(stmt)
        row = result.first()
        
        # Execute auxiliary queries
        inbound_repeat_calls = (await session.execute(repeat_inbound_stmt)).scalar() or 0
        outbound_repeat_calls = (await session.execute(repeat_outbound_stmt)).scalar() or 0
        callback_requests_outbound = (await session.execute(callback_req_stmt)).scalar() or 0
        
        peak_inbound_hour_val = (await session.execute(peak_inbound_stmt)).scalar()
        peak_outbound_hour_val = (await session.execute(peak_outbound_stmt)).scalar()


        # Extract values safely
        inbound_total = int(row.inbound_total or 0)
        inbound_answered = int(row.inbound_answered or 0)
        inbound_unanswered = int(row.inbound_unanswered or 0)
        inbound_missed = int(row.inbound_missed or 0)
        
        outbound_total = int(row.outbound_total or 0)
        outbound_answered = int(row.outbound_answered or 0)
        outbound_unanswered = int(row.outbound_unanswered or 0)
        outbound_missed = int(row.outbound_missed or 0)

        total_talktime = float(row.total_talktime or 0)
        inbound_duration = float(row.inbound_duration or 0)
        outbound_duration = float(row.outbound_duration or 0)
        
        inbound_max_duration = float(row.inbound_max_duration or 0)
        outbound_max_duration = float(row.outbound_max_duration or 0)

        answered_call_count = int(row.answered_call_count or 0)
        inbound_answered_count = int(row.inbound_answered_count or 0)
        outbound_answered_count = int(row.outbound_answered_count or 0)

        # Calculate AVG talktime
        avg_talktime = round((total_talktime / answered_call_count) / 60, 2) if answered_call_count > 0 else 0
        inbound_avg_talktime = round((inbound_duration / inbound_answered_count) / 60, 2) if inbound_answered_count > 0 else 0
        outbound_avg_talktime = round((outbound_duration / outbound_answered_count) / 60, 2) if outbound_answered_count > 0 else 0

        # Calculate Percentages
        inbound_repeat_pct = round((inbound_repeat_calls / inbound_total) * 100, 1) if inbound_total > 0 else 0.0
        outbound_repeat_pct = round((outbound_repeat_calls / outbound_total) * 100, 1) if outbound_total > 0 else 0.0
        
        # Format Peak Hour (e.g., 14 -> "14:00")
        inbound_peak_hour_str = f"{int(peak_inbound_hour_val)}:00" if peak_inbound_hour_val is not None else "0"
        outbound_peak_hour_str = f"{int(peak_outbound_hour_val)}:00" if peak_outbound_hour_val is not None else "0"

        return [{
            "ml_inboundTotal": inbound_total,
            "ml_inboundAnswered": inbound_answered,
            "ml_inboundUnAnswered": inbound_unanswered,
            "ml_outboundTotal": outbound_total,
            "ml_outboundAnswered": outbound_answered,
            "ml_outboundUnAnswered": outbound_unanswered,

            # New Metrics:
            "ml_totalTalkTime": total_talktime,
            "ml_totalAnsweredCalls": answered_call_count,
            "ml_avgTalkTime": avg_talktime,
            
            "ml_inboundMissed": inbound_missed,
            "ml_outboundMissed": outbound_missed,
            "ml_inboundDuration": inbound_duration,
            "ml_outboundDuration": outbound_duration,
            "ml_inboundMaxDuration": inbound_max_duration,
            "ml_outboundMaxDuration": outbound_max_duration,
            "ml_inboundAvgTalkTime": inbound_avg_talktime,
            "ml_outboundAvgTalkTime": outbound_avg_talktime,
            
            # Additional Advanced Metrics
            "ml_inboundRepeatCalls": inbound_repeat_calls,
            "ml_outboundRepeatCalls": outbound_repeat_calls,
            "ml_callbackRequests": callback_requests_outbound,
            "ml_inboundRepeatCallsPercent": inbound_repeat_pct,
            "ml_outboundRepeatCallsPercent": outbound_repeat_pct,
            "ml_inboundPeakHour": inbound_peak_hour_str,
            "ml_outboundPeakHour": outbound_peak_hour_str
        }]

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
    
async def agentlivemetrics(m_accountId: int,m_accountNo: int,accountEncryption: any,m_memberRole: str):
    
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    try:
        ALL_STATUSES = ["RINGING","INCALL","INIT","AVAILABLE","UNAVAILABLE"]
        stmt = (select(func.count().label("count"),PLiveMonitoring.l_memberStatus).where(PLiveMonitoring.l_memberAccountId == m_accountId).group_by(PLiveMonitoring.l_memberStatus))
        result = await session.execute(stmt)
        rows = result.all()
        status_counts = {row.l_memberStatus: row.count for row in rows}
        response = {f"{status}_liv": status_counts.get(status, 0) for status in ALL_STATUSES}

        response["TOTALBREAKS"] = (
            status_counts.get("BREAK", 0)
            + status_counts.get("QUERY", 0)
            + status_counts.get("LUNCH", 0)
            + status_counts.get("MEETING", 0)
        )

        return response
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

async def livecallmonitoring(m_accountId: int,m_accountNo: int,accountEncryption: any,m_memberRole: str,limit:int,offset:int, m_memberId:int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    try:
        today_start = datetime.combine(datetime.now().date(), time.min)
        tomorrow_start = today_start + timedelta(days=1)
        stmt = (select(LiveCallStatus.l_accountId,LiveCallStatus.l_accountNo,LiveCallStatus.l_CliNumber,LiveCallStatus.l_CustomerNumber,LiveCallStatus.l_memberExtention,LiveCallStatus.l_callDirection,LiveCallStatus.l_callStatus,LiveCallStatus.l_callServerIP,LiveCallStatus.l_callUUID,LiveCallStatus.l_callStartTime,Members.m_memberName).select_from(LiveCallStatus).outerjoin(Members, LiveCallStatus.l_memberExtention == Members.m_memberExtensionNo).where(and_(LiveCallStatus.l_accountId == m_accountId,and_(LiveCallStatus.l_callStartTime >= today_start, LiveCallStatus.l_callStartTime < tomorrow_start))).order_by(desc(LiveCallStatus.l_callStartTime)).limit(limit).offset(offset))
        

        totalRecordsCountQuery = select(func.count()).select_from(LiveCallStatus).where(and_(LiveCallStatus.l_accountId == m_accountId,and_(LiveCallStatus.l_callStartTime >= today_start, LiveCallStatus.l_callStartTime < tomorrow_start)))
        if m_memberRole == "TL":
            tl_memberExtensionNo_subq = (
                select(Members.m_memberExtensionNo)
                .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                .where(
                    Teams.t_teamLeaderId == m_memberId,
                    Teams.t_accountId == m_accountId,
                    Teams.t_accountNo == m_accountNo
                )
            ).subquery()
            stmt = stmt.where(LiveCallStatus.l_memberExtention.in_(tl_memberExtensionNo_subq))
            totalRecordsCountQuery = totalRecordsCountQuery.where(LiveCallStatus.l_memberExtention.in_(tl_memberExtensionNo_subq))
        # Execute data
        result = await session.execute(stmt)
        rows = result.all()
        # Execute total count
        totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
        merged_data = []
        for row in rows:
            merged_data.append({
                "l_accountId": row.l_accountId,
                "l_accountNo": row.l_accountNo,
                "l_CliNumber": row.l_CliNumber,
                "l_CustomerNumber": row.l_CustomerNumber,
                "l_memberExtention": str(row.l_memberExtention),
                "l_callDirection": row.l_callDirection,
                "l_callStatus": row.l_callStatus,
                "l_callServerIP": row.l_callServerIP,
                "l_callUUID": row.l_callUUID,
                "l_callStartTime": row.l_callStartTime,
                "m_memberName": row.m_memberName,
            })
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": merged_data
        }
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
