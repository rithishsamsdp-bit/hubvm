from sqlalchemy import select, Delete, Update, String, or_, and_, func, desc, cast, case, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import get_async_engine, asyncSessionFactory, asyncClientFactory
from models.db import Notifications, Members

async def createNotification(notificationtype: str, notificationdata: dict, notificationtime: str, memberid: int, memberextensionno: int, accountid: int, accountno: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            Notification = Notifications(
                n_accountId = accountid,
                n_accountNo = accountno,
                n_notificationType = notificationtype,
                n_notificationData = notificationdata,
                n_notificationTime = notificationtime,
                n_memberId = memberid,
                n_memberExtensionNo = str(memberextensionno)
            )
            session.add(Notification)
            await session.commit()
            await session.refresh(Notification)
            return Notification.n_notificationId
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def listNotification(memberextensionno: str, notificationtypes: list, offset: int, limit: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Notifications).where(
            or_(
                Notifications.n_memberExtensionNo == memberextensionno,
                Notifications.n_memberExtensionNo.is_(None),
                Notifications.n_memberExtensionNo == ""
            ),
            Notifications.n_accountId == accountid,
            Notifications.n_accountNo == accountno,
            Notifications.n_notificationType.in_(notificationtypes),
            Notifications.n_notificationStatus != 'DISMISSED'
        ).order_by(desc(Notifications.n_createdOn)).offset(offset).limit(limit)
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

async def statusupdateNotification(notificationids: list[int], notificationstatus: str, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            update(Notifications)
            .where(Notifications.n_notificationId.in_(notificationids))
            .values(n_notificationStatus=notificationstatus)
        )
        await session.execute(recordQuery)
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

async def listMembers(accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = select(Members.m_memberExtensionNo).where(
            Members.m_accountId == accountid,
            Members.m_accountNo == accountno,
            Members.m_memberRole == "USER"
        )
        result = await session.execute(recordQuery)
        extension_numbers = result.scalars().all()
        return extension_numbers
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