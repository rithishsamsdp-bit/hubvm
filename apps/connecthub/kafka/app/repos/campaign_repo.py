from db.context import get_sync_engine, get_async_engine
from sqlalchemy import Delete
from sqlalchemy import Update
from sqlalchemy import select
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import IvrCampaigns, CampaignNumbers, IvrCarriers, IvrFlows, CampaignCarrierPool
from models.dto import IvrCampaignsModel, IvrCampaignNumbersModel, IvrCarriersModel
from fastapi.responses import JSONResponse
from fastapi import status
from datetime import datetime
import pandas as pd
import logging

"""IVR Blast Trigger"""
def fetchNumbers(campaignid: int, ratiolimit: int, database: str) -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        campaign = session.query(
            IvrCampaigns.i_carrierName, 
            IvrCampaigns.i_carrierId, 
            IvrCampaigns.i_campaignName, 
            IvrCampaigns.i_status
        ).filter(IvrCampaigns.i_campaignId == campaignid).first()

        carrier_name = campaign.i_carrierName if campaign else None
        campaignName = campaign.i_campaignName if campaign else None
        camp_status = campaign.i_status if campaign else None
        carrier_id = campaign.i_carrierId if campaign else None
        
        if carrier_id:
            carrier = session.query(IvrCarriers.i_carrierPrefix).filter(
                IvrCarriers.i_carrierId == carrier_id
            ).first()
            carrier_prefix = carrier.i_carrierPrefix if carrier and carrier.i_carrierPrefix is not None else ''
        
        # Fetch records using c_Id
        recordQuery = session.query(CampaignNumbers.c_Id, CampaignNumbers.c_campaignNumber).filter(
            CampaignNumbers.c_campaignId == campaignid,
            CampaignNumbers.c_status == 'pending'
        ).limit(ratiolimit)
        
        totalRecordsUnserialized = recordQuery.all()
        logging.info(f"Fetched {len(totalRecordsUnserialized)} leads for campaign_id: {campaignid}, ratiolimit: {ratiolimit}")
        totalRecords = [
            {
                "c_Id": record.c_Id,
                "c_campaignNumber": record.c_campaignNumber
            } 
            for record in totalRecordsUnserialized
        ]

        if totalRecords:
            session.query(CampaignNumbers).filter(
                CampaignNumbers.c_Id.in_([record["c_Id"] for record in totalRecords])
            ).update({
                CampaignNumbers.c_status: 'active',
                CampaignNumbers.start_time: pd.Timestamp.now()
            }, synchronize_session=False)
            
            if camp_status == 'pending':
                session.execute(Update(IvrCampaigns).where(IvrCampaigns.i_campaignId == campaignid).values({
                    IvrCampaigns.i_ratio: ratiolimit
                }))
            
            session.commit()

        return {
            "totalRecordsCount": len(totalRecords),
            "carrierName": carrier_name,
            "campaignName": campaignName,
            "carrierPrefix": carrier_prefix,
            "totalRecords": totalRecords
        }
    finally:
        session.close()
        sync_engine.dispose()

# async def updateLeadStatus(campaignid: int, lead_number: str, status: str, database: str):
#     async_engine = get_async_engine(database)
#     async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
#     session = async_session_maker()
#     try:
#         result = await session.execute(
#             Update(CampaignNumbers)
#             .where(
#                 CampaignNumbers.c_campaignId == campaignid,
#                 CampaignNumbers.c_campaignNumber == lead_number
#             )
#             .values({CampaignNumbers.c_status: status, CampaignNumbers.end_time: datetime.utcnow()})
#         )
#         rows_affected = result.rowcount
#         if rows_affected > 0:
#             await session.commit()
#             message = "Lead Update Success"
#         else:
#             message = "No matching lead found"

#         await session.close()
#         return {
#             "LeadStatus": message,
#             "SuccessRows": "Success" if rows_affected > 0 else "Failure"
#         }
#     finally:
#         await async_engine.dispose()

async def updateLeadStatus(campaignid: int, lead_number: str, status: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session_maker() as session:  # Use context manager for session handling
        try:
            # Fetch c_Id using lead_number
            stmt = select(CampaignNumbers.c_Id).where(
                CampaignNumbers.c_campaignId == campaignid,
                CampaignNumbers.c_campaignNumber == lead_number
            )
            result = await session.execute(stmt)
            lead = result.scalar()  # Fetch single value

            if not lead:
                print(f"Lead {lead_number} not found in Campaign {campaignid}")
                return

            c_id = lead  # No need for [0], scalar() returns the value directly
            
            # Update lead using c_Id
            update_values = {CampaignNumbers.c_status: status}
            if status == "completed":
                update_values[CampaignNumbers.end_time] = pd.Timestamp.now()  # Set end_time
            
            stmt = (
                Update(CampaignNumbers)
                .where(CampaignNumbers.c_Id == c_id)
                .values(update_values)
            )
            await session.execute(stmt)
            await session.commit()

            return {
                "LeadStatus": "Updated",
                "SuccessRows": "Success"
            }

        except Exception as e:
            print(f"Error updating lead status: {e}")
            await session.rollback()
            return {"error": str(e)}

        finally:
            await async_engine.dispose()  # Clean up engine resources

        
async def resetCampaignLeads(campaignid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        await session.execute(
            Update(CampaignNumbers)
            .where(CampaignNumbers.c_campaignId == campaignid)
            .values({CampaignNumbers.c_status: "pending"})
        )
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

def getCampaignStatus(campaignid: int, database: str) -> str:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        result = session.query(IvrCampaigns.i_status).filter(
            IvrCampaigns.i_campaignId == campaignid
        ).first()
        session.close()
        return result[0] if result else "UNKNOWN"
    finally:
        sync_engine.dispose()

def getRatioCount(campaignid: int, database: str) -> str:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        result = session.query(IvrCampaigns.i_ratio).filter(
            IvrCampaigns.i_campaignId == campaignid
        ).first()
        session.close()
        return result[0] if result else "UNKNOWN"
    finally:
        sync_engine.dispose()

async def updateCampaignStatus(campaign_id: int, status: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()

    try:
        await session.execute(Update(IvrCampaigns).where(IvrCampaigns.i_campaignId == campaign_id).values({
            IvrCampaigns.i_status: status
        }))
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

def getRemainingLeadsCount(campaignid: int, database: str) -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    
    with sync_session_maker() as session:
        try:
            count = session.query(CampaignNumbers).filter(
                CampaignNumbers.c_campaignId == campaignid,
                CampaignNumbers.c_status == 'pending'
            ).count()
            
            # Update campaign status to 'completed' if count is 0
            if count == 0:
                session.query(IvrCampaigns).filter(
                    IvrCampaigns.i_campaignId == campaignid
                ).update({
                    IvrCampaigns.i_status: 'completed'
                }, synchronize_session=False)
                session.commit()

            return {
                "campaign_id": campaignid, 
                "remaining_leads": count
            }
        finally:
            sync_engine.dispose()

""" For IVR Fetching """

def getIvr(campaignid: str, database: str) -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        recordQuery = (
            session.query(
                IvrFlows.i_flowData
            )
            .join(IvrCampaigns, IvrCampaigns.i_flowId == IvrFlows.i_flowId)
            .filter(IvrCampaigns.i_campaignId == campaignid)
        )
        totalRecordsUnserialized = recordQuery.all()
        totalRecords = [
            {
            "i_flowData": record[0]
            }
            for record in totalRecordsUnserialized
        ]
        return totalRecords[0]["i_flowData"]
    finally:
        session.close()
        sync_engine.dispose()

""" For Dynamic Caller ID """

def fetchDynamicCallerIds(campaignid: int, batch_count: int, database: str) -> list:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        query = session.query(CampaignCarrierPool.carrier_name).filter(
            CampaignCarrierPool.campaign_id == campaignid,
            CampaignCarrierPool.status == "active"
        ).limit(batch_count)
        caller_ids = [record.carrier_name for record in query.all()]
        logging.debug(f"Fetched {len(caller_ids)} caller IDs for campaign_id: {campaignid}, batch_count: {batch_count}: {caller_ids}")
        return caller_ids
    finally:
        session.close()
        sync_engine.dispose()

async def updateDynamicCallerIdConfig(campaignid: int, status: str, batch_count: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            await session.execute(
                Update(IvrCampaigns)
                .where(IvrCampaigns.i_campaignId == campaignid)
                .values({
                    IvrCampaigns.i_dynamicCallerIdStatus: status,
                    IvrCampaigns.i_dynamic_callerid_batch_count: batch_count
                })
            )
            await session.commit()
            logging.debug(f"Updated dynamic caller ID config for campaign_id: {campaignid}: status={status}, batch_count={batch_count}")
        except NoSuchColumnError as e:
            logging.error(f"Database schema error for campaign_id: {campaignid}: {e}")
            await session.rollback()
            raise ValueError(f"Missing column in ivr_campaigns table: {e}")
        except Exception as e:
            logging.error(f"Error updating dynamic caller ID config for campaign_id: {campaignid}: {e}")
            await session.rollback()
            raise
        finally:
            await async_engine.dispose()

def getDynamicCallerIdConfig(campaignid: int, database: str) -> dict:
    sync_engine = get_sync_engine(database)
    sync_session_maker = sessionmaker(bind=sync_engine, expire_on_commit=False)
    session = sync_session_maker()
    try:
        result = session.query(
            IvrCampaigns.i_dynamicCallerIdStatus,
            IvrCampaigns.i_dynamic_callerid_batch_count,
            IvrCampaigns.i_last_carrier_index
        ).filter(IvrCampaigns.i_campaignId == campaignid).first()
        session.close()
        if result:
            return {
                "status": result.i_dynamicCallerIdStatus or "disable",
                "batch_count": result.i_dynamic_callerid_batch_count or 0,
                "last_carrier_index": result.i_last_carrier_index or 0
            }
        return {"status": "disable", "batch_count": 0, "last_carrier_index": 0}
    except NoSuchColumnError as e:
        logging.error(f"Database schema error for campaign_id: {campaignid}: {e}")
        return {"status": "disable", "batch_count": 0, "last_carrier_index": 0}
    finally:
        sync_engine.dispose()

async def updateCarrierIndex(campaignid: int, new_index: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            await session.execute(
                Update(IvrCampaigns)
                .where(IvrCampaigns.i_campaignId == campaignid)
                .values({
                    IvrCampaigns.i_last_carrier_index: new_index
                })
            )
            await session.commit()
            logging.debug(f"Updated carrier index for campaign_id: {campaignid}: new_index={new_index}")
        except Exception as e:
            logging.error(f"Error updating carrier index for campaign_id: {campaignid}: {e}")
            await session.rollback()
            raise
        finally:
            await async_engine.dispose()