from db.context import get_sync_session_maker, get_async_session_maker, get_sync_engine, get_async_engine
from sqlalchemy import Delete
from sqlalchemy import Update
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import IvrFlows, VoiceResponses
from models.dto import IvrFlowsModel, VoiceResponsesModel
    
async def create(flowname: str, flowdata: dict, floworgdata: dict, floworgposition: dict, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        ivrflow = IvrFlows()
        ivrflow.i_flowName = flowname
        ivrflow.i_flowData = flowdata
        ivrflow.i_flowOData = floworgdata
        ivrflow.i_flowOPosition = floworgposition
        session.add(ivrflow)
        try:
            await session.commit()
            await session.close()
            return "success"
        except IntegrityError as e:
            await session.rollback()
            await session.close()
            return str(e.orig)
    finally:
        await async_engine.dispose()

async def update(flowid: int, flowname: str, flowdata: dict, floworgdata: dict, floworgposition: dict, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(Update(IvrFlows).where(IvrFlows.i_flowId == flowid).values({
            IvrFlows.i_flowName: flowname,
            IvrFlows.i_flowData: flowdata,
            IvrFlows.i_flowOData: floworgdata,
            IvrFlows.i_flowOPosition: floworgposition
        }))
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

async def delete(flowid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(Delete(IvrFlows).where(
                and_(
                    IvrFlows.i_flowId == flowid
                )
            )
        )
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

def fetch(database: str, limit:int = 1000, offset: int = 0, searchString: str = "") -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        totalRecordsCountQuery = session.query(IvrFlows).filter()
        totalRecordsCount = totalRecordsCountQuery.count()
        recordQuery = session.query(IvrFlows).filter()
        if searchString:
            recordQuery = recordQuery.filter(
                or_(
                    IvrFlows.i_flowId.like(f"%{searchString}%")
                )
            )
            totalRecordsCount = recordQuery.count()
        totalRecordsUnserialized = recordQuery.limit(limit).offset(offset).all()
        totalRecords = [IvrFlowsModel.from_orm(record).dict() for record in totalRecordsUnserialized]
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecords
        }
    finally:
        session.close()
        sync_engine.dispose()

def listVR(database: str) -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        recordQuery = session.query(VoiceResponses).filter()
        totalRecordsUnserialized = recordQuery.all()
        totalRecords = [VoiceResponsesModel.from_orm(record).dict() for record in totalRecordsUnserialized]
        return {
            "totalRecords": totalRecords
        }
    finally:
        session.close()
        sync_engine.dispose()

def check(database: str, flow_name: str):
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        existingFlowName = session.query(IvrFlows).filter(IvrFlows.i_flowName == flow_name).first()
        errors = []
        if existingFlowName:
            errors.append(f"FlowName '{flow_name}' already exists.")
        if errors:
            session.close()
            return {"uniqueConstraint":"Yes", "data": errors}
        session.close()
        return {"uniqueConstraint":"No"}
    finally:
        sync_engine.dispose()