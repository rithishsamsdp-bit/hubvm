from sqlalchemy import select, Delete, Update, or_, and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import get_async_engine
from models.db import MemberGroups, Members, Campaigns
from models.dto import MembersModel
from typing import List

async def create(membergroupid: int, membergroupname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        duplicate = (await session.execute(
            select(MemberGroups).filter(
                MemberGroups.m_membergroupName == membergroupname
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{membergroupname}' already exists.")
        for memberid in memberids:
            MemberGroup = MemberGroups(
                m_accountId = accountid,
                m_accountNo = accountno,
                m_membergroupId = membergroupid,
                m_membergroupName = membergroupname,
                m_membergroupStatus = "Inactive",
                m_memberId = memberid,
                m_campaignId = 0
            )
            session.add(MemberGroup)
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
    finally:
        await session.close()
        await async_engine.dispose()

async def update(oldmembergroupid: int, newmembergroupid: int, membergroupname: str, memberids: List[int], accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        duplicate = (await session.execute(
            select(MemberGroups).filter(
                MemberGroups.m_membergroupName == membergroupname,
                MemberGroups.m_membergroupId != oldmembergroupid
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{membergroupname}' already exists.")
        records = await session.execute(
            select(MemberGroups.m_campaignId).distinct().where(
                MemberGroups.m_membergroupId == oldmembergroupid,
                MemberGroups.m_accountId == accountid,
                MemberGroups.m_accountNo == accountno
            )
        )
        campaignids = [record[0] for record in records.fetchall()]
        await session.execute(
            Delete(MemberGroups).where(
                MemberGroups.m_membergroupId == oldmembergroupid,
                MemberGroups.m_accountId == accountid,
                MemberGroups.m_accountNo == accountno,
                MemberGroups.m_campaignId.in_(campaignids)
            )
        )
        MemberGroup = [
            MemberGroups(
                m_accountId=accountid,
                m_accountNo=accountno,
                m_membergroupId=newmembergroupid,
                m_membergroupName=membergroupname,
                m_membergroupStatus="Inactive" if campaignid == 0 else "Active",
                m_memberId=memberid,
                m_campaignId=campaignid,
            )
            for campaignid in campaignids
            for memberid in memberids
        ]
        session.add_all(MemberGroup)
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
    finally:
        await session.close()
        await async_engine.dispose()

async def delete(membergroupid: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(
            Delete(MemberGroups).where(
                MemberGroups.m_membergroupId == membergroupid,
                MemberGroups.m_accountId == accountid,
                MemberGroups.m_accountNo == accountno
            )
        )
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
    finally:
        await session.close()
        await async_engine.dispose()

async def fetch(limit: int = 1000, offset: int = 0, sortOrder: str = "", sortField: str = "", searchString: str = "", accountid: int = 0, accountno: str = "", database: str = ""):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(
                MemberGroups.m_membergroupId,
                MemberGroups.m_membergroupName,
                MemberGroups.m_membergroupStatus,
                Members.m_memberId,
                Members.m_memberName,
                MemberGroups.m_campaignId,
                Campaigns.c_campaignName
            )
            .join(Members, Members.m_memberId == MemberGroups.m_memberId)
            .outerjoin(Campaigns, Campaigns.c_campaignId == MemberGroups.m_campaignId)
            .where(and_(
                    MemberGroups.m_accountId == accountid,
                    MemberGroups.m_accountNo == accountno
            ))
        )
        if searchString:
            recordQuery = recordQuery.where(
                or_(
                    MemberGroups.m_membergroupId.like(f"%{searchString}%"),
                    MemberGroups.m_membergroupName.ilike(f"%{searchString}%"),
                    MemberGroups.m_membergroupStatus.ilike(f"%{searchString}%")
                )
            )
        Records = (await session.execute(recordQuery)).all()
        groupDetails = {}
        for Record in Records:
            groupId = Record.m_membergroupId
            if groupId not in groupDetails:
                groupDetails[groupId] = {
                    "m_membergroupId": str(Record.m_membergroupId),
                    "m_membergroupName": Record.m_membergroupName,
                    "m_membergroupStatus": Record.m_membergroupStatus,
                    "campaignNames": set(),
                    "members": []
                }
            if Record.m_membergroupStatus == "Inactive":
                groupDetails[groupId]["members"].append({
                    "m_memberId": Record.m_memberId,
                    "m_memberName": Record.m_memberName
                })
            if Record.m_campaignId:
                groupDetails[groupId]["m_membergroupStatus"] = 'Active'
                if Record.c_campaignName is not None:
                    groupDetails[groupId]["campaignNames"].add(Record.c_campaignName)
        for group in groupDetails.values():
            group["campaignNames"] = sorted([c for c in group["campaignNames"] if c is not None])
        groupDetailsList = list(groupDetails.values())
        if sortField and sortOrder:
            groupDetailsList.sort(
                key=lambda x: str(x.get(sortField) or ""),
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
