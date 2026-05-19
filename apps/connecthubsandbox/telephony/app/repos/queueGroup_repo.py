from sqlalchemy import select, Delete, Update, or_, and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import get_async_engine, get_async_engine_db2
from models.db import QueueGroups, Tiers, Agents, Members, MediaInstances
from models.dto import MembersModel
from typing import List

async def create(queuegroupid: int, queuegroupname: str, queuegroupstrategy: str, queuegrouptimeout: int, agentwaittime: int, memberids: List[int], memberextensions: List[int], mediainstancenames: List[str], proxyprivateipaddress: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    async_engine2 = get_async_engine_db2(database)
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2 = async_session_maker2()
    try:
        duplicate = (await session.execute(
            select(QueueGroups).filter(
                QueueGroups.q_accountId == accountid,
                QueueGroups.q_accountNo == accountno,
                QueueGroups.q_queuegroupName == queuegroupname
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{queuegroupname}' already exists.")
        result = await session.execute(
            select(
                Members.m_memberId,
                Members.m_status,
                Members.m_readyStatus
            ).where(Members.m_memberId.in_(memberids))
        )
        member_status_map = {
            row.m_memberId: (row.m_status, row.m_readyStatus)
            for row in result
        }
        for memberid, memberextension in zip(memberids, memberextensions):
            QueueGroup = QueueGroups(
                q_accountId=accountid,
                q_accountNo=accountno,
                q_queuegroupId=queuegroupid,
                q_queuegroupName=queuegroupname,
                q_queuegroupStatus="Inactive",
                q_queuegroupStrategy=queuegroupstrategy,
                q_queuegroupTimeout=queuegrouptimeout,
                q_agentwaittime=agentwaittime,
                q_memberId=memberid,
                q_memberExtensionNo=f"{memberextension}@{queuegroupid}"
            )
            session.add(QueueGroup)
            
        await session.flush()
        
        i=1
        for memberid, memberextension in zip(memberids, memberextensions):
            
            if queuegroupstrategy == "top-down" or queuegroupstrategy == "sequentially-by-agent-order":
                position = i
                i += 1
            else:
                position = 1
            m_status, m_readyStatus = member_status_map.get(memberid, (None, None))
            status = "Logged Out"
            if m_status == "LOGOUT":
                status = "Logged Out"
            elif m_readyStatus == "READY" and m_status != "LOGOUT":
                status = "Available"
            elif m_readyStatus == "NOTREADY" and m_status != "LOGOUT":
                status = "On Break"
            Tier = Tiers(
                queue=f"{queuegroupid}@{accountno}",
                agent=f"{memberextension}@{queuegroupid}",
                state="Ready",
                level=1,
                position=position
            )
            session2.add(Tier)
            Agent = Agents(
                queue=f"{queuegroupid}@{accountno}",
                name=f"{memberextension}@{queuegroupid}",
                instance_id='single_box',
                uuid="",
                type="callback",
                contact = f"{{originate_timeout={agentwaittime},hangup_after_bridge=true,execute_on_answer='lua /opt/freeswitch/storage/script/inbound_queue_answer.lua ${{uuid}} {accountid} {accountno}'}}sofia/internal/sip:{memberextension}@{proxyprivateipaddress}:5182",
                status=status,
                state="Waiting",
                max_no_answer=3,
                wrap_up_time=0,
                reject_delay_time=5,
                busy_delay_time=5,
                no_answer_delay_time=5,
                last_bridge_start=0,
                last_bridge_end=0,
                last_offered_call=0,
                last_status_change=0,
                no_answer_count=0,
                calls_answered=0,
                talk_time=0,
                ready_time=0,
                external_calls_count=0
            )
            session2.add(Agent)
        await session.commit()
        await session2.commit()
    except IntegrityError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await session2.close()
        await async_engine.dispose()
        await async_engine2.dispose()

async def createMidReg(queuegroupid: int, queuegroupname: str, queuegroupstrategy: str, queuegrouptimeout: int, agentwaittime: int, memberids: List[int], memberextensions: List[int], mediainstancenames: List[str], proxyprivateipaddress: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    async_engine2 = get_async_engine_db2(database)
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2 = async_session_maker2()
    try:
        duplicate = (await session.execute(
            select(QueueGroups).filter(
                QueueGroups.q_accountId == accountid,
                QueueGroups.q_accountNo == accountno,
                QueueGroups.q_queuegroupName == queuegroupname
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{queuegroupname}' already exists.")
        result = await session.execute(
            select(
                Members.m_memberId,
                Members.m_status,
                Members.m_readyStatus
            ).where(Members.m_memberId.in_(memberids))
        )
        member_status_map = {
            row.m_memberId: (row.m_status, row.m_readyStatus)
            for row in result
        }
        for memberid, memberextension in zip(memberids, memberextensions):
            QueueGroup = QueueGroups(
                q_accountId=accountid,
                q_accountNo=accountno,
                q_queuegroupId=queuegroupid,
                q_queuegroupName=queuegroupname,
                q_queuegroupStatus="Inactive",
                q_queuegroupStrategy=queuegroupstrategy,
                q_queuegroupTimeout=queuegrouptimeout,
                q_agentwaittime=agentwaittime,
                q_memberId=memberid,
                q_memberExtensionNo=f"{memberextension}@{proxyprivateipaddress}"
            )
            session.add(QueueGroup)
        await session.flush()
        
        i=1
        for memberid, memberextension in zip(memberids, memberextensions):
            
            if queuegroupstrategy == "top-down" or queuegroupstrategy == "sequentially-by-agent-order":
                position = i
                i += 1
            else:
                position = 1
            m_status, m_readyStatus = member_status_map.get(memberid, (None, None))
            status = "Logged Out"
            if m_status == "LOGOUT":
                status = "Logged Out"
            elif m_readyStatus == "READY" and m_status != "LOGOUT":
                status = "Available"
            elif m_readyStatus == "NOTREADY" and m_status != "LOGOUT":
                status = "On Break"
            Tier = Tiers(
                queue=f"{queuegroupid}@{accountno}",
                agent=f"{memberextension}@{proxyprivateipaddress}",
                state="Ready",
                level=1,
                position=position
            )
            session2.add(Tier)
            Agent = Agents(
                queue=f"{queuegroupid}@{accountno}",
                name=f"{memberextension}@{proxyprivateipaddress}",
                instance_id='single_box',
                uuid="",
                type="callback",
                contact = f"{{originate_timeout={agentwaittime},hangup_after_bridge=true,sip_sticky_contact=true,execute_on_answer='lua /opt/freeswitch/storage/script/inbound_queue_answer.lua ${{uuid}} {accountid} {accountno}'}}sofia/internal/sip:{memberextension}@pulse-proxy-3-int.pulsework360.com:5060",
                status=status,
                state="Waiting",
                max_no_answer=3,
                wrap_up_time=0,
                reject_delay_time=5,
                busy_delay_time=5,
                no_answer_delay_time=5,
                last_bridge_start=0,
                last_bridge_end=0,
                last_offered_call=0,
                last_status_change=0,
                no_answer_count=0,
                calls_answered=0,
                talk_time=0,
                ready_time=0,
                external_calls_count=0
            )
            session2.add(Agent)
        await session.commit()
        await session2.commit()
    except IntegrityError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await session2.close()
        await async_engine.dispose()
        await async_engine2.dispose()

async def update(oldqueuegroupid: int, queuegroupname: str, queuegroupstrategy: str, queuegrouptimeout: int, agentwaittime: int, memberids: List[int], memberextensions: List[int], mediainstancenames: List[str], proxyprivateipaddress: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    async_engine2 = get_async_engine_db2(database)
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2 = async_session_maker2()
    try:
        duplicate = (await session.execute(
            select(QueueGroups).filter(
                QueueGroups.q_accountId == accountid,
                QueueGroups.q_accountNo == accountno,
                QueueGroups.q_queuegroupName == queuegroupname,
                QueueGroups.q_queuegroupId != oldqueuegroupid
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{queuegroupname}' already exists.")
        result = await session.execute(
            select(
                Members.m_memberId,
                Members.m_status,
                Members.m_readyStatus
            ).where(Members.m_memberId.in_(memberids))
        )
        member_status_map = {
            row.m_memberId: (row.m_status, row.m_readyStatus)
            for row in result
        }
        await session.execute(
            Delete(QueueGroups).where(
                QueueGroups.q_queuegroupId == oldqueuegroupid,
                QueueGroups.q_accountId == accountid,
                QueueGroups.q_accountNo == accountno
            )
        )
        await session2.execute(
            Delete(Tiers).where(
                Tiers.queue == f"{oldqueuegroupid}@{accountno}"
            )
        )
        await session2.execute(
            Delete(Agents).where(
                Agents.queue == f"{oldqueuegroupid}@{accountno}"
            )
        )
        for memberid, memberextension in zip(memberids, memberextensions):
            QueueGroup = QueueGroups(
                q_accountId=accountid,
                q_accountNo=accountno,
                q_queuegroupId=oldqueuegroupid,
                q_queuegroupName=queuegroupname,
                q_queuegroupStatus="Inactive",
                q_queuegroupStrategy=queuegroupstrategy,
                q_queuegroupTimeout=queuegrouptimeout,
                q_agentwaittime=agentwaittime,
                q_memberId=memberid,
                q_memberExtensionNo=f"{memberextension}@{oldqueuegroupid}"
            )
            session.add(QueueGroup)
        await session.flush()
        i=1
        for memberid, memberextension in zip(memberids, memberextensions):
            if queuegroupstrategy == "top-down" or queuegroupstrategy == "sequentially-by-agent-order":
                position = i
                i += 1
            else:
                position = 1            
            m_status, m_readyStatus = member_status_map.get(memberid, (None, None))
            status = "Logged Out"
            if m_status == "LOGOUT":
                status = "Logged Out"
            elif m_readyStatus == "READY" and m_status != "LOGOUT":
                status = "Available"
            elif m_readyStatus == "NOTREADY" and m_status != "LOGOUT":
                status = "On Break"
            Tier = Tiers(
                queue=f"{oldqueuegroupid}@{accountno}",
                agent=f"{memberextension}@{oldqueuegroupid}",
                state="Ready",
                level=1,
                position=position
            )
            session2.add(Tier)
            Agent = Agents(
                queue=f"{oldqueuegroupid}@{accountno}",
                name=f"{memberextension}@{oldqueuegroupid}",
                instance_id='single_box',
                uuid="",
                type="callback",
                contact = f"{{originate_timeout={agentwaittime},hangup_after_bridge=true,execute_on_answer='lua /opt/freeswitch/storage/script/inbound_queue_answer.lua ${{uuid}} {accountid} {accountno}'}}sofia/internal/sip:{memberextension}@{proxyprivateipaddress}:5182",
                status=status,
                state="Waiting",
                max_no_answer=3,
                wrap_up_time=0,
                reject_delay_time=5,
                busy_delay_time=5,
                no_answer_delay_time=5,
                last_bridge_start=0,
                last_bridge_end=0,
                last_offered_call=0,
                last_status_change=0,
                no_answer_count=0,
                calls_answered=0,
                talk_time=0,
                ready_time=0,
                external_calls_count=0
            )
            session2.add(Agent)
        await session.commit()
        await session2.commit()
    except IntegrityError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await session2.close()
        await async_engine.dispose()
        await async_engine2.dispose()

async def updateMidReg(oldqueuegroupid: int, queuegroupname: str, queuegroupstrategy: str, queuegrouptimeout: int, agentwaittime: int, memberids: List[int], memberextensions: List[int], mediainstancenames: List[str], proxyprivateipaddress: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    async_engine2 = get_async_engine_db2(database)
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2 = async_session_maker2()
    try:
        duplicate = (await session.execute(
            select(QueueGroups).filter(
                QueueGroups.q_accountId == accountid,
                QueueGroups.q_accountNo == accountno,
                QueueGroups.q_queuegroupName == queuegroupname,
                QueueGroups.q_queuegroupId != oldqueuegroupid
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{queuegroupname}' already exists.")
        result = await session.execute(
            select(
                Members.m_memberId,
                Members.m_status,
                Members.m_readyStatus
            ).where(Members.m_memberId.in_(memberids))
        )
        member_status_map = {
            row.m_memberId: (row.m_status, row.m_readyStatus)
            for row in result
        }
        await session.execute(
            Delete(QueueGroups).where(
                QueueGroups.q_queuegroupId == oldqueuegroupid,
                QueueGroups.q_accountId == accountid,
                QueueGroups.q_accountNo == accountno
            )
        )
        await session2.execute(
            Delete(Tiers).where(
                Tiers.queue == f"{oldqueuegroupid}@{accountno}"
            )
        )
        await session2.execute(
            Delete(Agents).where(
                Agents.queue == f"{oldqueuegroupid}@{accountno}"
            )
        )
        for memberid, memberextension in zip(memberids, memberextensions):
            QueueGroup = QueueGroups(
                q_accountId=accountid,
                q_accountNo=accountno,
                q_queuegroupId=oldqueuegroupid,
                q_queuegroupName=queuegroupname,
                q_queuegroupStatus="Inactive",
                q_queuegroupStrategy=queuegroupstrategy,
                q_queuegroupTimeout=queuegrouptimeout,
                q_agentwaittime=agentwaittime,
                q_memberId=memberid,
                q_memberExtensionNo=f"{memberextension}@{proxyprivateipaddress}"
            )
            session.add(QueueGroup)
        await session.flush()
        
        i=1
        for memberid, memberextension in zip(memberids, memberextensions):
            
            if queuegroupstrategy == "top-down" or queuegroupstrategy == "sequentially-by-agent-order":
                position = i
                i += 1
            else:
                position = 1            
            m_status, m_readyStatus = member_status_map.get(memberid, (None, None))
            status = "Logged Out"
            if m_status == "LOGOUT":
                status = "Logged Out"
            elif m_readyStatus == "READY" and m_status != "LOGOUT":
                status = "Available"
            elif m_readyStatus == "NOTREADY" and m_status != "LOGOUT":
                status = "On Break"
            Tier = Tiers(
                queue=f"{oldqueuegroupid}@{accountno}",
                agent=f"{memberextension}@{proxyprivateipaddress}",
                state="Ready",
                level=1,
                position=position
            )
            session2.add(Tier)
            Agent = Agents(
                queue=f"{oldqueuegroupid}@{accountno}",
                name=f"{memberextension}@{proxyprivateipaddress}",
                instance_id='single_box',
                uuid="",
                type="callback",
                contact = f"{{originate_timeout={agentwaittime},hangup_after_bridge=true,sip_sticky_contact=true,execute_on_answer='lua /opt/freeswitch/storage/script/inbound_queue_answer.lua ${{uuid}} {accountid} {accountno}'}}sofia/internal/sip:{memberextension}@pulse-proxy-3-int.pulsework360.com:5060",
                status=status,
                state="Waiting",
                max_no_answer=3,
                wrap_up_time=0,
                reject_delay_time=5,
                busy_delay_time=5,
                no_answer_delay_time=5,
                last_bridge_start=0,
                last_bridge_end=0,
                last_offered_call=0,
                last_status_change=0,
                no_answer_count=0,
                calls_answered=0,
                talk_time=0,
                ready_time=0,
                external_calls_count=0
            )
            session2.add(Agent)
        await session.commit()
        await session2.commit()
    except IntegrityError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await session2.close()
        await async_engine.dispose()
        await async_engine2.dispose()

async def delete(queuegroupid: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    async_engine2 = get_async_engine_db2(database)
    async_session_maker2 = sessionmaker(async_engine2, expire_on_commit=False, class_=AsyncSession)
    session2 = async_session_maker2()
    try:
        await session.execute(
            Delete(QueueGroups).where(
                QueueGroups.q_queuegroupId == queuegroupid,
                QueueGroups.q_accountId == accountid,
                QueueGroups.q_accountNo == accountno
            )
        )
        await session.commit()
        await session2.execute(
            Delete(Tiers).where(
                Tiers.queue == f"{queuegroupid}@{accountno}"
            )
        )
        await session2.execute(
            Delete(Agents).where(
                Agents.queue == f"{queuegroupid}@{accountno}"
            )
        )
        await session.commit()
        await session2.commit()
    except IntegrityError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session2.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await session2.close()
        await async_engine.dispose()
        await async_engine2.dispose()

async def fetch(limit: int = 1000, offset: int = 0, sortOrder: str = "", sortField: str = "", searchString: str = "", accountid: int = 0, accountno: str = "", database: str = ""):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(
                QueueGroups.q_queuegroupId,
                QueueGroups.q_queuegroupName,
                QueueGroups.q_queuegroupStatus,
                QueueGroups.q_queuegroupStrategy,
                QueueGroups.q_queuegroupTimeout,
                QueueGroups.q_agentwaittime,
                Members.m_memberId,
                Members.m_memberName
            )
            .join(Members, Members.m_memberId == QueueGroups.q_memberId)
            .where(and_(
                    QueueGroups.q_accountId == accountid,
                    QueueGroups.q_accountNo == accountno
            ))
        )
        if searchString:
            recordQuery = recordQuery.where(
                or_(
                    QueueGroups.q_queuegroupId.like(f"%{searchString}%"),
                    QueueGroups.q_queuegroupName.ilike(f"%{searchString}%"),
                    QueueGroups.q_queuegroupStatus.ilike(f"%{searchString}%")
                )
            )
        Records = (await session.execute(recordQuery)).all()
        groupDetails = {}
        for Record in Records:
            groupId = Record.q_queuegroupId
            if groupId not in groupDetails:
                groupDetails[groupId] = {
                    "q_queuegroupId": str(Record.q_queuegroupId),
                    "q_queuegroupName": Record.q_queuegroupName,
                    "q_queuegroupStatus": Record.q_queuegroupStatus,
                    "q_queuegroupStrategy": Record.q_queuegroupStrategy,
                    "q_queuegroupTimeout": Record.q_queuegroupTimeout,
                    "q_agentwaittime": Record.q_agentwaittime,
                    "members": []
                }
            if Record.q_queuegroupStatus == "Inactive":
                groupDetails[groupId]["members"].append({
                    "m_memberId": Record.m_memberId,
                    "m_memberName": Record.m_memberName
                })
        groupDetailsList = list(groupDetails.values())
        if sortField and sortOrder:
            groupDetailsList.sort(
                key=lambda x: x.get(sortField, ""),
                reverse=str(sortOrder).lower() == "desc"
            )
        totalCount = len(groupDetailsList)
        totalRecords = groupDetailsList[offset:offset + limit]
        return {
            "totalRecordsCount": totalCount,
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

async def listMembers(accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Members).where(
            Members.m_accountId == accountid,
            Members.m_accountNo == accountno,
            Members.m_memberRole == "USER"
        )
        result = await session.execute(recordQuery)
        totalRecordsUnserialized = result.scalars().all()
        totalRecords = [MembersModel.from_orm(record).dict() for record in totalRecordsUnserialized]
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

async def getMediaInstances(proxyid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        result = (await session.execute(select(MediaInstances).filter(MediaInstances.m_proxyId == proxyid))).scalars().all()
        return result
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
