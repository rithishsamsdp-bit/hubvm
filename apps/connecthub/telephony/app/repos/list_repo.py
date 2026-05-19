from sqlalchemy import select, and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import get_async_engine
from models.db import ProxyInstances, QueueGroups, Locations, LocationGroups, Members

async def ListProxies(database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(ProxyInstances)
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        return totalRecordsUnserialized
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

async def ListQueueGroups(accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(QueueGroups.q_queuegroupId, QueueGroups.q_queuegroupName).where(
            QueueGroups.q_accountId == accountid,
            QueueGroups.q_accountNo == accountno
        ).distinct()
        result = await session.execute(recordQuery)
        totalRecordsUnserialized = [
            {"q_queuegroupId": str(row.q_queuegroupId), "q_queuegroupName": row.q_queuegroupName}
            for row in result.all()
        ]
        return totalRecordsUnserialized
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

        
async def listLocations(accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(
                Locations.l_locationId,
                Locations.l_locationName,
                Members.m_memberId,
                Members.m_memberName
            )
            .select_from(Locations)
            .outerjoin(LocationGroups, Locations.l_locationId == LocationGroups.l_locationId)
            .outerjoin(Members, Members.m_memberId == LocationGroups.l_memberId)
            .where(and_(
                Locations.l_accountId == accountid,
                Locations.l_accountNo == accountno
            ))
        )
        Records = (await session.execute(recordQuery)).all()
        locationDetails = {}
        for Record in Records:
            locationId = Record.l_locationId
            if locationId not in locationDetails:
                locationDetails[locationId] = {
                    "l_locationId": str(Record.l_locationId),
                    "l_locationName": Record.l_locationName,
                    "members": []
                }
            if Record.m_memberId is not None:
                locationDetails[locationId]["members"].append({
                    "m_memberId": Record.m_memberId,
                    "m_memberName": Record.m_memberName
                })
        locationDetailsList = list(locationDetails.values())
        return locationDetailsList
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