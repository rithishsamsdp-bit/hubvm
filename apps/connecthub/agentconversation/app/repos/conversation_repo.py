from sqlalchemy import select, Delete, Update, String, or_, and_, func, desc, cast, case
from sqlalchemy.sql import over
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from pymongo.errors import PyMongoError
from db.context import get_async_engine, asyncSessionFactory, asyncClientFactory
from models.db import Leads, Conversations, Tasks, Members, Contact, CallFollowups, CallBackReminders, Teams
from utils.sha256_hashing import alphanumericUniqueId
from collections import defaultdict
from datetime import datetime
import random, colorsys, json, pytz

IST = pytz.timezone("Asia/Kolkata")

def get_random_hex_color():
    h = random.random()  
    s = random.uniform(0.35, 0.65)  
    l = random.uniform(0.45, 0.65) 
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return '#{:02X}{:02X}{:02X}'.format(int(r * 255), int(g * 255), int(b * 255))

async def end(conversationid: str, callid: str, callendtime: str, followup: dict, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    client, db = asyncClientFactory(database)
    try:
        if callendtime == '':
            followupduration = ''
        else:
            conversationendtime = datetime.now(IST)
            timeformat = "%Y-%m-%d %H:%M:%S"
            callterminationtime = datetime.strptime(callendtime, timeformat)
            callterminationtime = IST.localize(callterminationtime)
            followupduration = int((conversationendtime - callterminationtime).total_seconds())

        # Only insert CallFollowup if callid is not empty to avoid duplicate key error
        if callid and callid.strip():
            callfollowupid = '00F' + alphanumericUniqueId()
            CallFollowup = CallFollowups(
                c_accountId = accountid,
                c_accountNo = accountno,
                c_callfollowupId = callfollowupid,
                c_callfollowupDuration = followupduration,
                c_callfollowupData = followup,
                c_callId = callid
            )
            session.add(CallFollowup)
            await session.flush()
        await session.execute(
            Delete(Conversations).where(
                Conversations.c_accountId == accountid,
                Conversations.c_accountNo == accountno,
                Conversations.c_conversationId == conversationid
            )
        )
        await session.flush()
        await session.execute(Update(Tasks).where(
            Tasks.t_conversationId == conversationid,
        ).values({
            Tasks.t_taskFollowup: followup,
            Tasks.t_taskFollowupDuration: followupduration,
            Tasks.t_conversationId : "",
        }))
        await session.commit()
        collection = db['activities']
        await collection.update_one({"conversationId": conversationid},{"$set": {'followup': followup, "conversationId": ""}})
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

async def list(memberextensionno: str, offset: int, limit: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(Conversations, Contact.c_Name)
            .join(
                Contact,
                and_(
                    cast(Conversations.c_conversationPhoneNo, String) == func.concat(Contact.c_countryCode, Contact.c_phoneNumber),
                    Contact.c_phLogin == memberextensionno
                ),
                isouter=True
            )
            .where(
                Conversations.c_conversationOwner == memberextensionno,
                Conversations.c_accountId == accountid,
                Conversations.c_accountNo == accountno
            )
            .order_by(desc(Conversations.c_createdOn))
            .offset(offset)
            .limit(limit)
        )
        result = (await session.execute(recordQuery)).all()
        data = []
        for conversation, contactname in result:
            data.append({
                "c_conversationId": conversation.c_conversationId,
                "c_conversationPhoneNo": conversation.c_conversationPhoneNo,
                "c_conversationOwner": conversation.c_conversationOwner,
                "c_conversationChannel": conversation.c_conversationChannel,
                "c_conversationType": conversation.c_conversationType,
                "c_conversationDetails": conversation.c_conversationDetails,
                "c_conversationStatus": conversation.c_conversationStatus,
                "c_leadId": conversation.c_leadId,
                "c_taskId": conversation.c_taskId,
                "c_contactName": contactname,
                "c_createdOn":str(conversation.c_createdOn),
                "c_updatedOn":str(conversation.c_updatedOn),
                "colour": get_random_hex_color()
            })
        return data
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

# async def followupFetch(phonenumber: str, leadid: str, campaignid: str, clinumberid: str, calldirection: str, accountid: int, accountno: str, database: str):
#     client, db = asyncClientFactory(database)
#     try:
#         collection = db['activities']
#         filters = {
#             "leadId": leadid,
#             "accountId": accountid,
#             "accountNo": accountno,
#             "followup": {
#                 "$exists": True,
#                 "$ne": ""
#             }
#         }
#         if calldirection.lower() == "outbound":
#             filters["details.c_campaignId"] = int(campaignid)
#         # elif calldirection.lower() == "inbound":
#         #     filters["details.c_clinumberId"] = clinumberid
#         record = await collection.find_one(
#             filters,
#             sort=[("activityTimestamp", -1)],
#             projection={"followup": 1, "_id": 0}
#         )
#         if not record or "followup" not in record:
#             raise HTTPException(status_code=200, detail="Followup Not Found")
#         return record["followup"]
#     except HTTPException:
#         raise
#     except PyMongoError as e:
#         raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
#     finally:
#         client.close()

async def followupFetch(phonenumber: str, leadid: str, campaignid: str, clinumberid: str, calldirection: str, accountid: int, accountno: str, database: str):
    client = None
    try:
        client, db = asyncClientFactory(database)
        activities = db["activities"]
        filters = {
            "leadId": leadid,
            "accountId": accountid,
            "accountNo": accountno,
            "followup": {"$exists": True, "$ne": ""}
        }
        if calldirection.lower() == "outbound":
            filters["details.c_campaignId"] = int(campaignid)
        # elif calldirection.lower() == "inbound":
        #     filters["details.c_clinumberId"] = clinumberid
        record = await activities.find_one(
            filters,
            sort=[("activityTimestamp", -1)],
            projection={"followup": 1, "_id": 0}
        )
        if record and record.get("followup"):
            return record["followup"]


        client.close()
        client, db = asyncClientFactory("onedbpredectiveleads")
        leads_collection = db[str(accountid)]
        lead_filters = {
            "p_leadPhoneNumber": phonenumber,
            "p_leadCampaignID": int(campaignid),
            "p_leadaccountID": accountid,
            "p_leadaccountNo": accountno
        }
        lead_record = await leads_collection.find_one(
            lead_filters,
            sort=[("p_updatedAt", -1)]
        )
        if lead_record and lead_record.get("p_customeData"):
            return lead_record["p_customeData"]

        raise HTTPException(status_code=200, detail="Followup / Lead Data Not Found")

    except HTTPException:
        raise
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        if client:
            client.close()

async def getCallFollowUp(callid: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(CallFollowups).where(
                CallFollowups.c_callId == callid,
                CallFollowups.c_accountId == accountid,
                CallFollowups.c_accountNo == accountno
            )
        result = (await session.execute(recordQuery)).scalar_one_or_none()
        if not result:
            raise HTTPException(status_code=404, detail="No follow-up found")
        data = result.c_callfollowupData
        totalRecords = {}
        for field_name, field_info in data.items():
            totalRecords[field_name] = field_info.get("value")
            print(totalRecords)
        return totalRecords
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

async def createCallback(phonenumber: str, callbacktime: str, memberid: int, memberextensionno: int, accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            CallBackReminder = CallBackReminders(
                c_accountId = accountid,
                c_accountNo = accountno,
                c_phonenumber = phonenumber,
                c_timestamp = callbacktime,
                c_memberExtensionNo = str(memberextensionno),
                c_memberId = memberid
            )
            session.add(CallBackReminder)
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

async def fetchCallbackReminder(
    sortorder: str, 
    sortfield: str, 
    searchstring: str, 
    offset: int, 
    limit: int, 
    accountid: int, 
    accountno: str, 
    database: str, 
    calldatestart: str, 
    calldateend: str,
    memberrole: str,
    memberextensionno: str
):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        query = (
            select(
                CallBackReminders.c_recordId,
                CallBackReminders.c_accountId,
                CallBackReminders.c_accountNo,
                CallBackReminders.c_phonenumber,
                CallBackReminders.c_timestamp,
                CallBackReminders.c_memberExtensionNo,
                CallBackReminders.c_memberId,
                CallBackReminders.c_createdOn,
                Members.m_memberName
            )
            .join(
                Members,
                cast(CallBackReminders.c_memberExtensionNo, String) == cast(Members.m_memberExtensionNo, String),
                isouter=True
            )
            .where(
                CallBackReminders.c_accountId == accountid,
                CallBackReminders.c_accountNo == accountno
            )
        )

        if memberrole == "USER":
            query = query.where(
                CallBackReminders.c_memberExtensionNo == memberextensionno
            )
        
        elif memberrole == "TL":
            team_members_query = select(Teams.t_teamMemberExtensionNo).where(
                Teams.t_teamLeaderExtensionNo == memberextensionno,
                Teams.t_accountId == accountid,
                Teams.t_accountNo == accountno
            )
            team_members_result = (await session.execute(team_members_query)).scalars().all()
            
            team_member_extensions = [str(ext) for ext in team_members_result]
            
            team_member_extensions.append(str(memberextensionno))
            
            if team_member_extensions:
                query = query.where(
                    CallBackReminders.c_memberExtensionNo.in_(team_member_extensions)
                )
            else:
                query = query.where(
                    CallBackReminders.c_memberExtensionNo == memberextensionno
                )
        
        elif memberrole in ["ADMIN", "SUPERADMIN"]:
            pass

        if calldatestart and calldateend:
            query = query.where(
                and_(
                    CallBackReminders.c_createdOn >= calldatestart,
                    CallBackReminders.c_createdOn <= calldateend
                )
            )

        if searchstring and searchstring.strip():
            search_filter = or_(
                cast(CallBackReminders.c_phonenumber, String).ilike(f"%{searchstring}%"),
                cast(CallBackReminders.c_memberExtensionNo, String).ilike(f"%{searchstring}%"),
                Members.m_memberName.ilike(f"%{searchstring}%")
            )
            query = query.where(search_filter)

        count_query = select(func.count()).select_from(query.subquery())
        total_records = (await session.execute(count_query)).scalar()

        if sortfield and sortfield.strip():
            sort_column_map = {
                "c_phonenumber": CallBackReminders.c_phonenumber,
                "c_timestamp": CallBackReminders.c_timestamp,
                "c_memberExtensionNo": CallBackReminders.c_memberExtensionNo,
                "c_createdOn": CallBackReminders.c_createdOn,
                "m_memberName": Members.m_memberName
            }
            sort_column = sort_column_map.get(sortfield, CallBackReminders.c_createdOn)
            
            if sortorder.upper() == "ASC":
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())
        else:
            if sortorder.upper() == "ASC":
                query = query.order_by(CallBackReminders.c_createdOn.asc())
            else:
                query = query.order_by(CallBackReminders.c_createdOn.desc())

        query = query.offset(offset).limit(limit)

        result = (await session.execute(query)).all()

        data = []
        for row in result:
            data.append({
                "c_recordId": row.c_recordId,
                "c_accountId": row.c_accountId,
                "c_accountNo": row.c_accountNo,
                "c_phonenumber": row.c_phonenumber,
                "c_timestamp": row.c_timestamp,
                "c_memberExtensionNo": row.c_memberExtensionNo,
                "c_memberId": row.c_memberId,
                "c_createdOn": str(row.c_createdOn),
                "m_memberName": row.m_memberName if row.m_memberName else ""
            })

        return {
            "records": data,
            "totalRecords": total_records,
            "offset": offset,
            "limit": limit
        }

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

async def getContact(phonenumber: str, accountid: int, accountno: str, memberextensionno: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        # recordQuery = select(Contact).where(
        #     Contact.c_phLogin == memberextensionno,
        #     Contact.c_phoneNumber == phonenumber,
        #     Contact.c_accountId == accountid,
        #     Contact.c_accountNo == accountno
        # )
        # totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        # return totalRecordsUnserialized

        agent_priority = case(
            (Contact.c_phLogin == memberextensionno, 1),
            else_=0
        )

        row_number = func.row_number().over(
            partition_by=Contact.c_phoneNumber,
            order_by=[agent_priority.desc(), Contact.c_createdOn.desc()]
        ).label("rn")

        base_query = select(
            Contact,
            row_number
        ).where(
            func.concat(Contact.c_countryCode, Contact.c_phoneNumber) == phonenumber,
            Contact.c_accountId == accountid,
            Contact.c_accountNo == accountno
        )

        subq = base_query.subquery()

        final_query = (
            select(Contact)
            .join(subq, subq.c.c_id == Contact.c_id)
            .where(subq.c.rn == 1)
            .order_by(Contact.c_createdOn.desc())
        )

        result = await session.execute(final_query)
        contact = result.scalars().first()
        return [contact] if contact else []

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


async def followuppredictiveFetch(leadid: str, campaignid: str, accountid: int, accountno: str, database: str):
    client, db = asyncClientFactory("onedbpredectiveleads")
    try:
        collection = db[str(accountid)]
        filters = {
            "p_leadID": leadid,
            "p_leadCampaignID": campaignid,
            "p_leadaccountID": accountid,
            "p_leadaccountNo": accountno
        }
        record = await collection.find_one(
            filters,
            sort=[("p_updatedAt", -1)],

        )
        if not record or "p_customeData" not in record:
            raise HTTPException(status_code=200, detail="Lead Data Not Found")
        return record["p_customeData"]
    except HTTPException:
        raise
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        client.close()