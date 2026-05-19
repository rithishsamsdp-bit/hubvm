from db.context import get_sync_engine, get_async_engine
from sqlalchemy import Delete
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import VoiceResponses
from models.dto import VoiceResponsesModel
    
async def create(filename: str, database: str, objecturl: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        voiceresponse = VoiceResponses()
        voiceresponse.v_voiceresponseName = filename
        voiceresponse.v_voiceresponseUrl = objecturl
        session.add(voiceresponse)
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

async def delete(voiceresponseid: int, voiceresponsename: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(Delete(VoiceResponses).where(
                and_(
                    VoiceResponses.v_voiceresponseId == voiceresponseid,
                    VoiceResponses.v_voiceresponseName == voiceresponsename
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
        totalRecordsCountQuery = session.query(VoiceResponses).filter()
        totalRecordsCount = totalRecordsCountQuery.count()
        recordQuery = session.query(VoiceResponses).filter()
        if searchString:
            recordQuery = recordQuery.filter(
                or_(
                    VoiceResponses.v_voiceresponseName.like(f"%{searchString}%"),
                    VoiceResponses.v_voiceresponseId.like(f"%{searchString}%")
                )
            )
            totalRecordsCount = recordQuery.count()
        totalRecordsUnserialized = recordQuery.limit(limit).offset(offset).all()
        totalRecords = [VoiceResponsesModel.from_orm(record).dict() for record in totalRecordsUnserialized]
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecords
        }
    finally:
        session.close()
        sync_engine.dispose()

def check(database: str, voiceresponsename: str):
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        existingVoiceResponseName = session.query(VoiceResponses).filter(VoiceResponses.v_voiceresponseName == voiceresponsename).first()
        errors = []
        if existingVoiceResponseName:
            errors.append(f"VoiceResponseName '{voiceresponsename}' already exists.")
        if errors:
            session.close()
            return {"uniqueConstraint":"Yes", "data": errors}
        session.close()
        return {"uniqueConstraint":"No"}
    finally:
        sync_engine.dispose()