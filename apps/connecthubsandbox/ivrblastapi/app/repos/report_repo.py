from db.context import get_sync_engine, get_async_engine
from sqlalchemy import Delete
from sqlalchemy import Update
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy import case
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import IvrBlastLogs, IvrCampaigns
from models.dto import IvrBlastLogsModel, IvrCampaignsModel
from fastapi.responses import JSONResponse
from fastapi import status
import pandas as pd

def fetch(database: str, limit: int = 1000, offset: int = 0, searchString: str = "", campaignid:str = "", callDateStartRange:str = "", callDateEndRange:str = "") -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        totalRecordsCountQuery = session.query(IvrBlastLogs).filter()
        recordQuery = session.query(IvrBlastLogs)
        if campaignid:
            recordQuery = recordQuery.filter(IvrBlastLogs.i_campaignId == campaignid)
            totalRecordsCountQuery = totalRecordsCountQuery.filter(IvrBlastLogs.i_campaignId == campaignid)
        if callDateStartRange and callDateEndRange:
            recordQuery = recordQuery.filter(
                IvrBlastLogs.i_callDate.between(callDateStartRange, callDateEndRange)
            )
            totalRecordsCountQuery = totalRecordsCountQuery.filter(
                IvrBlastLogs.i_callDate.between(callDateStartRange, callDateEndRange)
            )
        totalRecordsCount = totalRecordsCountQuery.count()
        if searchString:
            recordQuery = recordQuery.filter(
                or_(
                    IvrBlastLogs.i_campaignName.like(f"%{searchString}%"),
                    IvrBlastLogs.i_source.like(f"%{searchString}%"),
                    IvrBlastLogs.i_destination.like(f"%{searchString}%"),
                    IvrBlastLogs.i_campaignId.like(f"%{searchString}%")
                )
            )
            totalRecordsCount = recordQuery.count()
        totalRecordsUnserialized = recordQuery.limit(limit).offset(offset).all()
        totalRecords = [IvrBlastLogsModel.from_orm(record).dict() for record in totalRecordsUnserialized]
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecords
        }
    finally:
        session.close()
        sync_engine.dispose()

def listCampaign(database: str) -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        recordQuery = session.query(IvrCampaigns).filter()
        totalRecordsUnserialized = recordQuery.all()
        totalRecords = [IvrCampaignsModel.from_orm(record).dict() for record in totalRecordsUnserialized]
        return {
            "totalRecords": totalRecords
        }
    finally:
        session.close()
        sync_engine.dispose()