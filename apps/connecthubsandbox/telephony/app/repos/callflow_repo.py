from sqlalchemy import Delete, Update, select, func, or_, and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from db.context import  get_async_engine
from models.db import CallFlows, QueueGroups
from models.dto import CallFlowsModel

async def create(callflowname: str, callflowdata: dict, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        duplicate = (await session.execute(
            select(CallFlows).filter(
                CallFlows.c_callflowName == callflowname,
                CallFlows.c_accountId == accountid,
                CallFlows.c_accountNo == accountno
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{callflowname}' already exists.")
        CallFlow = CallFlows(
            c_accountId=accountid,
            c_accountNo=accountno,
            c_callflowName=callflowname,
            c_callflowData=callflowdata
        )
        session.add(CallFlow)
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

async def update(callflowid: int, callflowname: str, callflowdata: dict, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        duplicate = (await session.execute(
            select(CallFlows).filter(
                CallFlows.c_accountId == accountid,
                CallFlows.c_accountNo == accountno,
                CallFlows.c_callflowName == callflowname,
                CallFlows.c_callflowId != callflowid
            )
        )).scalars().first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Duplication Error, '{callflowname}' already exists.")
        await session.execute(Update(CallFlows).where(
            CallFlows.c_callflowId == callflowid,
        ).values({
            CallFlows.c_accountId: accountid,
            CallFlows.c_accountNo: accountno,
            CallFlows.c_callflowName: callflowname,
            CallFlows.c_callflowData: callflowdata
        }))
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

async def delete(callflowid: int, accountid: int, accountno: str, database:str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(
            Delete(CallFlows).where(
                CallFlows.c_callflowId == callflowid
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

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(
            CallFlows.c_callflowId,
            CallFlows.c_callflowName,
            CallFlows.c_callflowData
        ).where(and_(
            CallFlows.c_accountId == accountid,
            CallFlows.c_accountNo == accountno
        ))
        if searchString:
            recordQuery = recordQuery.where(
                or_(
                    CallFlows.c_callflowId.ilike(f"%{searchString}%"),
                    CallFlows.c_callflowName.ilike(f"%{searchString}%")
                )
            )
        if sortField and sortOrder:
            recordQuery = recordQuery.order_by(getattr(getattr(CallFlows, sortField), sortOrder.lower())())
        totalRecordsCountQuery = select(func.count()).select_from(recordQuery.subquery())
        totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar_one()
        totalRecordsUnserialized = (await session.execute(recordQuery.offset(offset).limit(limit))).all()
        totalRecords = [CallFlowsModel.from_orm(record).dict() for record in totalRecordsUnserialized]
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

async def getCallFlow(callflowid: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(CallFlows).where(
            CallFlows.c_callflowId == callflowid,
            CallFlows.c_accountId == accountid,
            CallFlows.c_accountNo == accountno
        )
        totalRecordsUnserialized = (await session.execute(recordQuery)).scalars().all()
        totalRecords = [CallFlowsModel.from_orm(record).dict() for record in totalRecordsUnserialized]
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


async def listQueueGroups(accountid: int, accountno: str, database: str):
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
            {"q_queuegroupId": row.q_queuegroupId, "q_queuegroupName": row.q_queuegroupName}
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