from db.context import get_sync_engine, get_async_engine, get_async_writer_engine, get_async_reader_engine, get_redis
from sqlalchemy import Delete, Update, select, func, or_, and_, case, Date, text, literal_column, delete
import pymongo
from pymongo import DESCENDING, ASCENDING
import pandas as pd
import io
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException, status as fastapi_status
from fastapi.encoders import jsonable_encoder
from models.db import Accounts, Campaigns, Calls, CallFollowups, AgentStatus, Members, MemberProductionReport, PConferences, Teams, QueueLogs, QueueLogs, MailAutomation, QueueGroups
from models.dto import CdrLogsModel, CampaignsModel, VoicemailLogsModel, MailAutomationResponse
from sqlalchemy.dialects import postgresql, mysql
from fastapi.responses import JSONResponse
from datetime import date, datetime, timedelta
from decimal import Decimal
import traceback
from sqlalchemy.orm import aliased
from utils.export import cdrexport, modexport
import traceback
import json
import pytz
from utils.timezone_conversion import convert_account_tz_to_ist,convert_ist_to_account_tz,validate_timezone

async def fetch(limit: int, offset: int, sortorder: str, sortfield: str, searchstring: any, campaignid: int, calldisposition: str, calldirection: str, callmode: str, calldatestartrange: str, calldateendrange: str, type: str, dialmethod: str, accountid: int, accountno: str, memberId: int, memberrole: str, accountTimeZone: str, database: str):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            filters = [
                Calls.c_accountId == accountid,
                Calls.c_accountNo == accountno
            ]
            if campaignid:
                filters.append(Calls.c_campaignId == campaignid)
            if calldisposition:
                filters.append(Calls.c_disposition == calldisposition)
            if calldirection:
                filters.append(Calls.c_direction == calldirection)
            if callmode:
                filters.append(Calls.c_callMode == callmode)
            if dialmethod:
                filters.append(Calls.c_dial_method == dialmethod)
            if calldatestartrange and calldateendrange:
                print("RAW INPUT ▶","start:", calldatestartrange,"| end:", calldateendrange,"| accountTimeZone:", accountTimeZone)
                if accountTimeZone and accountTimeZone not in ('NULL', ''):
                    print("PATH ▶ Timezone conversion REQUIRED")
                    start_dt_ist = convert_account_tz_to_ist(calldatestartrange, accountTimeZone)
                    end_dt_ist = convert_account_tz_to_ist(calldateendrange, accountTimeZone)
                    print("CONVERTED ▶","start_dt_ist:", str(start_dt_ist),"| end_dt_ist:", str(end_dt_ist))
                    if start_dt_ist and end_dt_ist:
                        print("FILTER ▶ IST BETWEEN applied")
                        filters.append(Calls.c_callDateTime.between(start_dt_ist, end_dt_ist))                        
                else:
                    # No timezone conversion needed, dates are already in IST
                    filters.append(Calls.c_callDateTime.between(calldatestartrange, calldateendrange))
            # For TL Report
            if memberrole == "TL":
                tl_memberIds_subq = (
                    select(Members.m_memberId)
                    .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                    .where(
                        Teams.t_teamLeaderId == memberId,
                        Teams.t_accountId == accountid,
                        Teams.t_accountNo == accountno
                    )
                ).subquery()
                tl_extensionNos_subq = (
                    select(Members.m_memberExtensionNo)
                    .where(
                        Members.m_accountId == accountid,
                        Members.m_accountNo == accountno,
                        Members.m_memberId.in_(tl_memberIds_subq)
                    )
                ).subquery()
                filters.append(Calls.c_memberExtensionNo.in_(tl_extensionNos_subq))
            if searchstring:
                filters.append(
                    or_(
                        Calls.c_memberExtensionNo.like(f"%{searchstring}%"),
                        Calls.c_customerPhoneno.like(f"%{searchstring}%"),
                        func.coalesce(Members.m_memberName, '').like(f"%{searchstring}%")
                    )
                )
            recordQuery = (
                select(Calls, Accounts, Campaigns, Members, CallFollowups)
                .join(Accounts, Accounts.a_accountId == Calls.c_accountId, isouter=True)
                .join(Campaigns, Campaigns.c_campaignId == Calls.c_campaignId, isouter=True)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .join(CallFollowups, CallFollowups.c_callId == Calls.c_callId, isouter=True)
                .where(and_(*filters))
            )
            if sortfield and sortorder:
                try:
                    recordQuery = recordQuery.order_by(
                        getattr(getattr(Calls, sortfield), sortorder.lower())()
                    )
                except AttributeError:
                    pass
            # EXPORT BLOCK
            if type == "export":
                static_headers  = [
                    "AccountCode",
                    "CampaignName",
                    "MemberName",
                    "CustomerPhoneNumber",
                    "CallDateTime",
                    "CallDirection",
                    "CallDisposition",
                    "CallDuration",
                    "CallMode",
                    "WrapUpDuration",
                    "CallLineNumber",
                    "MemberExtensionNumber",
                    "MemberPhoneNumber",
                    "MemberExtensionName",
                    "MemberRegisteredIP",
                    "CallDisconnectionEnd"
                ]

                last_followup_keys = None
                initial_header_written = False

                def format_cdr_row(row, serial_no):
                    nonlocal last_followup_keys, initial_header_written

                    call, account, campaign, member, followup = row

                    # ---- Extract followup JSON data ----
                    followup_json = getattr(followup, "c_callfollowupData", None) or {}
                    followup_data = {k: v.get("value") for k, v in followup_json.items()}

                    # Sorted dynamic follow-up columns
                    current_follow_keys = sorted(followup_data.keys())

                    rows_to_write = []

                    # FIRST MAIN HEADER (STATIC ONLY INITIALLY)
                    if not initial_header_written:
                        # Do not include dynamic headers until we see the first followup record
                        full_header = ["SNo"] + static_headers + (current_follow_keys if current_follow_keys else [])
                        rows_to_write.append(full_header)

                        initial_header_written = True
                        last_followup_keys = current_follow_keys if current_follow_keys else []
                    else:
                        # ---- NEW LOGIC ----
                        # Only trigger dynamic header change if:
                        # 1. followup data exists, AND
                        # 2. followup key list changed
                        if current_follow_keys and current_follow_keys != last_followup_keys:
                            # Insert spacing row only when followup keys actually change
                            empty_row = [""] * (1 + len(static_headers) + len(current_follow_keys))
                            rows_to_write.append(empty_row)

                            fake_header = ["SNo"] + static_headers + current_follow_keys
                            rows_to_write.append(fake_header)

                            last_followup_keys = current_follow_keys

                    # ---- MAIN DATA RECORD ----
                    record = {
                        "AccountCode": getattr(account, "a_accountCode", None) if account else None,
                        "CampaignName": (
                            "Individual"
                            if call.c_campaignId == 0
                            else getattr(campaign, "c_campaignName", None) if campaign else None
                        ),
                        "MemberName": getattr(member, "m_memberName", None) if member else None,
                        "CustomerPhoneNumber": getattr(call, "c_customerPhoneno", None),
                        "CallDateTime": ( convert_ist_to_account_tz(call.c_callDateTime, accountTimeZone) if call.c_callDateTime and accountTimeZone and accountTimeZone not in ('NULL', '') else call.c_callDateTime),
                        "CallDirection": getattr(call, "c_direction", None),
                        "CallDisposition": getattr(call, "c_disposition", None),
                        "CallDuration": getattr(call, "c_talktime", None),
                        "CallMode": getattr(call, "c_callMode", None),
                        "WrapUpDuration": getattr(followup, "c_callfollowupDuration", None),
                        "CallLineNumber": getattr(call, "c_clinumberName", None),
                        "MemberExtensionNumber": getattr(call, "c_memberExtensionNo", None),
                        "MemberPhoneNumber": getattr(call, "c_memberPhoneno", None),
                        "MemberExtensionName": getattr(call, "c_callerName", None),
                        "MemberRegisteredIP": getattr(call, "c_clientIp", None),
                        "CallDisconnectionEnd": getattr(call, "c_terminationEnd", None),
                    }

                    # If followup missing, pad using last_followup_keys
                    active_keys = current_follow_keys if current_follow_keys else last_followup_keys

                    row_values = [serial_no] + [record[h] for h in static_headers]
                    row_values += [followup_data.get(k, "") for k in active_keys]

                    rows_to_write.append(row_values)

                    return rows_to_write

                safe_start = calldatestartrange.replace(" ", "_").replace(":", "-")
                safe_end = calldateendrange.replace(" ", "_").replace(":", "-")
                filename = f"cdr_export_{accountno}_{safe_start}_{safe_end}"

                return await modexport(
                    sessionmaker=async_session_maker,
                    query_or_list=recordQuery,
                    filename=filename,
                    row_formatter=format_cdr_row
                )
            # NORMAL FETCH BLOCK
            totalRecordsCountQuery = (
                select(func.count(func.distinct(Calls.c_callId)))
                .select_from(Calls)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .where(and_(*filters))
            )
            totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
            rows = (await session.execute(recordQuery.offset(offset).limit(limit))).all()
            totalRecords = []
            for row in rows:
                call, account, campaign, member, followup = row
                record_dict = {}
                record_dict.update({
                    "AccountCode": getattr(account, "a_accountCode", None) if account else None,
                    "CampaignName": ( "Individual" if call.c_campaignId == 0 else getattr(campaign, "c_campaignName", None) if campaign else None),
                    "MemberName": getattr(member, "m_memberName", None) if member else None,
                    "CustomerPhoneNumber": getattr(call, "c_customerPhoneno", None) if call else None,
                    "CallDateTime": ( convert_ist_to_account_tz(call.c_callDateTime, accountTimeZone) if call.c_callDateTime and accountTimeZone and accountTimeZone not in ('NULL', '') else call.c_callDateTime),
                    "CallDirection": getattr(call, "c_direction", None) if call else None,
                    "CallDisposition": getattr(call, "c_disposition", None) if call else None,
                    "CallDuration": getattr(call, "c_talktime", None) if call else None,
                    "CallMode": getattr(call, "c_callMode", None) if call else None,
                    "WrapUpDuration": getattr(followup, "c_callfollowupDuration", None)
                })
                followupjson = getattr(followup, "c_callfollowupData", None)
                if followupjson:
                    try:
                        followupdata = {
                            key: field.get("value") for key, field in followupjson.items()
                        }
                        record_dict["FollowUpData"] = followupdata
                    except Exception:
                        record_dict["FollowUpData"] = {}
                else:
                    record_dict["FollowUpData"] = {}


                if accountno in ('2191750116259', '3731869027851'):
                    mediaType = 'wav'
                else:
                    mediaType = 'mp3'

            
                record_dict.update({
                    "CallLineNumber": getattr(call, "c_clinumberName", None) if call else None,
                    "MemberExtensionNumber": getattr(call, "c_memberExtensionNo", None) if call else None,
                    "MemberPhoneNumber": getattr(call, "c_memberPhoneno", None) if call else None,
                    "MemberExtensionName": getattr(call, "c_callerName", None) if call else None,
                    "MemberRegisteredIP": getattr(call, "c_clientIp", None) if call else None,
                    "CallDisconnectionEnd": getattr(call, "c_terminationEnd", None) if call else None,
                    "CallRecording": getattr(call, "c_callRecordingUrl", None) if call else None,
                    "DialMethod": getattr(call, "c_dial_method", None) if call else None
                    # "CallRecording": (getattr(call, "c_callRecordingUrl", None) if getattr(call, "c_callRecordingUrl", None) else (f"https://connecthub3m.s3.ap-south-1.amazonaws.com/"f"{getattr(call, 'c_accountNo', '')}/"f"{getattr(call, 'c_callId', '')}.mp3" if getattr(call, "c_accountNo", None) and getattr(call, "c_callId", None)else None))
                    # "CallRecording": getattr(call, "c_callRecordingUrl", None) if call.c_callRecordingUrl else None

                })
                totalRecords.append(record_dict)
            data = {
                "totalRecordsCount": totalRecordsCount,
                "totalRecords": totalRecords
            }
            return JSONResponse(
                status_code=fastapi_status.HTTP_200_OK,
                content={
                    "message": "Cdr Records Fetched Successfully",
                    "data": data
                }
            )
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

async def globalfetch(limit: int, offset: int, sortorder: str, sortfield: str, searchstring: any, campaignid: int, calldisposition: str, calldirection: str, callmode: str, calldatestartrange: str, calldateendrange: str, type: str, dialmethod: str, accountid: int, accountno: str, memberId: int, memberrole: str, accountTimeZone: str, database: str):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            filters = []
            if calldisposition:
                filters.append(Calls.c_disposition == calldisposition)
            if calldirection:
                filters.append(Calls.c_direction == calldirection)
            if callmode:
                filters.append(Calls.c_callMode == callmode)
            if dialmethod:
                filters.append(Calls.c_dial_method == dialmethod)
            if calldatestartrange and calldateendrange:
                # No timezone conversion needed, dates are already in IST
                filters.append(Calls.c_callDateTime.between(calldatestartrange, calldateendrange))
            if searchstring:
                filters.append(
                    or_(
                        Calls.c_memberExtensionNo.like(f"%{searchstring}%"),
                        Calls.c_customerPhoneno.like(f"%{searchstring}%"),
                        func.coalesce(Members.m_memberName, '').like(f"%{searchstring}%")
                    )
                )
            recordQuery = (
                select(Calls, Accounts, Campaigns, Members, CallFollowups)
                .join(Accounts, Accounts.a_accountId == Calls.c_accountId, isouter=True)
                .join(Campaigns, Campaigns.c_campaignId == Calls.c_campaignId, isouter=True)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .join(CallFollowups, CallFollowups.c_callId == Calls.c_callId, isouter=True)
                .where(and_(*filters))
            )
            if sortfield and sortorder:
                try:
                    recordQuery = recordQuery.order_by(
                        getattr(getattr(Calls, sortfield), sortorder.lower())()
                    )
                except AttributeError:
                    pass
            # EXPORT BLOCK
            if type == "export":
                static_headers  = [
                    "AccountCode",
                    "CampaignName",
                    "MemberName",
                    "CustomerPhoneNumber",
                    "CallDateTime",
                    "CallDirection",
                    "CallDisposition",
                    "CallDuration",
                    "CallMode",
                    "WrapUpDuration",
                    "CallLineNumber",
                    "MemberExtensionNumber",
                    "MemberPhoneNumber",
                    "MemberExtensionName",
                    "MemberRegisteredIP",
                    "CallDisconnectionEnd"
                ]

                last_followup_keys = None
                initial_header_written = False

                def format_cdr_row(row, serial_no):
                    nonlocal last_followup_keys, initial_header_written

                    call, account, campaign, member, followup = row

                    # ---- Extract followup JSON data ----
                    followup_json = getattr(followup, "c_callfollowupData", None) or {}
                    followup_data = {k: v.get("value") for k, v in followup_json.items()}

                    # Sorted dynamic follow-up columns
                    current_follow_keys = sorted(followup_data.keys())

                    rows_to_write = []

                    # FIRST MAIN HEADER (STATIC ONLY INITIALLY)
                    if not initial_header_written:
                        # Do not include dynamic headers until we see the first followup record
                        full_header = ["SNo"] + static_headers + (current_follow_keys if current_follow_keys else [])
                        rows_to_write.append(full_header)

                        initial_header_written = True
                        last_followup_keys = current_follow_keys if current_follow_keys else []
                    else:
                        # ---- NEW LOGIC ----
                        # Only trigger dynamic header change if:
                        # 1. followup data exists, AND
                        # 2. followup key list changed
                        if current_follow_keys and current_follow_keys != last_followup_keys:
                            # Insert spacing row only when followup keys actually change
                            empty_row = [""] * (1 + len(static_headers) + len(current_follow_keys))
                            rows_to_write.append(empty_row)

                            fake_header = ["SNo"] + static_headers + current_follow_keys
                            rows_to_write.append(fake_header)

                            last_followup_keys = current_follow_keys

                    # ---- MAIN DATA RECORD ----
                    record = {
                        "AccountCode": getattr(account, "a_accountCode", None) if account else None,
                        "CampaignName": (
                            "Individual"
                            if call.c_campaignId == 0
                            else getattr(campaign, "c_campaignName", None) if campaign else None
                        ),
                        "MemberName": getattr(member, "m_memberName", None) if member else None,
                        "CustomerPhoneNumber": getattr(call, "c_customerPhoneno", None),
                        "CallDateTime": getattr(call, "c_callDateTime", None),
                        "CallDirection": getattr(call, "c_direction", None),
                        "CallDisposition": getattr(call, "c_disposition", None),
                        "CallDuration": getattr(call, "c_talktime", None),
                        "CallMode": getattr(call, "c_callMode", None),
                        "WrapUpDuration": getattr(followup, "c_callfollowupDuration", None),
                        "CallLineNumber": getattr(call, "c_clinumberName", None),
                        "MemberExtensionNumber": getattr(call, "c_memberExtensionNo", None),
                        "MemberPhoneNumber": getattr(call, "c_memberPhoneno", None),
                        "MemberExtensionName": getattr(call, "c_callerName", None),
                        "MemberRegisteredIP": getattr(call, "c_clientIp", None),
                        "CallDisconnectionEnd": getattr(call, "c_terminationEnd", None),
                    }

                    # If followup missing, pad using last_followup_keys
                    active_keys = current_follow_keys if current_follow_keys else last_followup_keys

                    row_values = [serial_no] + [record[h] for h in static_headers]
                    row_values += [followup_data.get(k, "") for k in active_keys]

                    rows_to_write.append(row_values)

                    return rows_to_write

                safe_start = calldatestartrange.replace(" ", "_").replace(":", "-")
                safe_end = calldateendrange.replace(" ", "_").replace(":", "-")
                filename = f"global_cdr_export_{safe_start}_{safe_end}"

                return await modexport(
                    sessionmaker=async_session_maker,
                    query_or_list=recordQuery,
                    filename=filename,
                    row_formatter=format_cdr_row
                )
            # NORMAL FETCH BLOCK
            totalRecordsCountQuery = (
                select(func.count(func.distinct(Calls.c_callId)))
                .select_from(Calls)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .where(and_(*filters))
            )
            totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
            rows = (await session.execute(recordQuery.offset(offset).limit(limit))).all()
            totalRecords = []
            for row in rows:
                call, account, campaign, member, followup = row
                record_dict = {}
                record_dict.update({
                    "AccountCode": getattr(account, "a_accountCode", None) if account else None,
                    "CampaignName": ( "Individual" if call.c_campaignId == 0 else getattr(campaign, "c_campaignName", None) if campaign else None),
                    "MemberName": getattr(member, "m_memberName", None) if member else None,
                    "CustomerPhoneNumber": getattr(call, "c_customerPhoneno", None) if call else None,
                    "CallDateTime": getattr(call, "c_callDateTime", None),
                    "CallDirection": getattr(call, "c_direction", None) if call else None,
                    "CallDisposition": getattr(call, "c_disposition", None) if call else None,
                    "CallDuration": getattr(call, "c_talktime", None) if call else None,
                    "CallMode": getattr(call, "c_callMode", None) if call else None,
                    "WrapUpDuration": getattr(followup, "c_callfollowupDuration", None)
                })
                followupjson = getattr(followup, "c_callfollowupData", None)
                if followupjson:
                    try:
                        followupdata = {
                            key: field.get("value") for key, field in followupjson.items()
                        }
                        record_dict["FollowUpData"] = followupdata
                    except Exception:
                        record_dict["FollowUpData"] = {}
                else:
                    record_dict["FollowUpData"] = {}


                if accountno in ('2191750116259', '3731869027851'):
                    mediaType = 'wav'
                else:
                    mediaType = 'mp3'

            
                record_dict.update({
                    "CallLineNumber": getattr(call, "c_clinumberName", None) if call else None,
                    "MemberExtensionNumber": getattr(call, "c_memberExtensionNo", None) if call else None,
                    "MemberPhoneNumber": getattr(call, "c_memberPhoneno", None) if call else None,
                    "MemberExtensionName": getattr(call, "c_callerName", None) if call else None,
                    "MemberRegisteredIP": getattr(call, "c_clientIp", None) if call else None,
                    "CallDisconnectionEnd": getattr(call, "c_terminationEnd", None) if call else None,
                    "CallRecording": getattr(call, "c_callRecordingUrl", None) if call else None,
                    "DialMethod": getattr(call, "c_dial_method", None) if call else None
                    # "CallRecording": (getattr(call, "c_callRecordingUrl", None) if getattr(call, "c_callRecordingUrl", None) else (f"https://connecthub3m.s3.ap-south-1.amazonaws.com/"f"{getattr(call, 'c_accountNo', '')}/"f"{getattr(call, 'c_callId', '')}.mp3" if getattr(call, "c_accountNo", None) and getattr(call, "c_callId", None)else None))
                    # "CallRecording": getattr(call, "c_callRecordingUrl", None) if call.c_callRecordingUrl else None

                })
                totalRecords.append(record_dict)
            data = {
                "totalRecordsCount": totalRecordsCount,
                "totalRecords": totalRecords
            }
            return JSONResponse(
                status_code=fastapi_status.HTTP_200_OK,
                content={
                    "message": "Cdr Records Fetched Successfully",
                    "data": data
                }
            )
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

async def fetchAgent(limit: int, offset: int, sortorder: str, sortfield: str, searchstring: any, campaignid: int, calldisposition: str, calldirection: str, callmode: str, calldatestartrange: str, calldateendrange: str, accountid: int, accountno: str, memberextensionno:str,accountTimeZone: str, database: str):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            filters = [
                Calls.c_accountId == accountid,
                Calls.c_accountNo == accountno,
                Calls.c_memberExtensionNo == memberextensionno
            ]
            if campaignid:
                filters.append(Calls.c_campaignId == campaignid)
            if calldisposition:
                filters.append(Calls.c_disposition == calldisposition)
            if calldirection:
                filters.append(Calls.c_direction == calldirection)
            if callmode:
                filters.append(Calls.c_callMode == callmode)
            if calldatestartrange and calldateendrange:
                print("RAW INPUT ▶","start:", calldatestartrange,"| end:", calldateendrange,"| accountTimeZone:", accountTimeZone)
                if accountTimeZone and accountTimeZone not in ('NULL', ''):
                    print("PATH ▶ Timezone conversion REQUIRED")
                    start_dt_ist = convert_account_tz_to_ist(calldatestartrange, accountTimeZone)
                    end_dt_ist = convert_account_tz_to_ist(calldateendrange, accountTimeZone)
                    print("CONVERTED ▶","start_dt_ist:", str(start_dt_ist),"| end_dt_ist:", str(end_dt_ist))
                    if start_dt_ist and end_dt_ist:
                        print("FILTER ▶ IST BETWEEN applied")
                        filters.append(Calls.c_callDateTime.between(start_dt_ist, end_dt_ist))                        
                else:
                    # No timezone conversion needed, dates are already in IST
                    filters.append(Calls.c_callDateTime.between(calldatestartrange, calldateendrange))
            if searchstring:
                filters.append(
                    or_(
                        Calls.c_memberExtensionNo.like(f"%{searchstring}%"),
                        Calls.c_customerPhoneno.like(f"%{searchstring}%"),
                        func.coalesce(Members.m_memberName, '').like(f"%{searchstring}%")
                    )
                )
            recordQuery = (
                select(Calls, Accounts, Campaigns, Members, CallFollowups)
                .join(Accounts, Accounts.a_accountId == Calls.c_accountId, isouter=True)
                .join(Campaigns, Campaigns.c_campaignId == Calls.c_campaignId, isouter=True)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .join(CallFollowups, CallFollowups.c_callId == Calls.c_callId, isouter=True)
                .where(and_(*filters))
            )
            if sortfield and sortorder:
                try:
                    recordQuery = recordQuery.order_by(
                        getattr(getattr(Calls, sortfield), sortorder.lower())()
                    )
                except AttributeError:
                    pass
            totalRecordsCountQuery = (
                select(func.count(func.distinct(Calls.c_callId)))
                .select_from(Calls)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .where(and_(*filters))
            )
            totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
            rows = (await session.execute(recordQuery.offset(offset).limit(limit))).all()
            totalRecords = []
            for row in rows:
                call, account, campaign, member, followup = row
                record_dict = {}
                record_dict.update({
                    "AccountCode": getattr(account, "a_accountCode", None) if account else None,
                    "CampaignName": ( "Individual" if call.c_campaignId == 0 else getattr(campaign, "c_campaignName", None) if campaign else None),
                    "MemberName": getattr(member, "m_memberName", None) if member else None,
                    "CustomerPhoneNumber": getattr(call, "c_customerPhoneno", None) if call else None,
                    "CallDateTime": ( convert_ist_to_account_tz(call.c_callDateTime, accountTimeZone) if call.c_callDateTime and accountTimeZone and accountTimeZone not in ('NULL', '') else call.c_callDateTime),
                    "CallDirection": getattr(call, "c_direction", None) if call else None,
                    "CallDisposition": getattr(call, "c_disposition", None) if call else None,
                    "CallDuration": getattr(call, "c_talktime", None) if call else None,
                    "CallMode": getattr(call, "c_callMode", None) if call else None,
                    "WrapUpDuration": getattr(followup, "c_callfollowupDuration", None)
                })
                followupjson = getattr(followup, "c_callfollowupData", None)
                if followupjson:
                    try:
                        followupdata = {
                            key: field.get("value") for key, field in followupjson.items()
                        }
                        record_dict["FollowUpData"] = followupdata
                    except Exception:
                        record_dict["FollowUpData"] = {}
                else:
                    record_dict["FollowUpData"] = {}
                record_dict.update({
                    "CallLineNumber": getattr(call, "c_clinumberName", None) if call else None,
                    "MemberExtensionNumber": getattr(call, "c_memberExtensionNo", None) if call else None,
                    "MemberPhoneNumber": getattr(call, "c_memberPhoneno", None) if call else None,
                    "MemberExtensionName": getattr(call, "c_callerName", None) if call else None,
                    "MemberRegisteredIP": getattr(call, "c_clientIp", None) if call else None,
                    "CallDisconnectionEnd": getattr(call, "c_terminationEnd", None) if call else None,
                    "CallRecording": getattr(call, "c_callRecordingUrl", None) if call else None
                    # "CallRecording": (getattr(call, "c_callRecordingUrl", None) if getattr(call, "c_callRecordingUrl", None) else (f"https://connecthub3m.s3.ap-south-1.amazonaws.com/"f"{getattr(call, 'c_accountNo', '')}/"f"{getattr(call, 'c_callId', '')}.mp3" if getattr(call, "c_accountNo", None) and getattr(call, "c_callId", None)else None))
                    # "CallRecording": getattr(call, "c_callRecordingUrl", None) if call.c_callRecordingUrl else None
                })
                totalRecords.append(record_dict)
            return {
                "totalRecordsCount": totalRecordsCount,
                "totalRecords": totalRecords
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

async def listCampaign(accountid: int, accountno: str, database: str) -> dict:
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            accountFilter = and_(
                Campaigns.c_accountId == accountid,
                Campaigns.c_accountNo == accountno
            )
            recordQuery = select(Campaigns).where(accountFilter)
            totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
            totalRecords = [CampaignsModel.from_orm(record).dict() for record in totalRecordsUnserialized]
            default_record = {
                "c_campaignId": 0,
                "c_accountId": 725,
                "c_accountNo": "608823120500",
                "c_campaignName": "Individual",
                "c_campaignStatus": "Active"
            }
            totalRecords.insert(0, default_record)
            return totalRecords
        except IntegrityError as e:
            await session.rollback()
            await session.close()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            await session.close()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            await session.close()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
        finally:
            await async_engine.dispose()

async def sms_dlr_report(limit, offset, search, fromDate, toDate, sortField, sortOrder, status_filter, direction, accountId, accountNo, export):
    client = pymongo.MongoClient("mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net")
    db = client["onedb"]
    collection = db["activities"]

    # Base query
    query = {
        "accountId": int(accountId) if str(accountId).isdigit() else accountId,
        "accountNo": accountNo,
        "channel": "SMS",
        "type": "Message"
    }

    # Direction Filter
    if direction and direction.lower() != "all":
        query["direction"] = direction
    
    # Date Range Filter
    if fromDate and toDate:
        s_date = fromDate.replace(" ", "T")
        e_date = toDate.replace(" ", "T")
        query["activityTimestamp"] = {
            "$gte": s_date,
            "$lte": e_date
        }

    # Search Filter
    if search:
        regex_pattern = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"details.m_src": regex_pattern},
            {"details.src": regex_pattern},
            {"details.m_dst": regex_pattern},
            {"details.dst": regex_pattern},
            {"details.m_receiveMsg": regex_pattern},
            {"details.receiveMsg": regex_pattern}
        ]

    # Sorting
    sort_criteria = [("activityTimestamp", DESCENDING)]  # Default sort
    if sortField:
        db_sort_field = "activityTimestamp" # Default
        if sortField == "mobileNumber":
            db_sort_field = "details.m_dst"
        elif sortField == "message":
            db_sort_field = "details.m_receiveMsg"
        elif sortField == "activityTimestamp":
            db_sort_field = "activityTimestamp"
        
        mongo_direction = ASCENDING if sortOrder and sortOrder.lower() == "asc" else DESCENDING
        sort_criteria = [(db_sort_field, mongo_direction)]

    # Execute Query
    total_count = collection.count_documents(query)
    
    # If export, fetch all records
    if export:
        cursor = collection.find(query).sort(sort_criteria)
    else:
        cursor = collection.find(query).sort(sort_criteria).skip(offset).limit(limit)
        
    fetchData = list(cursor)
    client.close()

    # Process Data
    payload = []
    for item in fetchData:
        details = item.get("details", {})
        
        payload.append({
            "conversationId": item.get("conversationId", ""),
            "m_src": details.get("m_src") or details.get("src") or "",
            "m_dst": details.get("m_dst") or details.get("dst") or "",
            "memberName": item.get("memberName", ""),
            "m_type": details.get("m_type") or details.get("type") or "",
            "m_receiveMsg": details.get("m_receiveMsg") or details.get("receiveMsg") or "",
            "direction": item.get("direction", ""),
            "activityTimestamp": item.get("activityTimestamp", ""),
            "m_assignedAt": details.get("m_assignedAt", "")
        })

    if export:
        df = pd.DataFrame(payload)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='SMS DLR Report')
        output.seek(0)
        
        headers = {
            'Content-Disposition': f'attachment; filename="SMS_DLR_Report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
        }
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    return JSONResponse(
        status_code=fastapi_status.HTTP_200_OK,
        content={
            "message": "Fetched Successfully",
            "data": {
                "total": total_count,
                "records": payload
            }
        }
    )

async def productionreport(limit: int, offset: int, callDateStartRange: str, callDateEndRange: str, search: str, type: str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            start_date = date.fromisoformat(callDateStartRange)
            end_date = date.fromisoformat(callDateEndRange)
            ist = pytz.timezone('Asia/Kolkata')
            now_ist = datetime.now(ist)
            today = now_ist.date()
            print(today)
            merged_data = {}
            all_fields = [
                "m_readySeconds", "m_notreadySeconds", "m_breakSeconds", "m_lunchSeconds",
                "m_meetingSeconds", "m_querySeconds", "m_loginSeconds", "m_logoutSeconds",
                "m_inboundTotal", "m_inboundAnswered", "m_inboundUnanswered",
                "m_outboundTotal", "m_outboundAnswered", "m_outboundUnanswered", "m_outboundTalkTime", "m_inboundTalkTime"
            ]

            # Step 1: Get Past Data
            if start_date < today:
                past_end = min(end_date, today - timedelta(days=1))
                past_filters = [
                    MemberProductionReport.m_productionDate.between(start_date, past_end),
                    MemberProductionReport.m_accountId == accountid,
                    MemberProductionReport.m_accountNo == accountno
                ]
                if search:
                    past_filters.append(MemberProductionReport.m_memberName == search)

                # Apply LIMIT and OFFSET to the entire dataset, not just past data
                past_query = select(MemberProductionReport).where(and_(*past_filters))
                
                # Group by member to aggregate past data
                past_query = select(
                    MemberProductionReport.m_accountId,
                    MemberProductionReport.m_accountNo, 
                    MemberProductionReport.m_memberId,
                    MemberProductionReport.m_memberName,
                    MemberProductionReport.m_memberExtensionNo,
                    *[func.sum(getattr(MemberProductionReport, field)).label(field) for field in all_fields]
                ).where(and_(*past_filters)).group_by(
                    MemberProductionReport.m_memberId,
                    MemberProductionReport.m_memberExtensionNo
                )
                
                # Apply TL filter
                if memberRole == "TL":
                    tl_memberIds_subq = (
                        select(Members.m_memberId)
                        .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                        .where(
                            Teams.t_teamLeaderId == memberId,
                            Teams.t_accountId == accountid,
                            Teams.t_accountNo == accountno
                        )
                    ).subquery()

                    past_query = past_query.where(MemberProductionReport.m_memberId.in_(tl_memberIds_subq))
                
                past_rows = (await session.execute(past_query)).mappings().all()

                # Store past data in merged_data
                for row in past_rows:
                    key = (row["m_memberId"], str(row["m_memberExtensionNo"]))
                    merged_data[key] = {
                        **{field: row.get(field) or 0 for field in all_fields},
                        "m_accountId": row["m_accountId"],
                        "m_accountNo": row["m_accountNo"],
                        "m_memberId": row["m_memberId"],
                        "m_memberName": row["m_memberName"],
                        "m_memberExtensionNo": row["m_memberExtensionNo"],
                        "source": ["past"]
                    }

            # Step 2: Get Current Data and merge with past data
            if end_date >= today:
                callStart = f"{today} 00:00:00"
                callEnd = f"{today} 23:59:59"

                # Updated agent subquery with proper seconds conversion
                agent_subq = (
                    select(
                        AgentStatus.a_memberId.label("a_memberId"),
                        # Convert time difference to seconds for each status
                        func.sum(case((AgentStatus.a_status == "READY", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("ready_seconds"),
                        func.sum(case((AgentStatus.a_status == "NOTREADY", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("notready_seconds"),
                        func.sum(case((AgentStatus.a_status == "BREAK", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("break_seconds"),
                        func.sum(case((AgentStatus.a_status == "LUNCH", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("lunch_seconds"),
                        func.sum(case((AgentStatus.a_status == "MEETING", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("meeting_seconds"),
                        func.sum(case((AgentStatus.a_status == "QUERY", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("query_seconds"),
                        func.sum(case((AgentStatus.a_status == "LOGIN", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("login_seconds"),
                        func.sum(case((AgentStatus.a_status == "LOGOUT", 
                                     func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)), 
                                     else_=0)).label("logout_seconds")
                    )
                    .where(and_(
                        AgentStatus.a_startTime.between(callStart, callEnd), 
                        AgentStatus.a_accountId == accountid, 
                        AgentStatus.a_accountNo == accountno
                    ))
                    .group_by(AgentStatus.a_memberId)
                    .subquery()
                )

                calls_subq = (
                    select(
                        Calls.c_memberExtensionNo.label("c_memberExtensionNo"),
                        func.count(case((Calls.c_direction == "Inbound", 1))).label("inbound_total"),
                        func.count(case(((Calls.c_direction == "Inbound") & (Calls.c_disposition == "ANSWERED"), 1))).label("inbound_answered"),
                        func.count(case(((Calls.c_direction == "Inbound") & (Calls.c_disposition == "No Answer"), 1))).label("inbound_unanswered"),
                        func.count(case((Calls.c_direction == "Outbound", 1))).label("outbound_total"),
                        func.count(case(((Calls.c_direction == "Outbound") & (Calls.c_disposition == "ANSWERED"), 1))).label("outbound_answered"),
                        func.count(case(((Calls.c_direction == "Outbound") & (Calls.c_disposition == "No Answer"), 1))).label("outbound_unanswered"),
                        func.sum(case(((Calls.c_direction == "Inbound") & (Calls.c_disposition == "ANSWERED"), Calls.c_talktime),else_=0)).label("inbound_talktime"),
                        func.sum(case(((Calls.c_direction == "Outbound") & (Calls.c_disposition == "ANSWERED"), Calls.c_talktime),else_=0)).label("outbound_talktime"),
                    )
                    .where(and_(
                        Calls.c_createdOn.between(callStart, callEnd), 
                        Calls.c_accountId == accountid, 
                        Calls.c_accountNo == accountno
                    ))
                    .group_by(Calls.c_memberExtensionNo)
                    .subquery()
                )

                query = select(
                    Members.m_accountId,
                    Members.m_accountNo,
                    Members.m_memberId,
                    Members.m_memberName,
                    Members.m_memberExtensionNo,
                    # Ensure all time values are in seconds with proper coalescing
                    func.coalesce(agent_subq.c.ready_seconds, 0).label("m_readySeconds"),
                    func.coalesce(agent_subq.c.notready_seconds, 0).label("m_notreadySeconds"),
                    func.coalesce(agent_subq.c.break_seconds, 0).label("m_breakSeconds"),
                    func.coalesce(agent_subq.c.lunch_seconds, 0).label("m_lunchSeconds"),
                    func.coalesce(agent_subq.c.meeting_seconds, 0).label("m_meetingSeconds"),
                    func.coalesce(agent_subq.c.query_seconds, 0).label("m_querySeconds"),
                    func.coalesce(agent_subq.c.login_seconds, 0).label("m_loginSeconds"),
                    func.coalesce(agent_subq.c.logout_seconds, 0).label("m_logoutSeconds"),
                    # Call counts remain the same
                    func.coalesce(calls_subq.c.inbound_total, 0).label("m_inboundTotal"),
                    func.coalesce(calls_subq.c.inbound_talktime, 0).label("m_inboundTalkTime"),
                    func.coalesce(calls_subq.c.inbound_answered, 0).label("m_inboundAnswered"),
                    func.coalesce(calls_subq.c.inbound_unanswered, 0).label("m_inboundUnanswered"),
                    func.coalesce(calls_subq.c.outbound_total, 0).label("m_outboundTotal"),
                    func.coalesce(calls_subq.c.outbound_talktime, 0).label("m_outboundTalkTime"),
                    func.coalesce(calls_subq.c.outbound_answered, 0).label("m_outboundAnswered"),
                    func.coalesce(calls_subq.c.outbound_unanswered, 0).label("m_outboundUnanswered")
                ).outerjoin(
                    agent_subq, agent_subq.c.a_memberId == Members.m_memberId
                ).outerjoin(
                    calls_subq, calls_subq.c.c_memberExtensionNo == Members.m_memberExtensionNo
                ).where(and_(
                    Members.m_accountId == accountid, 
                    Members.m_accountNo == accountno,
                    Members.m_memberRole == 'USER'
                ))
                
                # Apply TL filter
                if memberRole == "TL":
                    tl_memberIds_subq = (
                        select(Members.m_memberId)
                        .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                        .where(
                            Teams.t_teamLeaderId == memberId,
                            Teams.t_accountId == accountid,
                            Teams.t_accountNo == accountno
                        )
                    ).subquery()

                    query = query.where(Members.m_memberId.in_(tl_memberIds_subq))
                    
                if search:
                     query = query.where(Members.m_memberName == search)
                
                current_rows = (await session.execute(query)).mappings().all()
                print(query)
                for row in current_rows:
                    print(dict(row))
                # Step 3: Merge current data with existing merged_data
                for row in current_rows:
                    key = (row["m_memberId"], str(row["m_memberExtensionNo"]))
                    
                    if key in merged_data:
                        # Member exists in past data - ADD current values to existing past values
                        for field in all_fields:
                            current_value = row.get(field, 0) or 0
                            merged_data[key][field] += current_value
                        # Update source to include both past and current
                        if "current" not in merged_data[key]["source"]:
                            merged_data[key]["source"].append("current")
                    else:
                        # Member doesn't exist in past data - create new entry with current data only
                        merged_data[key] = {
                            **{field: row.get(field, 0) or 0 for field in all_fields},
                            "m_accountId": row["m_accountId"],
                            "m_accountNo": row["m_accountNo"],
                            "m_memberId": row["m_memberId"],
                            "m_memberName": row["m_memberName"],
                            "m_memberExtensionNo": row["m_memberExtensionNo"],
                            "source": ["current"]
                        }

            # Step 4: Apply pagination to final merged data
            final_data = list(merged_data.values())
            
            # Get total count before pagination
            total_records_count = len(final_data)
            
            # Apply offset and limit to the final merged data
            paginated_data = final_data[offset:offset + limit]
            
            if type == "export":

                csv_headers = [
                    "Account ID", "Account No", "Member ID", "Member Name", "Member Extension",
                    "Ready Time", "Not Ready Time", "Break Time", "Lunch Time",
                    "Meeting Time", "Query Time", "Login Time", "Logout Time",
                    "Inbound Total", "Inbound Answered", "Inbound Unanswered",
                    "Outbound Total", "Outbound Answered", "Outbound Unanswered",
                    "Inbound Talk Time", "Outbound Talk Time"
                ]
                def seconds_to_hms(seconds):
                    if seconds is None:
                        return "00:00:00"
                    
                    # Handle different types of input
                    if isinstance(seconds, str):
                        try:
                            seconds = float(seconds)
                        except (ValueError, TypeError):
                            return "00:00:00"
                    
                    seconds = int(float(seconds))
                    if seconds == 0:
                        return "00:00:00"
                    
                    hours = seconds // 3600
                    minutes = (seconds % 3600) // 60
                    secs = seconds % 60
                    return f"{hours:02d}:{minutes:02d}:{secs:02d}"
                def format_production_row(row, serial_no):
                    return [
                        row.get("m_accountId"),
                        row.get("m_accountNo"),
                        row.get("m_memberId"),
                        row.get("m_memberName"),
                        row.get("m_memberExtensionNo"),
                        seconds_to_hms(row.get("m_readySeconds")),
                        seconds_to_hms(row.get("m_notreadySeconds")),
                        seconds_to_hms(row.get("m_breakSeconds")),
                        seconds_to_hms(row.get("m_lunchSeconds")),
                        seconds_to_hms(row.get("m_meetingSeconds")),
                        seconds_to_hms(row.get("m_querySeconds")),
                        seconds_to_hms(row.get("m_loginSeconds")),
                        seconds_to_hms(row.get("m_logoutSeconds")),
                        int(row.get("m_inboundTotal", 0)),
                        int(row.get("m_inboundAnswered", 0)),
                        int(row.get("m_inboundUnanswered", 0)),
                        int(row.get("m_outboundTotal", 0)),
                        int(row.get("m_outboundAnswered", 0)),
                        int(row.get("m_outboundUnanswered", 0)),
                        seconds_to_hms(row.get("m_inboundTalkTime")),
                        seconds_to_hms(row.get("m_outboundTalkTime")),
                    ]

                # Generate filename
                safe_start = callDateStartRange.replace(" ", "_").replace(":", "-")
                safe_end = callDateEndRange.replace(" ", "_").replace(":", "-")
                filename = f"production_export_{accountno}_{safe_start}_{safe_end}.csv"

                # Call generic export function
                return await cdrexport(
                    session=session,
                    query_or_list=final_data,  # pass the final merged data
                    filename=filename,
                    csv_headers=csv_headers,
                    row_formatter=format_production_row
                )
            else:
            # Helper function to convert seconds to HH:MM:SS format
                def seconds_to_hms(seconds):
                    if seconds is None:
                        return "00:00:00"
                    
                    # Handle different types of input
                    if isinstance(seconds, str):
                        try:
                            seconds = float(seconds)
                        except (ValueError, TypeError):
                            return "00:00:00"
                    
                    seconds = int(float(seconds))
                    if seconds == 0:
                        return "00:00:00"
                    
                    hours = seconds // 3600
                    minutes = (seconds % 3600) // 60
                    secs = seconds % 60
                    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

                # Step 5: Convert to final format with type conversions
                result_data = []
                for data in paginated_data:
                    record = {}
                    for field_name, value in data.items():
                        # Convert time fields to HH:MM:SS format first
                        if field_name.endswith(("Seconds", "TalkTime")):
                            record[field_name] = seconds_to_hms(value)
                        # Convert call count fields to integers
                        elif field_name in ['m_inboundTotal', 'm_inboundAnswered', 'm_inboundUnanswered', 
                                        'm_outboundTotal', 'm_outboundAnswered', 'm_outboundUnanswered']:
                            record[field_name] = int(float(value)) if value is not None else 0
                        elif isinstance(value, (Decimal,)):
                            record[field_name] = float(value)
                        elif isinstance(value, (datetime, date)):
                            record[field_name] = value.isoformat()
                        else:
                            record[field_name] = value
                    result_data.append(record)

                return {
                    "totalRecordsCount": total_records_count,
                    "totalRecords": result_data
                }

        except IntegrityError as e:
            await session.rollback()
            tb = traceback.format_exc()
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}\nTraceback:\n{tb}")
        except SQLAlchemyError as e:
            await session.rollback()
            tb = traceback.format_exc()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}\nTraceback:\n{tb}")
        except Exception as e:
            await session.rollback()
            tb = traceback.format_exc()
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}\nTraceback:\n{tb}")
        finally:
            await session.close()
            await async_engine.dispose()

async def loginreport(limit: int, offset: int, callDateStartRange: str, callDateEndRange: str, search: str, type: str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        Member = aliased(Members)

        stmt = (
            select(
                Member.m_memberName,
                Member.m_memberExtensionNo,
                Member.m_accountNo,
                func.date(AgentStatus.a_startTime).label("work_date"),
                func.min(case((AgentStatus.a_status == "LOGIN", AgentStatus.a_startTime))).label("login_time"),
                func.max(case((AgentStatus.a_status == "LOGOUT", AgentStatus.a_endTime))).label("logout_time"),
                func.sum(case((AgentStatus.a_status == "LOGIN", AgentStatus.a_durationSeconds), else_=0)).label("total_seconds"),
                func.sec_to_time(func.sum(case((AgentStatus.a_status == "LOGIN", AgentStatus.a_durationSeconds),else_=0))).label("duration_formatted"))
            .join(Member, AgentStatus.a_memberExtensionNo == Member.m_memberExtensionNo)
            .where(
                AgentStatus.a_status.in_(["LOGIN", "LOGOUT"]),
                AgentStatus.a_accountId == accountid,
                func.date(AgentStatus.a_startTime).between(callDateStartRange, callDateEndRange)
            )
            .group_by(
                Member.m_memberName,
                Member.m_memberExtensionNo,
                Member.m_accountNo,
                func.date(AgentStatus.a_startTime)
            )
            .having(func.min(case((AgentStatus.a_status == "LOGIN", AgentStatus.a_startTime))).isnot(None))
        )

        if search:
            stmt = stmt.where(Member.m_memberName.ilike(f"%{search}%"))
        
        # Apply TL filter
        if memberRole == "TL":
            tl_memberIds_subq = (
                select(Members.m_memberId)
                .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                .where(
                    Teams.t_teamLeaderId == memberId,
                    Teams.t_accountId == accountid,
                    Teams.t_accountNo == accountno
                )
            ).subquery()

            stmt = stmt.where(Member.m_memberId.in_(tl_memberIds_subq))
            
        if type == "export":
            # Define CSV headers
            csv_headers = [
                "Member Name", "Extension No", "Account No", "Work Date",
                "Login Time", "Logout Time", "Total Seconds", "Duration Formatted"
            ]

            # Define row formatter
            def format_login_row(row, serial_no):
                r = row._mapping
                return [
                    serial_no,
                    r["m_memberName"],
                    r["m_memberExtensionNo"],
                    r["work_date"].strftime("%Y-%m-%d") if r["work_date"] else None,
                    r["login_time"].strftime("%Y-%m-%d %H:%M:%S") if r["login_time"] else None,
                    r["logout_time"].strftime("%Y-%m-%d %H:%M:%S") if r["logout_time"] else None,
                    int(r["total_seconds"]) if r["total_seconds"] is not None else 0,
                    str(r["duration_formatted"]) if r["duration_formatted"] else None
                ]

            safe_start = callDateStartRange.replace(" ", "_").replace(":", "-")
            safe_end = callDateEndRange.replace(" ", "_").replace(":", "-")
            filename = f"login_report_{accountno}_{safe_start}_{safe_end}"
            return await cdrexport(
                session=session,
                query_or_list=stmt,
                filename=filename,
                csv_headers=csv_headers,
                row_formatter=format_login_row
            )
        # Pagination
        total_records_result = await session.execute(
            select(func.count()).select_from(stmt.subquery())
        )
        total_records_count = total_records_result.scalar()
        
        paginated_stmt = stmt.order_by(
            func.date(AgentStatus.a_startTime).desc(),
            Member.m_memberName
        ).limit(limit).offset(offset)
        
        result = await session.execute(paginated_stmt)
        rows = result.fetchall()

        formatted_data = []
        for row in rows:
            r = row._mapping
            formatted_data.append({
                "memberName": r["m_memberName"],
                "extensionNo": r["m_memberExtensionNo"],
                "accountNo": r["m_accountNo"],
                "workDate": r["work_date"].strftime("%Y-%m-%d") if r["work_date"] else None,
                "loginTime": r["login_time"].strftime("%Y-%m-%d %H:%M:%S") if r["login_time"] else None,
                "logoutTime": r["logout_time"].strftime("%Y-%m-%d %H:%M:%S") if r["logout_time"] else None,
                "totalSeconds": int(r["total_seconds"]) if r["total_seconds"] is not None else 0,
                "durationFormatted": str(r["duration_formatted"]) if r["duration_formatted"] else None
            })

        return {
                "totalRecordsCount": total_records_count,
                "totalRecords": formatted_data
        }



async def missedcalls(limit: int, offset: int, callDateStartRange: str, callDateEndRange: str, search: str, type: str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int, account_timezone: str = None, memberextensionno: str = None) -> dict:
    async_engine = get_async_reader_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            # filters: c_direction = 'Inbound' and c_disposition = 'NO ANSWER'
            filters = [
                Calls.c_accountId == accountid,
                Calls.c_accountNo == accountno,
                Calls.c_direction == 'Inbound',
                Calls.c_disposition == 'NO ANSWER'
            ]
            
            if memberextensionno:
                filters.append(Calls.c_memberExtensionNo == memberextensionno)

            if callDateStartRange and callDateEndRange:
                if account_timezone and account_timezone not in ('NULL', ''):
                    start_dt_ist = convert_account_tz_to_ist(callDateStartRange, account_timezone)
                    end_dt_ist = convert_account_tz_to_ist(callDateEndRange, account_timezone)
                    if start_dt_ist and end_dt_ist:
                        filters.append(Calls.c_callDateTime.between(start_dt_ist, end_dt_ist))
                else:
                    filters.append(Calls.c_callDateTime.between(callDateStartRange, callDateEndRange))
            
            if search:
                filters.append(
                    or_(
                        Calls.c_customerPhoneno.like(f"%{search}%"),
                        Calls.c_memberExtensionNo.like(f"%{search}%")
                    )
                )

            recordQuery = (
                select(Calls, Members)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .where(and_(*filters))
                .order_by(Calls.c_callDateTime.desc())
            )

            # Export Logic
            if type == "export":
                static_headers = [
                    "Member Name", "Extension", "Customer Phone", "Call Date", 
                    "Direction", "Disposition", "Line Number"
                ]
                
                def format_missed_calls_row(row, serial_no):
                    call, member = row
                    record = [
                        serial_no,
                        member.m_memberName if member else None,
                        call.c_memberExtensionNo,
                        call.c_customerPhoneno,
                        (convert_ist_to_account_tz(call.c_callDateTime, account_timezone) if call.c_callDateTime and account_timezone and account_timezone not in ('NULL', '') else call.c_callDateTime.isoformat() if hasattr(call.c_callDateTime, 'isoformat') else str(call.c_callDateTime)),
                        call.c_direction,
                        call.c_disposition,
                        call.c_clinumberName
                    ]
                    
                    rows_to_write = []
                    if serial_no == 1:
                        rows_to_write.append(["S.No"] + static_headers)
                    rows_to_write.append(record)
                    return rows_to_write

                safe_start = callDateStartRange.replace(" ", "_").replace(":", "-")
                safe_end = callDateEndRange.replace(" ", "_").replace(":", "-")
                filename = f"missed_calls_report_{accountno}_{safe_start}_{safe_end}"

                return await modexport(
                    sessionmaker=async_session_maker,
                    query_or_list=recordQuery,
                    filename=filename,
                    row_formatter=format_missed_calls_row
                )

            # Normal Fetch Logic
            totalRecordsCountQuery = (
                select(func.count(func.distinct(Calls.c_callId)))
                .select_from(Calls)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .where(and_(*filters))
            )

            totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
            rows = (await session.execute(recordQuery.offset(offset).limit(limit))).all()

            totalRecords = []
            for row in rows:
                call, member = row
                record_dict = {
                    "AccountCode": call.c_accountNo,
                    "MemberName": member.m_memberName if member else None,
                    "CustomerPhoneNumber": call.c_customerPhoneno,
                    "CallDateTime": (convert_ist_to_account_tz(call.c_callDateTime, account_timezone) if call.c_callDateTime and account_timezone and account_timezone not in ('NULL', '') else call.c_callDateTime.isoformat() if hasattr(call.c_callDateTime, 'isoformat') else str(call.c_callDateTime)) if call.c_callDateTime else None,
                    "CallDirection": call.c_direction,
                    "CallDisposition": call.c_disposition,
                    "CallLineNumber": call.c_clinumberName,
                    "MemberExtensionNumber": call.c_memberExtensionNo,
                    "MemberExtensionName": call.c_callerName,
                    "CallDisconnectionEnd": call.c_terminationEnd
                }
                totalRecords.append(record_dict)

            return {
                "totalRecordsCount": totalRecordsCount,
                "totalRecords": totalRecords
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

async def voiceReportFetch(limit: int, offset: int, sortOrder: str, sortField: str, search: any, callDateStartRange: str, callDateEndRange: str, accountid: int, accountno: str, database: str, m_memberExtensionNo:str):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            filters = [
                Calls.c_accountId == accountid,
                Calls.c_accountNo == accountno,
                Calls.c_memberExtensionNo == m_memberExtensionNo,
                Calls.c_disposition == 'Voicemail',
            ]
            if callDateStartRange and callDateEndRange:
                filters.append(Calls.c_callDateTime.between(callDateStartRange, callDateEndRange))
            if search:
                filters.append(
                    or_(
                        Calls.c_memberExtensionNo.like(f"%{search}%"),
                        Calls.c_customerPhoneno.like(f"%{search}%")
                    )
                )
            recordQuery = select(Calls).where(and_(*filters))
            if sortField and sortOrder:
                recordQuery = recordQuery.order_by(getattr(getattr(Calls, sortField), sortOrder.lower())())
            totalRecordsCountQuery = select(func.count()).select_from(Calls).where(and_(*filters))
            totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
            result = await session.execute(recordQuery.offset(offset).limit(limit))
            totalRecordsUnserialized = result.scalars().all()

            totalRecords = [
            {
                **VoicemailLogsModel.from_orm(record).dict(),
                # "c_recUrl": f"https://connecthub3m.s3.ap-south-1.amazonaws.com/{record.c_accountNo}/{record.c_callId}.mp3" if record.c_callId else None
                "c_recUrl": getattr(record, "c_callRecordingUrl", None) if record.c_callRecordingUrl else None
            }
            for record in totalRecordsUnserialized
            ]
            return {
                "totalRecordsCount": totalRecordsCount,
                "totalRecords": totalRecords
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

async def Break(limit: int, offset: int, callDateStartRange: str, callDateEndRange: str, search: str, type: str, accountid: int, accountno: str, database: str, memberRole: str, memberId: int):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            start_date = date.fromisoformat(callDateStartRange)
            end_date = date.fromisoformat(callDateEndRange)
            today = date.today()
            all_fields = ["m_breakSeconds", "m_lunchSeconds", "m_meetingSeconds", "m_querySeconds"]

            merged_data = {}

            # 🔹 Step 1: Fetch past data (before today)
            if start_date < today:
                past_end = min(end_date, today - timedelta(days=1))
                past_filters = [
                    MemberProductionReport.m_productionDate.between(start_date, past_end),
                    MemberProductionReport.m_accountId == accountid,
                    MemberProductionReport.m_accountNo == accountno
                ]
                if search:
                    past_filters.append(MemberProductionReport.m_memberName == search)

                past_query = (
                    select(
                        MemberProductionReport.m_accountId,
                        MemberProductionReport.m_accountNo,
                        MemberProductionReport.m_memberId,
                        MemberProductionReport.m_memberName,
                        MemberProductionReport.m_memberExtensionNo,
                        MemberProductionReport.m_productionDate,
                        *[
                            func.sum(getattr(MemberProductionReport, field)).label(field)
                            for field in all_fields
                        ]
                    )
                    .where(and_(*past_filters))
                    .group_by(
                        MemberProductionReport.m_memberId,
                        MemberProductionReport.m_memberExtensionNo,
                        MemberProductionReport.m_productionDate
                    )
                )
                if memberRole == "TL":
                    tl_memberIds_subq = (
                        select(Members.m_memberId)
                        .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                        .where(
                            Teams.t_teamLeaderId == memberId,
                            Teams.t_accountId == accountid,
                            Teams.t_accountNo == accountno
                        )
                    ).subquery()

                    past_query = past_query.where(MemberProductionReport.m_memberId.in_(tl_memberIds_subq))
                past_rows = (await session.execute(past_query)).mappings().all()

                for row in past_rows:
                    key = (
                        row["m_memberId"],
                        str(row["m_memberExtensionNo"]),
                        str(row["m_productionDate"])
                    )
                    merged_data[key] = {
                        "m_productionDate": row["m_productionDate"].isoformat(),
                        "m_accountId": row["m_accountId"],
                        "m_accountNo": row["m_accountNo"],
                        "m_memberId": row["m_memberId"],
                        "m_memberName": row["m_memberName"],
                        "m_memberExtensionNo": row["m_memberExtensionNo"],
                        **{field: row.get(field) or 0 for field in all_fields},
                        "source": ["past"]
                    }

            # 🔹 Step 2: Fetch current-day data (today or future)
            if end_date >= today:
                callStart = f"{today} 00:00:00"
                callEnd = f"{today} 23:59:59"

                agent_subq = (
                    select(
                        func.date(AgentStatus.a_startTime).label("activity_date"),
                        AgentStatus.a_memberId.label("a_memberId"),
                        func.sum(
                            case(
                                (AgentStatus.a_status == "BREAK",
                                 func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)),
                                else_=0
                            )
                        ).label("break_seconds"),
                        func.sum(
                            case(
                                (AgentStatus.a_status == "LUNCH",
                                 func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)),
                                else_=0
                            )
                        ).label("lunch_seconds"),
                        func.sum(
                            case(
                                (AgentStatus.a_status == "MEETING",
                                 func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)),
                                else_=0
                            )
                        ).label("meeting_seconds"),
                        func.sum(
                            case(
                                (AgentStatus.a_status == "QUERY",
                                 func.timestampdiff(text("SECOND"), AgentStatus.a_startTime, AgentStatus.a_endTime)),
                                else_=0
                            )
                        ).label("query_seconds")
                    )
                    .where(and_(
                        AgentStatus.a_startTime.between(callStart, callEnd),
                        AgentStatus.a_accountId == accountid,
                        AgentStatus.a_accountNo == accountno
                    ))
                    .group_by(AgentStatus.a_memberId, func.date(AgentStatus.a_startTime))
                    .subquery()
                )

                query = (
                    select(
                        Members.m_accountId,
                        Members.m_accountNo,
                        Members.m_memberId,
                        Members.m_memberName,
                        Members.m_memberExtensionNo,
                        agent_subq.c.activity_date.label("m_productionDate"),
                        func.coalesce(agent_subq.c.break_seconds, 0).label("m_breakSeconds"),
                        func.coalesce(agent_subq.c.lunch_seconds, 0).label("m_lunchSeconds"),
                        func.coalesce(agent_subq.c.meeting_seconds, 0).label("m_meetingSeconds"),
                        func.coalesce(agent_subq.c.query_seconds, 0).label("m_querySeconds")
                    )
                    .outerjoin(agent_subq, agent_subq.c.a_memberId == Members.m_memberId)
                    .where(and_(
                        Members.m_accountId == accountid,
                        Members.m_accountNo == accountno,
                        Members.m_memberRole == 'USER'
                    ))
                )

                if search:
                    query = query.where(Members.m_memberName == search)
                if memberRole == "TL":
                    tl_memberIds_subq = (
                        select(Members.m_memberId)
                        .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                        .where(
                            Teams.t_teamLeaderId == memberId,
                            Teams.t_accountId == accountid,
                            Teams.t_accountNo == accountno
                        )
                    ).subquery()

                    query = query.where(Members.m_memberId.in_(tl_memberIds_subq))
                current_rows = (await session.execute(query)).mappings().all()

                for row in current_rows:
                    key = (
                        row["m_memberId"],
                        str(row["m_memberExtensionNo"]),
                        str(row["m_productionDate"])
                    )
                    if key in merged_data:
                        for field in all_fields:
                            merged_data[key][field] += (row.get(field, 0) or 0)
                        if "current" not in merged_data[key]["source"]:
                            merged_data[key]["source"].append("current")
                    else:
                        merged_data[key] = {
                            "m_productionDate":row["m_productionDate"],
                            "m_accountId": row["m_accountId"],
                            "m_accountNo": row["m_accountNo"],
                            "m_memberId": row["m_memberId"],
                            "m_memberName": row["m_memberName"],
                            "m_memberExtensionNo": row["m_memberExtensionNo"],
                            **{field: row.get(field, 0) or 0 for field in all_fields},
                            "source": ["current"]
                        }

            # 🔹 Step 3: Prepare paginated/final data
            final_data = list(merged_data.values())
            total_records_count = len(final_data)
            paginated_data = final_data[offset:offset + limit]

            # 🔹 Step 4: Utility function for formatting
            def seconds_to_hms(seconds):
                if seconds is None:
                    return "00:00:00"
                try:
                    seconds = float(seconds)
                except (ValueError, TypeError):
                    return "00:00:00"
                seconds = int(seconds)
                if seconds == 0:
                    return "00:00:00"
                hours = seconds // 3600
                minutes = (seconds % 3600) // 60
                secs = seconds % 60
                return f"{hours:02d}:{minutes:02d}:{secs:02d}"

            # 🔹 Step 5: Export / Return JSON
            if type == "export":
                csv_headers = [
                    "S.No""Date", "Account ID", "Account No", "Member ID",
                    "Member Name", "Member Extension",
                    "Break Time", "Lunch Time", "Meeting Time", "Query Time"
                ]

                def format_login_row(row, serial_no):
                    return [
                        serial_no,
                        row.get("m_productionDate"),
                        row.get("m_accountId"),
                        row.get("m_accountNo"),
                        row.get("m_memberId"),
                        row.get("m_memberName"),
                        row.get("m_memberExtensionNo"),
                        seconds_to_hms(row.get("m_breakSeconds")),
                        seconds_to_hms(row.get("m_lunchSeconds")),
                        seconds_to_hms(row.get("m_meetingSeconds")),
                        seconds_to_hms(row.get("m_querySeconds")),
                    ]

                safe_start = callDateStartRange.replace(" ", "_").replace(":", "-")
                safe_end = callDateEndRange.replace(" ", "_").replace(":", "-")
                filename = f"break_report_{accountno}_{safe_start}_{safe_end}.csv"

                return await cdrexport(
                    session=session,
                    query_or_list=final_data,
                    filename=filename,
                    csv_headers=csv_headers,
                    row_formatter=format_login_row
                )

            else:
                result_data = []
                for data in paginated_data:
                    record = {}
                    for field_name, value in data.items():
                        if field_name.endswith("Seconds"):
                            record[field_name] = seconds_to_hms(value)
                        elif isinstance(value, Decimal):
                            record[field_name] = float(value)
                        elif isinstance(value, (datetime, date)):
                            record[field_name] = value.isoformat()
                        else:
                            record[field_name] = value
                    result_data.append(record)

                return {
                    "totalRecordsCount": total_records_count,
                    "totalRecords": result_data
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

async def conference( limit: int, offset: int, callDateStartRange: str = None, callDateEndRange: str = None, search: str = None, type: str = None, accountid: int = None, accountno: str = None, database: str = 'onedb', memberRole: str = None, memberId: int = None):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    base_url = "https://connecthub3m.s3.ap-south-1.amazonaws.com/"
    
    async with async_session_maker() as session:
        try:
            # Build dynamic filters
            filters = []
            if accountid:
                filters.append(PConferences.p_accountId == accountid)
            if accountno:
                filters.append(PConferences.p_accountNo == accountno)
            if callDateStartRange and callDateEndRange:
                start = f"{callDateStartRange} 00:00:00"
                end = f"{callDateEndRange} 23:59:59"
                filters.append(PConferences.p_createdAt.between(start, end))
            if search:
                filters.append(
                    or_(
                        PConferences.p_confName.like(f"%{search}%"),
                        PConferences.p_customerNumber.like(f"%{search}%")
                    )
                )

            if memberRole == "TL":
                tl_memberIds_subq = (
                    select(Members.m_memberExtensionNo)
                    .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                    .where(
                        Teams.t_teamLeaderId == memberId,
                        Teams.t_accountId == accountid,
                        Teams.t_accountNo == accountno
                    )
                ).subquery()

                filters.append(PConferences.p_confName.in_(tl_memberIds_subq))
            
            # ----------------
            # Export logic
            # ----------------
            if type == "export":
                export_query = (
                    select(
                        PConferences.p_conferenceUniqueId,
                        PConferences.p_accountId,
                        PConferences.p_accountNo,
                        PConferences.p_confName,
                        literal_column(
                            "GROUP_CONCAT(p_customerNumber ORDER BY p_customerNumber SEPARATOR ',')"
                        ).label("customerNumbers"),
                        PConferences.p_confStartTime,
                        PConferences.p_confHours,
                    )
                    .where(*filters)
                    .group_by(
                        PConferences.p_conferenceUniqueId,
                        PConferences.p_confName,
                        PConferences.p_action
                    )
                    .order_by(PConferences.p_createdAt)
                )
                if memberRole == "TL":
                    tl_memberIds_subq = (
                        select(Members.m_memberExtensionNo)
                        .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                        .where(
                            Teams.t_teamLeaderId == memberId,
                            Teams.t_accountId == accountid,
                            Teams.t_accountNo == accountno
                        )
                    ).subquery()

                    export_query = export_query.where(PConferences.p_confName.in_(tl_memberIds_subq))
                # CSV headers
                csv_headers = [
                    "Conference Unique ID", "Account ID", "Account No", "Conference Name",
                    "Customer Numbers", "Conference date", "Duration (Hours)"
                ]

                # Row formatter
                def format_conference_row(row, serial_no):
                    r = row._mapping
                    return [
                        serial_no,
                        r["p_conferenceUniqueId"],
                        r["p_accountId"],
                        r["p_accountNo"],
                        r["p_confName"],
                        r["customerNumbers"],
                        r["p_createdAt"].strftime("%Y-%m-%d %H:%M:%S") if r["p_createdAt"] else None
                    ]

                safe_start = (callDateStartRange or "").replace(" ", "_").replace(":", "-") or "start"
                safe_end = (callDateEndRange or "").replace(" ", "_").replace(":", "-") or "end"
                filename = f"conference_export_{accountno or 'all'}_{safe_start}_{safe_end}"

                # Pass query directly to cdrexport without executing
                return await cdrexport(
                    session=session,
                    query_or_list=export_query,
                    filename=filename,
                    csv_headers=csv_headers,
                    row_formatter=format_conference_row
                )

            # Grouped query using literal_column for GROUP_CONCAT
            query = (
                select(
                    PConferences.p_conferenceUniqueId,
                    PConferences.p_accountId,
                    PConferences.p_accountNo,
                    PConferences.p_confName,
                    literal_column(
                        "GROUP_CONCAT(p_customerNumber ORDER BY p_customerNumber SEPARATOR ',')"
                    ).label("customerNumbers"),
                    func.count().label('totalRecords'),
                    PConferences.p_confStartTime,
                    PConferences.p_confHours,
                )
                .where(*filters)
                .group_by(
                    PConferences.p_conferenceUniqueId,
                    PConferences.p_confName,
                    PConferences.p_action
                )
                .limit(limit)
                .offset(offset)
            )

            result = await session.execute(query)
            records = result.all()

            # Total record count (ignoring pagination)
            count_query = (
                select(func.count(func.distinct(PConferences.p_conferenceUniqueId)))
                .where(*filters)
            )
            totalRecordsCount = (await session.execute(count_query)).scalar()

            # Build final response with URLs
            response_records = [
                {
                    **dict(r._mapping),
                    "url": f"{base_url}{r.p_accountNo or ''}/{r.p_conferenceUniqueId}.mp3"
                }
                for r in records
            ]

            return {
                "totalRecordsCount": totalRecordsCount,
                "records": response_records
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


async def queuemissed( limit: int, offset: int, callDateStartRange: str = None, callDateEndRange: str = None, search: str = None, type: str = None, accountid: int = None, accountno: str = None, database: str = 'onedb', memberRole: str = None, memberId: int = None):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session_maker() as session:
        try:
            # Build dynamic filters
            filters = []
            filters.append(QueueLogs.q_Action == "member-queue-end")
            filters.append(QueueLogs.q_cause == "Cancel")
            if accountno:
                filters.append(QueueLogs.q_accountNo == accountno)
            if callDateStartRange and callDateEndRange:
                start = f"{callDateStartRange} 00:00:00"
                end = f"{callDateEndRange} 23:59:59"
                filters.append(QueueLogs.p_queueCallDate.between(start, end))
            if search:
                filters.append(
                    or_(
                        QueueLogs.q_queueName.like(f"%{search}%"),
                        QueueLogs.q_memberCidNumber.like(f"%{search}%"),
                        QueueLogs.q_cliNumber.like(f"%{search}%"),
                        QueueGroups.q_queuegroupName.like(f"%{search}%")
                    )
                )
            # ----------------
            # Export logic
            # ----------------
            if type == "export":
                export_query = (
                    select(
                        QueueLogs.q_cliNumber,
                        QueueLogs.q_memberCidNumber,
                        QueueLogs.p_queueCallDate,
                        QueueLogs.q_memberUuid,
                        QueueGroups.q_queuegroupName,
                    )
                    .join(QueueGroups, QueueLogs.q_Queue == QueueGroups.q_queuegroupId)
                    .where(*filters)
                    .group_by(QueueLogs.q_memberUuid)
                    .order_by(QueueLogs.p_queueCallDate.desc())
                )
                # CSV headers
                csv_headers = [
                    "CLI Number", "Member CID Number", "Queue Call Date",
                    "Member UUID", "Queue Group Name"
                ]

                # Row formatter
                def format_queue_row(row, serial_no):
                    r = row._mapping
                    return [
                        serial_no,
                        r["q_cliNumber"],
                        r["q_memberCidNumber"],
                        r["p_queueCallDate"],
                        r["q_memberUuid"],
                        r["q_queuegroupName"]
                    ]

                safe_start = (callDateStartRange or "").replace(" ", "_").replace(":", "-") or "start"
                safe_end = (callDateEndRange or "").replace(" ", "_").replace(":", "-") or "end"
                filename = f"queue_missed_export_{accountno or 'all'}_{safe_start}_{safe_end}"

                # Pass query directly to cdrexport without executing
                return await cdrexport(
                    session=session,
                    query_or_list=export_query,
                    filename=filename,
                    csv_headers=csv_headers,
                    row_formatter=format_queue_row
                )
            # Query
            query = (
                select(
                    QueueLogs.q_cliNumber,
                    QueueLogs.q_memberCidNumber,
                    QueueLogs.p_queueCallDate,
                    QueueLogs.q_memberUuid,
                    QueueGroups.q_queuegroupName,
                )
                .join(QueueGroups, QueueLogs.q_Queue == QueueGroups.q_queuegroupId)
                .where(*filters)
                .group_by(QueueLogs.q_memberUuid)
                .order_by(QueueLogs.p_queueCallDate.desc())
                .limit(limit)
                .offset(offset)
            )

            result = await session.execute(query)
            rows = result.fetchall()

            # Total record count (ignoring pagination)
            count_query = (
                select(func.count()).select_from(QueueLogs).join(QueueGroups, QueueLogs.q_Queue == QueueGroups.q_queuegroupId).where(*filters)
            )
            totalRecordsCount = (await session.execute(count_query)).scalar()

            response_records = [dict(row._mapping) for row in rows]

            return {
                "totalRecordsCount": totalRecordsCount,
                "records": response_records
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

        



async def create_mail_automation(accountid: int, accountno: str, name: str, reportName: str, schedule: str, time: str, day: str, dataRange: str, toEmail: str, ccEmail: list, extensionFilter: list, timezoneFilter: str, fieldsFilter: list, database: str):
    async_engine = get_async_writer_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            new_automation = MailAutomation(
                ma_accountId=accountid,
                ma_accountNo=accountno,
                ma_name=name,
                ma_reportName=reportName,
                ma_schedule=schedule,
                ma_time=time,
                ma_day=day,
                ma_dataRange=dataRange,
                ma_toEmail=toEmail,
                ma_ccEmail=ccEmail,
                ma_extensionFilter=extensionFilter,
                ma_timezoneFilter=timezoneFilter,
                ma_fieldsFilter=fieldsFilter,
                ma_status='ACTIVE',
                ma_createdOn=datetime.now()
            )
            session.add(new_automation)
            await session.commit()
            return {"message": "Email Automation Created Successfully"}
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

async def fetch_mail_automation(accountid: int, accountno: str, limit: int, offset: int, database: str):
    async_engine = get_async_reader_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            query = select(MailAutomation).where(
                MailAutomation.ma_accountId == accountid,
                MailAutomation.ma_accountNo == accountno
            ).order_by(MailAutomation.ma_createdOn.desc())

            totalCountQuery = select(func.count()).select_from(query.subquery())
            totalRecordsCount = (await session.execute(totalCountQuery)).scalar()

            result = (await session.execute(query.offset(offset).limit(limit))).scalars().all()
            
            data = []
            for item in result:
                data.append({
                    "ma_id": item.ma_id,
                    "ma_name": item.ma_name,
                    "ma_reportName": item.ma_reportName,
                    "ma_schedule": item.ma_schedule,
                    "ma_time": item.ma_time,
                    "ma_day": item.ma_day,
                    "ma_dataRange": item.ma_dataRange if item.ma_dataRange else "previous_day",
                    "ma_toEmail": item.ma_toEmail,
                    "ma_ccEmail": item.ma_ccEmail if item.ma_ccEmail else [],
                    "ma_extensionFilter": item.ma_extensionFilter if item.ma_extensionFilter else [],
                    "ma_timezoneFilter": item.ma_timezoneFilter if item.ma_timezoneFilter else "",
                    "ma_fieldsFilter": item.ma_fieldsFilter if item.ma_fieldsFilter else [],
                    "ma_status": item.ma_status,
                    "ma_createdOn": item.ma_createdOn.isoformat() if item.ma_createdOn else None
                })

            return {"totalRecordsCount": totalRecordsCount, "data": data}
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
        finally:
            await session.close()
            await async_engine.dispose()

async def delete_mail_automation(accountid: int, accountno: str, automation_id: int, database: str):
    async_engine = get_async_writer_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            stmt = delete(MailAutomation).where(
                MailAutomation.ma_id == automation_id,
                MailAutomation.ma_accountId == accountid,
                MailAutomation.ma_accountNo == accountno
            )
            result = await session.execute(stmt)
            await session.commit()
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Email automation not found")
                
            return {"message": "Email Automation Deleted Successfully"}
        except HTTPException as e:
            raise e
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
        finally:
            await session.close()
            await async_engine.dispose()

async def update_mail_automation(accountid: int, accountno: str, automation_id: int, name: str, reportName: str, schedule: str, time: str, day: str, dataRange: str, toEmail: str, ccEmail: list, extensionFilter: list, timezoneFilter: str, fieldsFilter: list, status: str, database: str):
    async_engine = get_async_writer_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            stmt = select(MailAutomation).where(
                MailAutomation.ma_id == automation_id,
                MailAutomation.ma_accountId == accountid,
                MailAutomation.ma_accountNo == accountno
            )
            result = await session.execute(stmt)
            automation = result.scalar_one_or_none()
            
            if not automation:
                raise HTTPException(status_code=404, detail="Email automation not found")
            
            automation.ma_name = name
            automation.ma_reportName = reportName
            automation.ma_schedule = schedule
            automation.ma_time = time
            automation.ma_day = day
            automation.ma_dataRange = dataRange
            automation.ma_toEmail = toEmail
            automation.ma_ccEmail = ccEmail
            automation.ma_extensionFilter = extensionFilter
            automation.ma_timezoneFilter = timezoneFilter
            automation.ma_fieldsFilter = fieldsFilter
            automation.ma_status = status
            
            await session.commit()
            return {"message": "Email Automation Updated Successfully"}
            
        except HTTPException as e:
            raise e
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

async def toggle_mail_automation_status(accountid: int, accountno: str, automation_id: int, database: str):
    async_engine = get_async_writer_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            stmt = select(MailAutomation).where(
                MailAutomation.ma_id == automation_id,
                MailAutomation.ma_accountId == accountid,
                MailAutomation.ma_accountNo == accountno
            )
            result = await session.execute(stmt)
            automation = result.scalar_one_or_none()
            
            if not automation:
                raise HTTPException(status_code=404, detail="Email automation not found")
            
            new_status = "INACTIVE" if automation.ma_status == "ACTIVE" else "ACTIVE"
            automation.ma_status = new_status
            
            await session.commit()
            return {"message": "Email Automation Status Updated Successfully", "status": new_status, "ma_id": automation_id}
            
        except HTTPException as e:
            raise e
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
        finally:
            await session.close()
            await async_engine.dispose()

async def mail_cdr_fetch(limit: int, offset: int, sortorder: str, sortfield: str, searchstring: any, campaignid: int, calldisposition: str, calldirection: str, callmode: str, dialmethod: str, calldatestartrange: str, calldateendrange: str, type: str, accountid: int, accountno: str, memberId: int, memberrole: str, database: str, include_followups: bool = True, extensionFilter: list = None, timezoneFilter: str = None, fieldsFilter: list = None):
    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:

            filters = [
                Calls.c_accountId == accountid,
                Calls.c_accountNo == accountno
            ]
            if campaignid:
                filters.append(Calls.c_campaignId == campaignid)
            if calldisposition:
                filters.append(Calls.c_disposition == calldisposition)
            if calldirection:
                filters.append(Calls.c_direction == calldirection)
            if callmode:
                filters.append(Calls.c_callMode == callmode)
            if calldatestartrange and calldateendrange:
                filters.append(Calls.c_callDateTime.between(calldatestartrange, calldateendrange))
            if extensionFilter:
                filters.append(Calls.c_memberExtensionNo.in_(extensionFilter))
            # For TL Report
            if memberrole == "TL":
                tl_memberIds_subq = (
                    select(Members.m_memberId)
                    .join(Teams, Teams.t_teamMemberId == Members.m_memberId)
                    .where(
                        Teams.t_teamLeaderId == memberId,
                        Teams.t_accountId == accountid,
                        Teams.t_accountNo == accountno
                    )
                ).subquery()
                tl_extensionNos_subq = (
                    select(Members.m_memberExtensionNo)
                    .where(
                        Members.m_accountId == accountid,
                        Members.m_accountNo == accountno,
                        Members.m_memberId.in_(tl_memberIds_subq)
                    )
                ).subquery()
                filters.append(Calls.c_memberExtensionNo.in_(tl_extensionNos_subq))
            if searchstring:
                filters.append(
                    or_(
                        Calls.c_memberExtensionNo.like(f"%{searchstring}%"),
                        Calls.c_customerPhoneno.like(f"%{searchstring}%"),
                        func.coalesce(Members.m_memberName, '').like(f"%{searchstring}%")
                    )
                )
            recordQuery = (
                select(Calls, Accounts, Campaigns, Members, CallFollowups)
                .join(Accounts, Accounts.a_accountId == Calls.c_accountId, isouter=True)
                .join(Campaigns, Campaigns.c_campaignId == Calls.c_campaignId, isouter=True)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .join(CallFollowups, CallFollowups.c_callId == Calls.c_callId, isouter=True)
                .where(and_(*filters))
            )
            if sortfield and sortorder:
                try:
                    recordQuery = recordQuery.order_by(
                        getattr(getattr(Calls, sortfield), sortorder.lower())()
                    )
                except AttributeError:
                    pass
            # EXPORT BLOCK
            if type == "export":
                static_headers  = [
                    "AccountCode",
                    "CampaignName",
                    "MemberName",
                    "CustomerPhoneNumber",
                    "CallDateTime",
                    "CallDirection",
                    "CallDisposition",
                    "CallDuration",
                    "CallMode",
                    "WrapUpDuration",
                    "CallLineNumber",
                    "MemberExtensionNumber",
                    "MemberPhoneNumber",
                    "MemberExtensionName",
                    "MemberRegisteredIP",
                    "CallDisconnectionEnd"
                ]

                last_followup_keys = None
                initial_header_written = False
                
                # Apply fields filter to static_headers
                final_static_headers = [h for h in static_headers if h in fieldsFilter] if fieldsFilter else static_headers

                def format_cdr_row(row, serial_no):
                    nonlocal last_followup_keys, initial_header_written

                    call, account, campaign, member, followup = row

                    # ---- Extract followup JSON data ----
                    followup_data = {}
                    if include_followups:
                        followup_json = getattr(followup, "c_callfollowupData", None) or {}
                        followup_data = {k: v.get("value") for k, v in followup_json.items()}

                    # Sorted dynamic follow-up columns
                    current_follow_keys = sorted(followup_data.keys())

                    rows_to_write = []

                    # FIRST MAIN HEADER (STATIC ONLY INITIALLY)
                    if not initial_header_written:
                        # Do not include dynamic headers until we see the first followup record
                        full_header = ["SNo"] + final_static_headers + (current_follow_keys if current_follow_keys else [])
                        rows_to_write.append(full_header)

                        initial_header_written = True
                        last_followup_keys = current_follow_keys if current_follow_keys else []
                    else:
                        # ---- NEW LOGIC ----
                        # Only trigger dynamic header change if:
                        # 1. followup data exists, AND
                        # 2. followup key list changed
                        if current_follow_keys and current_follow_keys != last_followup_keys:
                            # Insert spacing row only when followup keys actually change
                            # empty_row = [""] * (1 + len(final_static_headers) + len(current_follow_keys))
                            # rows_to_write.append(empty_row)

                            # fake_header = ["SNo"] + final_static_headers + current_follow_keys
                            # rows_to_write.append(fake_header)

                            last_followup_keys = current_follow_keys

                    # ---- MAIN DATA RECORD ----
                    record = {
                        "AccountCode": getattr(account, "a_accountCode", None) if account else None,
                        "CampaignName": (
                            "Individual"
                            if call.c_campaignId == 0
                            else getattr(campaign, "c_campaignName", None) if campaign else None
                        ),
                        "MemberName": getattr(member, "m_memberName", None) if member else None,
                        "CustomerPhoneNumber": getattr(call, "c_customerPhoneno", None),
                        "CallDateTime": getattr(call, "c_callDateTime", None),
                        "CallDirection": getattr(call, "c_direction", None),
                        "CallDisposition": getattr(call, "c_disposition", None),
                        "CallDuration": getattr(call, "c_talktime", None),
                        "CallMode": getattr(call, "c_callMode", None),
                        "WrapUpDuration": getattr(followup, "c_callfollowupDuration", None),
                        "CallLineNumber": getattr(call, "c_clinumberName", None),
                        "MemberExtensionNumber": getattr(call, "c_memberExtensionNo", None),
                        "MemberPhoneNumber": getattr(call, "c_memberPhoneno", None),
                        "MemberExtensionName": getattr(call, "c_callerName", None),
                        "MemberRegisteredIP": getattr(call, "c_clientIp", None),
                        "CallDisconnectionEnd": getattr(call, "c_terminationEnd", None),
                    }

                    # If followup missing, pad using last_followup_keys
                    active_keys = current_follow_keys if current_follow_keys else last_followup_keys

                    row_values = [serial_no] + [record[h] for h in final_static_headers]
                    row_values += [followup_data.get(k, "") for k in active_keys]

                    rows_to_write.append(row_values)

                    return rows_to_write

                safe_start = calldatestartrange.replace(" ", "_").replace(":", "-")
                safe_end = calldateendrange.replace(" ", "_").replace(":", "-")
                filename = f"cdr_export_{accountno}_{safe_start}_{safe_end}"

                return await modexport(
                    sessionmaker=async_session_maker,
                    query_or_list=recordQuery,
                    filename=filename,
                    row_formatter=format_cdr_row
                )
            # NORMAL FETCH BLOCK
            totalRecordsCountQuery = (
                select(func.count(func.distinct(Calls.c_callId)))
                .select_from(Calls)
                .join(Members, Members.m_memberExtensionNo == Calls.c_memberExtensionNo, isouter=True)
                .where(and_(*filters))
            )
            totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
            rows = (await session.execute(recordQuery.offset(offset).limit(limit))).all()
            totalRecords = []
            for row in rows:
                call, account, campaign, member, followup = row
                record_dict = {}
                record_dict.update({
                    "AccountCode": getattr(account, "a_accountCode", None) if account else None,
                    "CampaignName": ( "Individual" if call.c_campaignId == 0 else getattr(campaign, "c_campaignName", None) if campaign else None),
                    "MemberName": getattr(member, "m_memberName", None) if member else None,
                    "CustomerPhoneNumber": getattr(call, "c_customerPhoneno", None) if call else None,
                    "CallDateTime": getattr(call, "c_callDateTime", None) if call else None,
                    "CallDirection": getattr(call, "c_direction", None) if call else None,
                    "CallDisposition": getattr(call, "c_disposition", None) if call else None,
                    "CallDuration": getattr(call, "c_talktime", None) if call else None,
                    "CallMode": getattr(call, "c_callMode", None) if call else None,
                    "WrapUpDuration": getattr(followup, "c_callfollowupDuration", None)
                })
                followupjson = getattr(followup, "c_callfollowupData", None)
                if followupjson:
                    try:
                        followupdata = {
                            key: field.get("value") for key, field in followupjson.items()
                        }
                        record_dict["FollowUpData"] = followupdata
                    except Exception:
                        record_dict["FollowUpData"] = {}
                else:
                    record_dict["FollowUpData"] = {}
                record_dict.update({
                    "CallLineNumber": getattr(call, "c_clinumberName", None) if call else None,
                    "MemberExtensionNumber": getattr(call, "c_memberExtensionNo", None) if call else None,
                    "MemberPhoneNumber": getattr(call, "c_memberPhoneno", None) if call else None,
                    "MemberExtensionName": getattr(call, "c_callerName", None) if call else None,
                    "MemberRegisteredIP": getattr(call, "c_clientIp", None) if call else None,
                    "CallDisconnectionEnd": getattr(call, "c_terminationEnd", None) if call else None,
                    "CallRecording": getattr(call, "c_callRecordingUrl", None) if call else None
                    # "CallRecording": getattr(call, "c_callRecordingUrl", None) if call.c_callRecordingUrl else None
                })
                totalRecords.append(record_dict)
            data = {
                "totalRecordsCount": totalRecordsCount,
                "totalRecords": totalRecords
            }
            return JSONResponse(
                status_code=fastapi_status.HTTP_200_OK,
                content={
                    "message": "Cdr Records Fetched Successfully",
                    "data": data
                }
            )
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


async def reportwebhook(unique_call_identifier: str, m_accountId: int, m_accountNo: str, m_memberId: int, database: str):
    redis = get_redis()
    if not redis:
        return None
    redis_key = f"call:{unique_call_identifier}"
    cached_value = await redis.get(redis_key)

    print(f"Redis Key: {redis_key}, Cached Value: {cached_value}")

    if cached_value:
        try:
            return json.loads(cached_value)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="Corrupted Redis payload"
            )

    print("No cached value found in Redis. Fetching from MySQL...")

    async_engine = get_async_reader_engine('onedb')
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            stmt = select(Calls).where(
                Calls.c_clientUniqueId == unique_call_identifier,
                Calls.c_accountId == m_accountId,
                Calls.c_accountNo == m_accountNo
            )
            result = await session.execute(stmt)
            call = result.scalars().first()

            if not call:
                return {
                    "status": "NOT_FOUND",
                    "reason": "No call found for given accountId, accountNo, and clientUniqueId"
                }

            call_data = {
                "status": "SUCCESS",
                "count": 1,
                "data": [
                    {
                        "callId": call.c_callId,
                        "direction": call.c_direction,
                        "cliName": call.c_clinumberName,
                        "customerPhone": call.c_customerPhoneno,
                        "duration": call.c_duration,
                        "callDateTime": call.c_callDateTime,
                        "disposition": call.c_disposition,
                        "recordingUrl": f"{call.recordingUrl}",
                        "wssUrl": call.c_wssUrl
                    }
                ]
            }

            await redis.set(redis_key, json.dumps(call_data), ex=3600)
            return call_data

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )
        finally:
            await session.close()
            await async_engine.dispose()
