from db.context import  get_async_engine, get_redis_client_by_db
from models.db import Campaigns
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException

async def getcampaigndetails(campaign_id: int, account_id: int ,database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        stmt = select(Campaigns).where(Campaigns.c_campaignId == campaign_id,Campaigns.c_accountId == account_id)
        result = await session.execute(stmt)
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return campaign
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