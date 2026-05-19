from db.context import get_sync_engine, get_async_engine
from sqlalchemy import Delete
from sqlalchemy import Update, select
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import IvrCarriers
from models.dto import IvrCarriersModel

async def create(carriername: str, carriersecret: str, carrierhost: str, carrierport: int, carrierprefix: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        ivrcarrier = IvrCarriers()
        ivrcarrier.i_carrierName = carriername
        ivrcarrier.i_carrierSecret = carriersecret
        ivrcarrier.i_carrierHost = carrierhost
        ivrcarrier.i_carrierPort = carrierport
        ivrcarrier.i_carrierPrefix = carrierprefix
        session.add(ivrcarrier)
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

async def update(carrierid: int, carriername: str, carriersecret: str, carrierhost: str, carrierport: int, carrierprefix: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(Update(IvrCarriers).where(IvrCarriers.i_carrierId == carrierid).values({
            IvrCarriers.i_carrierName: carriername,
            IvrCarriers.i_carrierSecret: carriersecret,
            IvrCarriers.i_carrierHost: carrierhost,
            IvrCarriers.i_carrierPort: carrierport,
            IvrCarriers.i_carrierPrefix: carrierprefix
        }))
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

async def delete(carrierid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(Delete(IvrCarriers).where(
                and_(
                    IvrCarriers.i_carrierId == carrierid
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
        totalRecordsCountQuery = session.query(IvrCarriers).filter()
        totalRecordsCount = totalRecordsCountQuery.count()
        recordQuery = session.query(IvrCarriers).filter()
        if searchString:
            recordQuery = recordQuery.filter(
                or_(
                    IvrCarriers.i_carrierId.like(f"%{searchString}%"),
                    IvrCarriers.i_carrierName.like(f"%{searchString}%"),
                    IvrCarriers.i_carrierSecret.like(f"%{searchString}%"),
                    IvrCarriers.i_carrierHost.like(f"%{searchString}%"),
                    IvrCarriers.i_carrierPort.like(f"%{searchString}%")
                )
            )
            totalRecordsCount = recordQuery.count()
        totalRecordsUnserialized = recordQuery.limit(limit).offset(offset).all()
        totalRecords = [IvrCarriersModel.from_orm(record).dict() for record in totalRecordsUnserialized]
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecords
        }
    finally:
        session.close()
        sync_engine.dispose()

async def fetch_carrier_by_id(carrierid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        result = await session.execute(
            select(IvrCarriers).where(
                and_(
                    IvrCarriers.i_carrierId == carrierid
                )
            )
        )
        carrier = result.scalars().first()
        await session.close()
        
        if carrier:
            return {
                "carriername": carrier.i_carrierName,
                "carriersecret": carrier.i_carrierSecret,
                "carrierhost": carrier.i_carrierHost,
                "carrierport": carrier.i_carrierPort,
                "carrierprefix": carrier.i_carrierPrefix
            }
        return None
    finally:
        await async_engine.dispose()

def check(database: str, carriername: str):
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        existingCarrierName = session.query(IvrCarriers).filter(IvrCarriers.i_carrierName == carriername).first()
        errors = []
        if existingCarrierName:
            errors.append(f"CarrierName '{carriername}' already exists.")
        if errors:
            session.close()
            return {"uniqueConstraint":"Yes", "data": errors}
        session.close()
        return {"uniqueConstraint":"No"}
    finally:
        sync_engine.dispose()