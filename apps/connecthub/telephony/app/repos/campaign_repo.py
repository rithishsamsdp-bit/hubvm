from db.context import get_sync_engine, get_async_engine
from sqlalchemy import select, insert, Delete, Update, distinct, literal, or_, and_, func, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import MemberGroups, Campaigns, PRelationalTableCampaignsDidNumberGroups, DidNumberGroup, PRelationalTableCampaignsForm, PForm, MediaInstances
# from models.dto import CampaignsModel
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.dialects import mysql
from models.dto import  CampaignRules  
import uuid
from services import campaign_service
import asyncio
from config import settings
from producer.kafkaproducer import send_message
from datetime import datetime, timedelta

async def create(campaignname: str, membergroupids: List[int], cligroupId: int, formid: int, dialerType: str, campaignRules: CampaignRules ,accountid: int, accountno: str, database: str, p_proxyId: int, p_proxyDirectoryName: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        queuegroupid = uuid.uuid4().int & ((1 << 63) - 1)
        existing_campaign = await session.scalar(
            select(Campaigns.c_campaignId).where(
                Campaigns.c_campaignName == campaignname,
                Campaigns.c_accountId == accountid,
                Campaigns.c_accountNo == accountno
            )
        )
        if existing_campaign:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Campaign name already exists"
            )
        rulesdict = campaignRules.model_dump() if campaignRules else {}
        campaign = Campaigns()
        campaign.c_accountId = accountid
        campaign.c_accountNo = accountno
        campaign.c_campaignName = campaignname
        campaign.c_dialerType = dialerType
        campaign.c_campaignRules = rulesdict
        campaign.c_campaignStatus = "INACTIVE"
        if dialerType == "PREDICTIVE":
            campaign.c_queuegroupId = queuegroupid
        session.add(campaign)
        await session.flush()
        await session.execute(
            insert(MemberGroups).from_select([
                MemberGroups.m_accountId,
                MemberGroups.m_accountNo,
                MemberGroups.m_membergroupId,
                MemberGroups.m_membergroupName,
                MemberGroups.m_membergroupStatus,
                MemberGroups.m_memberId,
                MemberGroups.m_campaignId,
            ],
            select(
                MemberGroups.m_accountId,
                MemberGroups.m_accountNo,
                MemberGroups.m_membergroupId,
                MemberGroups.m_membergroupName,
                literal("Active"),
                MemberGroups.m_memberId,
                literal(campaign.c_campaignId)
            ).where(
                MemberGroups.m_membergroupStatus == "Inactive",
                MemberGroups.m_membergroupId.in_(membergroupids),
                MemberGroups.m_accountId == accountid,
                MemberGroups.m_accountNo == accountno,
            ))
        )
        await session.flush()
        
        session.add(PRelationalTableCampaignsDidNumberGroups(
                rcd_accountId=accountid,
                rcd_accountNo=accountno,
                rcd_campaignsId=campaign.c_campaignId,
                rcd_didnumbergroupsId=cligroupId
            ))
        await session.flush()
        session.add(PRelationalTableCampaignsForm(
            rcf_accountId=accountid,
            rcf_accountNo=accountno,
            rcf_campaignsId=campaign.c_campaignId,
            rcf_formId=formid
        ))
        if dialerType == "PREDICTIVE":
            asyncio.create_task(campaign_service.createXML(queuegroupid, "round-robin",accountno, p_proxyId, p_proxyDirectoryName, settings.ASYNC_CODEX_NAME))
        try:
            await session.commit()
            await session.close()
            return "success"
        except IntegrityError as e:
            await session.rollback()
            await session.close()
            return str(e.orig)
    finally:
        await session.close()
        await async_engine.dispose()

async def update(campaignid: int, campaignname: str, membergroupids: List[int], cligroupId: int, formid: int, campaignRules: CampaignRules, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        existing_campaign = await session.scalar(
        select(Campaigns.c_campaignId).where(
            Campaigns.c_campaignName == campaignname,
            Campaigns.c_accountId == accountid,
            Campaigns.c_accountNo == accountno,
            Campaigns.c_campaignId != campaignid
            )
        )

        if existing_campaign:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Campaign name already exists"
            )
        rulesdict = campaignRules.model_dump() if campaignRules else {}
        await session.execute(Update(Campaigns).where(
            Campaigns.c_accountId == accountid,
            Campaigns.c_accountNo == accountno,
            Campaigns.c_campaignId == campaignid,
        ).values({
            Campaigns.c_campaignName: campaignname,
            Campaigns.c_campaignRules: rulesdict
        }))
        records = await session.execute(
            select(MemberGroups).where(
                MemberGroups.m_membergroupStatus == 'Inactive',
                MemberGroups.m_membergroupId.in_(membergroupids)
            )
        )
        members = records.scalars().all()
        
        await session.execute(
            Delete(MemberGroups).where(
                MemberGroups.m_accountId == accountid,
                MemberGroups.m_accountNo == accountno,
                MemberGroups.m_campaignId == campaignid,
                MemberGroups.m_membergroupStatus == 'Active',
            )
        )
        
        await session.execute(
            Delete(PRelationalTableCampaignsDidNumberGroups).where(
                PRelationalTableCampaignsDidNumberGroups.rcd_campaignsId == campaignid,
                PRelationalTableCampaignsDidNumberGroups.rcd_accountId == accountid,
                PRelationalTableCampaignsDidNumberGroups.rcd_accountNo == accountno,
            )
        )
        
        await session.execute(
            Delete(PRelationalTableCampaignsForm).where(
                PRelationalTableCampaignsForm.rcf_campaignsId == campaignid,
                PRelationalTableCampaignsForm.rcf_accountId == accountid,
                PRelationalTableCampaignsForm.rcf_accountNo == accountno,
            )
        )
        for member in members:
            newRecords = MemberGroups(
                m_accountId=member.m_accountId,
                m_accountNo=member.m_accountNo,
                m_membergroupId=member.m_membergroupId,
                m_membergroupName=member.m_membergroupName,
                m_membergroupStatus='Active',
                m_memberId=member.m_memberId,
                m_campaignId=campaignid
            )
            session.add(newRecords)
        session.add(PRelationalTableCampaignsDidNumberGroups(
            rcd_accountId=accountid,
            rcd_accountNo=accountno,
            rcd_campaignsId=campaignid,
            rcd_didnumbergroupsId=cligroupId
        ))
        session.add(PRelationalTableCampaignsForm(
            rcf_accountId=accountid,
            rcf_accountNo=accountno,
            rcf_campaignsId=campaignid,
            rcf_formId=formid
        ))
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

async def delete(campaignid: int, accountid: int, accountno: str, database: str, p_proxyId: int, p_proxyDirectoryName: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        
        resultstmt = select(Campaigns.c_dialerType, Campaigns.c_queuegroupId).where(
            Campaigns.c_accountId == accountid,
            Campaigns.c_accountNo == accountno,
            Campaigns.c_campaignId == campaignid
        )
        result = await session.execute(resultstmt)

        previouscampaign = result.one_or_none()
        if previouscampaign:
            c_dialerType, c_queuegroupId = previouscampaign
            if c_dialerType == "PREDICTIVE":
                asyncio.create_task(campaign_service.deleteXML(c_queuegroupId, accountno, p_proxyId, p_proxyDirectoryName, settings.ASYNC_CODEX_NAME))
            
        
        await session.execute(
            Delete(Campaigns).where(
                Campaigns.c_campaignId == campaignid,
                Campaigns.c_accountId == accountid,
                Campaigns.c_accountNo == accountno
            )
        )
        await session.execute(
            Delete(MemberGroups).where(
                MemberGroups.m_accountId == accountid,
                MemberGroups.m_accountNo == accountno,
                MemberGroups.m_campaignId == campaignid,
                MemberGroups.m_membergroupStatus == 'Active',
            )
        )
        await session.commit()
        await session.close()
    finally:
        await async_engine.dispose()

# Get a Campaigns with pagination and search
async def fetch(m_accountId: int,m_accountNo: int,accountEncryption: any,m_memberRole: str,sortOrder: str,sortField: str,searchString: str,offset: int,limit: int,):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    sort_mapping = {
        "c_campaignName": Campaigns.c_campaignName,
        "c_campaignId": Campaigns.c_campaignId,
        "m_membergroupName": MemberGroups.m_membergroupName,
        "m_membergroupId": MemberGroups.m_membergroupId,
        "d_didnumbergroupName": DidNumberGroup.d_didnumbergroupName,
        "d_didnumbergroupId": DidNumberGroup.d_didnumbergroupId,
    }

    session = async_session_maker()
    try:
        # ✅ Base query with all campaigns
        base_query = (
            select(
                Campaigns.c_campaignId,
                Campaigns.c_campaignName,
                Campaigns.c_dialerType,
                Campaigns.c_campaignRules,
                Campaigns.c_campaignStatus,
                func.group_concat(MemberGroups.m_membergroupId).label("memberGroupIds"),
                func.group_concat(MemberGroups.m_membergroupName).label("memberGroupNames"),
                PRelationalTableCampaignsDidNumberGroups.rcd_didnumbergroupsId,
                DidNumberGroup.d_didnumbergroupName,
                PRelationalTableCampaignsForm.rcf_formId,
                PForm.f_formName
            )
            .select_from(Campaigns)
            .outerjoin(
                MemberGroups,
                and_(
                    MemberGroups.m_campaignId == Campaigns.c_campaignId,
                    MemberGroups.m_membergroupStatus == "Active",
                ),
            )
            .outerjoin(
                PRelationalTableCampaignsDidNumberGroups,
                PRelationalTableCampaignsDidNumberGroups.rcd_campaignsId == Campaigns.c_campaignId,
            )
            .outerjoin(
                DidNumberGroup,
                DidNumberGroup.d_didnumbergroupId == PRelationalTableCampaignsDidNumberGroups.rcd_didnumbergroupsId,
            )
            .outerjoin(
                PRelationalTableCampaignsForm,
                PRelationalTableCampaignsForm.rcf_campaignsId == Campaigns.c_campaignId,
            )
            .outerjoin(
                PForm,
                PForm.f_formId == PRelationalTableCampaignsForm.rcf_formId,
            )
            .group_by(
                Campaigns.c_campaignId,
                Campaigns.c_campaignName,
                Campaigns.c_campaignStatus,
                PRelationalTableCampaignsDidNumberGroups.rcd_didnumbergroupsId,
                DidNumberGroup.d_didnumbergroupName,
                PRelationalTableCampaignsForm.rcf_formId,
                PForm.f_formName
            )
        )

        # ✅ Apply filters
        filters = []
        if searchString:
            search_filter = or_(
                Campaigns.c_campaignName.ilike(f"%{searchString}%"),
                MemberGroups.m_membergroupName.ilike(f"%{searchString}%"),
                DidNumberGroup.d_didnumbergroupName.ilike(f"%{searchString}%"),
            )
            filters.append(search_filter)
            
        print(f"m_accountNo: {m_accountNo}")
        if m_memberRole != "SUPERADMIN":
            filters.append(Campaigns.c_accountNo == m_accountNo)
            print(f"m_accountNo: {m_accountNo}")
        if filters:
            base_query = base_query.where(and_(*filters))

        # ✅ Sorting
        if sortField and sortOrder:
            column = sort_mapping.get(sortField)
            if column is not None:
                if sortOrder.lower() == "asc":
                    base_query = base_query.order_by(column.asc())
                else:
                    base_query = base_query.order_by(column.desc())

        # ✅ Count query
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await session.execute(count_query)
        recordsTotal = count_result.scalar()

        # ✅ Pagination + execution
        paginated_query = base_query.offset(offset).limit(limit)
        result = await session.execute(paginated_query)
        rows = result.all()

        current_date = datetime.now().date()
        expired_campaign_ids = []

        # ✅ Serialize results
        data = []
        for row in rows:
            campaign_rules = row.c_campaignRules
            campaign_status = row.c_campaignStatus
            campaign_id = row.c_campaignId

            import json
            parsed_rules = campaign_rules
            if isinstance(campaign_rules, str):
                try:
                    parsed_rules = json.loads(campaign_rules)
                except json.JSONDecodeError:
                    parsed_rules = {}

            if campaign_status == "ACTIVE" and isinstance(parsed_rules, dict):
                limits = parsed_rules.get("limits", {})
                start_str = limits.get("startDate")
                end_str = limits.get("endDate")
                lifetime = limits.get("campaignlifetimedays")
                
                try:
                    if start_str:
                        start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                        end_date = None
                        if end_str:
                            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
                        elif lifetime is not None:
                            end_date = start_date + timedelta(days=int(lifetime))
                            
                        if end_date and current_date > end_date:
                            campaign_status = "INACTIVE"
                            expired_campaign_ids.append(campaign_id)
                except ValueError:
                    pass
            
            data.append({
                "campaignId": campaign_id,
                "campaignName": row.c_campaignName,
                "memberGroupId": list(dict.fromkeys(row.memberGroupIds.split(','))) if row.memberGroupIds else [],
                "memberGroupName": list(dict.fromkeys(row.memberGroupNames.split(','))) if row.memberGroupNames else [],
                "didGroupId": row.rcd_didnumbergroupsId,
                "didGroupName": row.d_didnumbergroupName,
                "formid": row.rcf_formId,
                "f_formName":row.f_formName,
                "dialerType": row.c_dialerType,
                "campaignRules": campaign_rules,
                "campaignStatus": campaign_status
            })

        if expired_campaign_ids:
            try:
                await session.execute(
                    Update(Campaigns)
                    .where(Campaigns.c_campaignId.in_(expired_campaign_ids))
                    .values(c_campaignStatus="INACTIVE")
                )
                await session.commit()
            except Exception as e:
                await session.rollback()

        return {
            "recordsTotal": recordsTotal,
            "data": data,
        }

    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    
async def listMemberGroups(m_accountId: int, m_accountNo: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(distinct(MemberGroups.m_membergroupId), MemberGroups.m_membergroupName)
            .where(
                MemberGroups.m_accountId == m_accountId,
                MemberGroups.m_accountNo == m_accountNo,
                MemberGroups.m_membergroupStatus == 'Inactive'
            )
        )

        rows = (await session.execute(recordQuery)).all()
        totalRecords = [
            {"m_membergroupId": str(row[0]), "m_membergroupName": row[1]}
            for row in rows
        ]
        return totalRecords
    except IntegrityError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
        
async def phoneNumberGroup(m_accountId: int, m_accountNo: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(DidNumberGroup.d_didnumbergroupId, DidNumberGroup.d_didnumbergroupName)
            .where(
                DidNumberGroup.d_accountId == m_accountId,
                DidNumberGroup.d_accountNo == m_accountNo
            )
        )

        rows = (await session.execute(recordQuery)).all()
        totalRecords = [
            {"d_didnumbergroupId": row[0], "d_didnumbergroupName": row[1]}
            for row in rows
        ]
        return totalRecords
    except IntegrityError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
        
async def form(m_accountId: int, m_accountNo: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        recordQuery = (
            select(PForm.f_formId, PForm.f_formName)
            .where(
                PForm.f_accountId == m_accountId,
                PForm.f_accountNo == m_accountNo
            )
        )

        rows = (await session.execute(recordQuery)).all()
        totalRecords = [
            {"f_formId": row[0], "f_formName": row[1]}
            for row in rows
        ]
        return totalRecords
    except IntegrityError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def agentcampaign(m_accountId: int, m_accountNo: str, database: str, m_memberId: int):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        print(m_memberId)
        recordQuery = (
            select(MemberGroups.m_memberId, MemberGroups.m_membergroupName, Campaigns.c_campaignName, Campaigns.c_campaignId)
            .join(Campaigns, Campaigns.c_campaignId == MemberGroups.m_campaignId, isouter=True)
            .where(
                MemberGroups.m_membergroupStatus == "Active",
                MemberGroups.m_memberId == m_memberId
            )
        )

        rows = (await session.execute(recordQuery)).all()
        totalRecords = [
            {"m_memberId": row[0], "m_membergroupName": row[1], "c_campaignName":row[2], "c_campaignId":row[3]}
            for row in rows
        ]
        return totalRecords
    except IntegrityError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        await session.close()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

# async def campaignGetEdit(campaignid: int, accountid: int, accountno: str, database: str):
#     async_engine = get_async_engine(database)
#     async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
#     session = async_session_maker()
#     try:
#         await session.execute(
#             Delete(Campaigns).where(
#                 Campaigns.c_campaignId == campaignid,
#                 Campaigns.c_accountId == accountid,
#                 Campaigns.c_accountNo == accountno
#             )
#         )
#         await session.execute(
#             Delete(MemberGroups).where(
#                 MemberGroups.m_accountId == accountid,
#                 MemberGroups.m_accountNo == accountno,
#                 MemberGroups.m_campaignId == campaignid,
#                 MemberGroups.m_membergroupStatus == 'Active',
#             )
#         )
#         await session.commit()
#         await session.close()
#     finally:
#         await async_engine.dispose()

async def campaignGetEdit(campaignid: int, accountid: int, accountno: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session_maker() as session:
        try:
            sql = text("""
                SELECT c.c_campaignName, c.c_campaignId,c.c_dialerType,c.c_campaignRules, d.d_didnumbergroupName, d.d_didnumbergroupId, f.f_formName, f.f_formId, GROUP_CONCAT(DISTINCT m.m_membergroupName) AS memberGroupNames, GROUP_CONCAT(DISTINCT m.m_membergroupId)   AS memberGroupIds FROM p_campaigns c LEFT JOIN p_relationaltable_campaigns_form rcf ON c.c_campaignId = rcf.rcf_campaignsId LEFT JOIN p_form f ON rcf.rcf_formId = f.f_formId LEFT JOIN p_relationaltable_campaigns_didnumbergroups rcd ON rcd.rcd_campaignsId = c.c_campaignId LEFT JOIN p_didnumbergroups d ON d.d_didnumbergroupId = rcd.rcd_didnumbergroupsId LEFT JOIN p_membergroups m ON m.m_campaignId = c.c_campaignId WHERE c.c_campaignId = :campaignid AND c.c_accountId = :accountid AND c.c_accountNo = :accountno GROUP BY c.c_campaignId, d.d_didnumbergroupId, f.f_formId;
            """)
            print(sql)
            result = await session.execute(sql, {"campaignid": campaignid, "accountid": accountid, "accountno": accountno})
            rows = result.fetchall()
            data = []
            for row in rows:

                member_names = row.memberGroupNames.split(",") if row.memberGroupNames else []
                member_ids = [str(x) for x in row.memberGroupIds.split(",")] if row.memberGroupIds else []

                data.append({
                    "campaignName": row.c_campaignName,
                    "campaignId": row.c_campaignId,
                    "didGroupName": row.d_didnumbergroupName,
                    "didGroupId": row.d_didnumbergroupId,
                    "formName": row.f_formName,
                    "formId": row.f_formId,
                    "dialerType": row.c_dialerType,
                    "campaignRules": row.c_campaignRules,
                    "memberGroupNames": member_names,
                    "memberGroupIds": member_ids,
                })

            return {"status": "success", "data": data}

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        finally:
            await async_engine.dispose()

async def getMediaInstances(proxyid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        result = (await session.execute(select(MediaInstances).filter(MediaInstances.m_proxyId == proxyid))).scalars().all()
        return result
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

async def campaignstart(accountEncryption: str, m_accountId: str, m_accountNo: str, campid: int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            await session.execute(
                Update(Campaigns)
                .where(Campaigns.c_campaignId == campid)
                .values(c_campaignStatus="ACTIVE")
            )
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        finally:
            await async_engine.dispose()

    data = {
        "event_type": "DIAL_START",
        "accountid": m_accountId,
        "campaign_id": campid
    }
    return await send_message("dialer.dial_start", str(campid), data)

async def campaignstop(accountEncryption: str, m_accountId: str, m_accountNo: str, campid: int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            await session.execute(
                Update(Campaigns)
                .where(Campaigns.c_campaignId == campid)
                .values(c_campaignStatus="INACTIVE")
            )
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        finally:
            await async_engine.dispose()

    data = {
        "event_type": "DIAL_STOP",
        "accountid": m_accountId,
        "campaign_id": campid
    }
    return await send_message("dialer.dial_stop", str(campid), data)

async def getPredictiveStats(account_id: int, campaign_id: Optional[int] = None):
    async_engine = get_async_engine(settings.ASYNC_CODEX_NAME)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session_maker() as session:
        try:
            # We always join with p_campaigns to get the name
            base_query = """
                SELECT pcs.*, pc.c_campaignName as campaignName
                FROM p_predictiveCampaignStats pcs
                JOIN p_campaigns pc ON pcs.p_predictiveCampaignId = pc.c_campaignId
                WHERE pcs.p_predictiveaccountid = :account_id
            """
            
            if campaign_id:
                query = text(base_query + " AND pcs.p_predictiveCampaignId = :campaign_id")
                result = await session.execute(query, {"account_id": account_id, "campaign_id": campaign_id})
                return result.mappings().first()
            else:
                query = text(base_query)
                result = await session.execute(query, {"account_id": account_id})
                return result.mappings().all()
        except Exception as e:
            print(f"Error fetching predictive stats: {e}")
            return None
        finally:
            await async_engine.dispose()