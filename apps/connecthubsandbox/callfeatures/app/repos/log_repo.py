from sqlalchemy import Delete, Update, select, func, or_, and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import  asyncSessionFactory
from models.db import CdrLogs

async def logCDR(callid: str, accountid: int, accountno: str, campaignid: int, campaignname: str, clinumberid: int, clinumbername: str, source: str, destination: str, calldisposition: str, agentdisposition: str, direction: str, calldatetime: str, starttime: str, endtime: str, answertime: str, duration: int, billsec: int, hangupby: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            CdrLog = CdrLogs(
                c_callId = callid,
                c_accountId = accountid,
                c_accountNo = accountno,
                c_campaignId = campaignid,
                c_campaignName = campaignname,
                c_clinumberId = clinumberid,
                c_clinumberName = clinumbername,
                c_source = source,
                c_destination = destination,
                c_calldisposition = calldisposition,
                c_agentdisposition = agentdisposition,
                c_direction = direction,
                c_callDateTime = calldatetime,
                c_startTime = starttime,
                c_endTime = endtime,
                c_answerTime = answertime,
                c_duration = duration,
                c_billsec = billsec,
                c_hangupBy = hangupby
            )
            session.add(CdrLog)
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
