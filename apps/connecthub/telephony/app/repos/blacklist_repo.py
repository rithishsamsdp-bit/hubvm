from db.context import get_sync_engine, get_async_engine
from sqlalchemy import Update, select, delete as sqlalchemy_delete,func
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from models.db import BlockList
from models.dto import BlockListList
from sqlalchemy import update as sqlalchemy_update
from typing import Optional,List
from fastapi import HTTPException

async def create(p_blacklistAccountId, p_blacklistAccountNO, p_blacklistNo: int, p_blacklistDescription: str, p_blacklistCalltype: str, p_blacklistStatus: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        # Check if the same greeting name exists for the same account
        stmt = select(BlockList).where(
            BlockList.p_blacklistAccountNO == p_blacklistAccountNO,
            BlockList.p_blacklistNo == p_blacklistNo
        )

        result = await session.execute(stmt)
        existing = result.first()

        if existing:
            raise HTTPException(status_code=400,detail="Given number is already exists")
        
        blacklist = BlockList()
        blacklist.p_blacklistAccountId = p_blacklistAccountId
        blacklist.p_blacklistAccountNO = p_blacklistAccountNO
        blacklist.p_blacklistNo = p_blacklistNo
        blacklist.p_blacklistDescription = p_blacklistDescription
        blacklist.p_blacklistCalltype = p_blacklistCalltype
        blacklist.p_blacklistStatus = p_blacklistStatus
        session.add(blacklist)
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



async def fetch_blacklist_by_id(p_blacklistId: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        result = await session.execute(select(BlockList).where(and_(BlockList.p_blacklistId == p_blacklistId)))
        blacklist = result.scalars().first()
        await session.close()
        
        if blacklist:
            return {
                "p_blacklistAccountId": blacklist.p_blacklistAccountId,
                "p_blacklistAccountNO": blacklist.p_blacklistAccountNO,
                "p_blacklistNo": blacklist.p_blacklistNo,
                "p_blacklistDescription": blacklist.p_blacklistDescription,
                "p_blacklistCalltype": blacklist.p_blacklistCalltype,
                "p_blacklistStatus": blacklist.p_blacklistStatus
            }
        return None
    finally:
        await async_engine.dispose()



async def update(p_blacklistId: int, p_blacklistNo: int, p_blacklistDescription: str, p_blacklistCalltype: str, p_blacklistStatus: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session_maker() as session:
            # ✅ Check for existing p_blacklistNo in other records
            result = await session.execute(
                select(BlockList).where(
                    BlockList.p_blacklistNo == p_blacklistNo,
                    BlockList.p_blacklistId != p_blacklistId
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                raise HTTPException(status_code=400, detail="Mobile number already exists")

            # ✅ Proceed with update
            await session.execute(
                sqlalchemy_update(BlockList)
                .where(BlockList.p_blacklistId == p_blacklistId)
                .values(
                    p_blacklistId=p_blacklistId,
                    p_blacklistNo=p_blacklistNo,
                    p_blacklistDescription=p_blacklistDescription,
                    p_blacklistCalltype=p_blacklistCalltype,
                    p_blacklistStatus=p_blacklistStatus
                )
            )
            await session.commit()

    except IntegrityError:
        await async_engine.dispose()
        raise HTTPException(status_code=400, detail="Duplicate mobile number not allowed")

    await async_engine.dispose()



async def delete(p_blacklistId: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(sqlalchemy_delete(BlockList).where(
                and_(
                    BlockList.p_blacklistId == p_blacklistId
                )
            )
        )
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

async def getBlackList(accountEncryption, accountId, limit, offset, searchString, sortField, sortOrder):
    async_engine = get_async_engine(accountEncryption)
    session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = session_maker()

    try:
        # FILTER BY ACCOUNT ID
        base_query = select(BlockList).where(
            BlockList.p_blacklistAccountId == accountId
        )

        # Search
        if searchString:
            base_query = base_query.where(
                or_(
                    BlockList.p_blacklistId.like(f"%{searchString}%"),
                    BlockList.p_blacklistAccountId.like(f"%{searchString}%"),
                    BlockList.p_blacklistAccountNO.like(f"%{searchString}%"),
                    BlockList.p_blacklistNo.like(f"%{searchString}%"),
                    BlockList.p_blacklistDescription.like(f"%{searchString}%"),
                    BlockList.p_blacklistCalltype.like(f"%{searchString}%"),
                    BlockList.p_blacklistStatus.like(f"%{searchString}%")
                )
            )

        # Sorting
        if sortField and sortOrder:
            order_clause = getattr(getattr(BlockList, sortField), sortOrder.lower())()
            base_query = base_query.order_by(order_clause)

        # Count
        count_query = select(func.count()).select_from(base_query.subquery())
        total = (await session.execute(count_query)).scalar()

        # Pagination
        result = await session.execute(base_query.offset(offset).limit(limit))
        rows = result.scalars().all()

        return {
            "recordsTotal": total,
            "data": [BlockListList.from_orm(r).model_dump(mode="json") for r in rows]
        }

    finally:
        await async_engine.dispose()