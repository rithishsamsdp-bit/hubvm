from sqlalchemy import select, cast, Integer, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import get_async_engine
from models.db import Members, LiveMonitoring
from models.dto import MembersModel

async def listMembers(accountid: int, accountno: str, memberextensionno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        stmt = (select(LiveMonitoring, Members).join(Members,cast(func.trim(LiveMonitoring.l_memberExtention), Integer)== Members.m_memberExtensionNo, isouter=True).where(LiveMonitoring.l_memberStatus == 'AVAILABLE',LiveMonitoring.l_memberAccountId == accountid))

        result = await session.execute(stmt)
        rows = result.all()

        data = []
        for lm, m in rows:
            data.append({
                "m_memberId": m.m_memberId if m else None,
                "m_memberName": m.m_memberName if m else None,
                "m_memberExtensionNo": m.m_memberExtensionNo if m else None
            })

        return data
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

async def getMemberFCMToken(memberextensionno: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()

    try:
        recordQuery = select(Members.m_memberFCMToken, Members.m_memberOSType).where(Members.m_memberExtensionNo == memberextensionno)
        result = await session.execute(recordQuery)
        row = result.one_or_none()
        if row:
            fcm_token, os_type = row
            return {
                "fcmtoken": fcm_token,
                "ostype": os_type
            }
        return None

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
