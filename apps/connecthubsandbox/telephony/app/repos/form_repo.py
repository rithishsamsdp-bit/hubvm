from db.context import  get_async_engine, get_redis_client_by_db
from sqlalchemy import Delete
from sqlalchemy import Update, select,func, text
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from models.db import PForm, Accounts, PRelationalTableCampaignsForm
from fastapi import HTTPException
from sqlalchemy.exc import  SQLAlchemyError
import json
from fastapi import  status
from fastapi.responses import JSONResponse, StreamingResponse
from models.dto import  FormList, FormListName
from typing import Optional
from models.db import Campaigns
import csv
from io import StringIO
import io


async def ensure_default_campaign_form(
    accountEncryption: str, 
    m_accountId: int, 
    m_accountNo: str, 
    f_formPayload: dict = None,
    f_formcolumnName: str = "Notes, Disposition"
):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    
    try:
        # Force MySQL to accept 0 as ID
        await session.execute(text("SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'"))
        
        # 1. Check/Create Campaign 0 ("Individual")
        stmt_camp = select(Campaigns).where(Campaigns.c_campaignId == 0)
        result_camp = await session.execute(stmt_camp)
        campaign = result_camp.scalar_one_or_none()
        
        if not campaign:
            # Create Campaign 0
            new_campaign = Campaigns(
                c_campaignId=0,
                c_accountId=m_accountId,
                c_accountNo=m_accountNo,
                c_campaignName="Individual",
                c_campaignStatus="Active"
            )
            session.add(new_campaign)
            # We might need to flush to ensure it's there before FK usage? 
            # But usually commit handles it. However, since we are adding dependent records in same transaction, flush is good.
            # But wait, if we are in async, we should be careful. 
            # If we don't commit, the FK check might fail if it's deferred? 
            # Safest is flush.
            await session.flush()
            
        # 2. Check/Create Form "default"
        stmt_form = select(PForm).where(
            PForm.f_formName == "Followup",
            PForm.f_accountId == m_accountId  # Ensure it matches the account
        )
        result_form = await session.execute(stmt_form)
        form = result_form.scalars().first()
        
        if not form:
            if not f_formPayload:
                # Fallback payload if not provided (should be provided by caller ideally, or hardcoded default)
                f_formPayload = {
                    "formTitle": "Followup",
                    "elements": [
                        {
                            "id": "0",
                            "type": "Single Line Text field",
                            "label": "Notes",
                            "required": False,
                            "minChar": False,
                            "maxChar": False,
                            "layout": {"x": 0, "y": 0, "w": 4, "h": 3, "minW": 2, "maxW": 12, "minH": 2, "maxH": 6}
                        },
                        {
                            "id": "1",
                            "type": "Single Line Text field",
                            "label": "Disposition",
                            "required": False,
                            "minChar": False,
                            "maxChar": False,
                            "layout": {"x": 4, "y": 0, "w": 4, "h": 3, "minW": 2, "maxW": 12, "minH": 2, "maxH": 6}
                        }
                    ]
                }
            csvformStructure = await getformcsvstructure(f_formPayload)
            form = PForm(
                f_accountId=m_accountId,
                f_accountNo=m_accountNo,
                f_formName="Followup",
                f_formPayload=f_formPayload,
                f_formCsvTemplate=csvformStructure,
                f_formcolumnName=f_formcolumnName
            )
            session.add(form)
            await session.flush() # To get f_formId
            
        # 3. Check/Create Relationship
        stmt_rel = select(PRelationalTableCampaignsForm).where(
            PRelationalTableCampaignsForm.rcf_campaignsId == 0,
            PRelationalTableCampaignsForm.rcf_accountId == m_accountId
        )
        result_rel = await session.execute(stmt_rel)
        relation = result_rel.scalar_one_or_none()
        
        if not relation:
            relation = PRelationalTableCampaignsForm(
                rcf_accountId=m_accountId,
                rcf_accountNo=m_accountNo,
                rcf_campaignsId=0,
                rcf_formId=form.f_formId
            )
            session.add(relation)
        
        await session.commit()
        return True

    except IntegrityError as e:
        await session.rollback()
        # If it's a conflict, maybe it was created concurrently? 
        # We log and ignore if goal was just "ensure".
        print(f"Integrity Error in ensure_default_campaign_form: {e}")
        # raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
        # We don't want to block contact creation if this fails, or maybe we do?
        # User said "automatically created and assign", so we should try best effort.
        return False
        
    except SQLAlchemyError as e:
        await session.rollback()
        print(f"Database Error in ensure_default_campaign_form: {e}")
        return False
        
    except Exception as e:
        await session.rollback()
        print(f"Unexpected Error in ensure_default_campaign_form: {e}")
        return False
        
    finally:
        await async_engine.dispose()


async def create_form(accountEncryption:str, m_accountId: str, m_accountNo: str, f_formName: str, f_formPayload: int, f_formcolumnName: str):

    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    try:
        csvformStructure = await getformcsvstructure(f_formPayload)
        form = PForm()
        form.f_accountId = m_accountId
        form.f_accountNo = m_accountNo
        form.f_formName = f_formName
        form.f_formPayload = f_formPayload
        form.f_formCsvTemplate = csvformStructure
        form.f_formcolumnName = f_formcolumnName

        session.add(form)
        await session.commit()
        await session.close()
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Form Created Successfully"}
        )
        
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await async_engine.dispose()
        
# Validate a Form Name
async def validator(vtype: str, vvalue: str, accountEncryption: str, f_formId: Optional[int] = None):
    
    if vtype == "f_formName":
        conditions = [
                    PForm.f_formName == vvalue,
            ]
        if f_formId:
            conditions.append(PForm.f_formId != f_formId)
            
        query = select(PForm).where(and_(*conditions))
        
        try:
            async_engine = get_async_engine(accountEncryption)
            async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
            session = async_session_maker()
            result = await session.execute(query)
            form = result.scalars().first()

            if form:
                print(form)
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={"message": "Form Name already exists"}
                )
            else:
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={"message": "Form Name is valid"}
                )
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

        finally:
            await async_engine.dispose()

 # Delete a Form       
async def delete_form(accountEncryption: str,f_formId: str):

    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    
    session = async_session_maker()
    try:

        result = await session.execute(select(PForm).where(PForm.f_formId == f_formId))
        form = result.scalar_one_or_none()

        if not form:
            raise HTTPException(status_code=404, detail=f"Form with ID {f_formId} not found")


        await session.delete(form)
        await session.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Form Deleted Successfully"}
        )

    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await async_engine.dispose()
        
        
# Get a Form List
async def select_form(accountEncryption: str,limit: int,offset: int,searchString: str,sortField: int,sortOrder: int, m_accountId: int, m_accountNo: int, m_memberRole: str):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    try:
        # Base query
        base_query = select(PForm)
        
        if m_memberRole != "SUPERADMIN":
            base_query = base_query.where(PForm.f_accountNo == m_accountNo)
            
        # Apply search filter
        if searchString:
            base_query = base_query.where(or_(
                PForm.f_formName.ilike(f"%{searchString}%"),
            ))

        # Sorting
        if sortField and sortOrder:
            order_clause = getattr(getattr(PForm, sortField), sortOrder.lower())()
            base_query = base_query.order_by(order_clause)
        


        # Count total filtered
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await session.execute(count_query)
        recordsTotal = count_result.scalar()
        
        # Apply pagination
        paginated_query = base_query.offset(offset).limit(limit)
        result = await session.execute(paginated_query)
        forms = result.scalars().all()
        print(forms)
        # Serialize
        form_serializable = [
            FormList.from_orm(form).model_dump(mode="json") for form in forms
        ]

        response_payload = {
            "recordsTotal": recordsTotal,
            "data": form_serializable
        }

        return response_payload

    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await async_engine.dispose()
        
async def dropdown(m_accountId: str, m_accountNo:str, accountEncryption: str) -> dict:
    
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        base_query =  select(PForm)

        result = await session.execute(base_query)
        formName = result.scalars().all()
        
        # Serialize
        allpeers_serializable = [
            FormListName.from_orm(name).model_dump(mode="json") for name in formName
        ]
        
        response_payload = {
            "data": allpeers_serializable
        }
        
        return response_payload
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await async_engine.dispose()
        
async def getform(accountEncryption: str, m_accountId: str,m_accountNo: str,campid: int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

    session = async_session_maker()
    try:
        # Base query
        stmt = (
            select(PForm)
            .join(PRelationalTableCampaignsForm, PRelationalTableCampaignsForm.rcf_formId == PForm.f_formId)
            .where(
                PRelationalTableCampaignsForm.rcf_accountId == m_accountId,
                PRelationalTableCampaignsForm.rcf_accountNo == m_accountNo,
                PRelationalTableCampaignsForm.rcf_campaignsId == campid
            )
        )

        result = await session.execute(stmt)
        form = result.scalar_one_or_none()   # ✅ fetch only one row (or None)

        if not form:
            if str(campid) == "0":
                # Self-healing: Ensure default form exists for Campaign 0
                try:
                    print("Lazy initialization: Creating default form for Campaign 0")
                    success = await ensure_default_campaign_form(accountEncryption, m_accountId, m_accountNo)
                    if success:
                        # Retry fetch
                        # IMPORTANT: Must commit/rollback current read transaction to see changes from other session
                        await session.commit()
                        result = await session.execute(stmt)
                        form = result.scalar_one_or_none()
                except Exception as e:
                    print(f"Error during lazy initialization: {e}")
                    # Continue to return 404 if failed

            if not form:
                raise HTTPException(status_code=404, detail="Form not found")

        # Convert to dict
        response_payload = {c.name: getattr(form, c.name) for c in form.__table__.columns}

        return response_payload

    except HTTPException as e:
        raise e

    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    finally:
        await async_engine.dispose()

async def getformcsvstructure(f_formPayload: dict):

    try:
        buffer = StringIO()
        writer = csv.writer(buffer)

        headers = ["phone_number"]
        guide_row = ["Mobile Number Without Country Code"]

        elements = f_formPayload.get("elements", []) if isinstance(f_formPayload, dict) else []

        for el in elements:
            label = el["label"].replace(" ", "_")
            headers.append(f"id_{el['id']}_{label}")

            field_type = el["type"]

            if field_type == "Dropdown":
                guide_row.append(", ".join(el.get("options", [])))
            elif field_type == "Radio":
                guide_row.append(" OR ".join(el.get("options", [])))
            elif field_type == "Checkbox":
                guide_row.append(", ".join(el.get("options", [])) + " (multiple allowed)")
            elif field_type == "Date":
                guide_row.append("YYYY-MM-DD")
            elif field_type == "Time":
                guide_row.append("HH:MM (24h)")
            elif field_type == "Number":
                guide_row.append("NUMBER")
            elif field_type == "File Upload":
                guide_row.append("FILE_URL or FILE_NAME")
            else:
                guide_row.append("TEXT")
                
        csv_definition = {
            "headers": headers,
            "guide_row": guide_row
        }
        return csv_definition

    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=str(e.orig))

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def getformcsv(accountEncryption: str,m_accountId: str,m_accountNo: str,campid: int):
    async_engine = get_async_engine(accountEncryption)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
        campaign_stmt = select(Campaigns).where(
            Campaigns.c_campaignId == campid,
            Campaigns.c_accountId == m_accountId,
            Campaigns.c_accountNo == m_accountNo
        )
        campaign = (await session.execute(campaign_stmt)).scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        rel_stmt = select(PRelationalTableCampaignsForm).where(
            PRelationalTableCampaignsForm.rcf_campaignsId == campid,
            PRelationalTableCampaignsForm.rcf_accountId == m_accountId,
            PRelationalTableCampaignsForm.rcf_accountNo == m_accountNo
        )
        relation = (await session.execute(rel_stmt)).scalar_one_or_none()
        if not relation:
            raise HTTPException(status_code=404, detail="No form mapped to this campaign")
        form_id = relation.rcf_formId
        form_stmt = select(PForm).where(
            PForm.f_formId == form_id,
            PForm.f_accountId == m_accountId,
            PForm.f_accountNo == m_accountNo
        )
        form = (await session.execute(form_stmt)).scalar_one_or_none()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        
        payload = form.f_formCsvTemplate
        if not payload or not payload.get("headers"):
            print(f"Form {form.f_formId} has no CSV template. Generating from payload...")
            payload = await getformcsvstructure(form.f_formPayload)
            
            # Sync back to DB for future use
            try:
                form.f_formCsvTemplate = payload
                await session.commit()
            except:
                await session.rollback()

        headers = payload.get("headers", [])
        guide_row = payload.get("guide_row", [])

        if not headers:
            # Fallback if still empty (should not happen with getformcsvstructure)
            headers = ["phone_number"]
            guide_row = ["Mobile Number"]
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(headers)
        if guide_row:
            writer.writerow(guide_row)

        output.seek(0)

        # 5️⃣ Stream CSV
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=campaign_{campid}_form.csv"
            }
        )
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=str(e.orig))

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await async_engine.dispose()