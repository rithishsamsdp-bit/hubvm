from sqlalchemy import select, or_, func, desc, asc
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import asyncSessionFactory
from models.db import WhatsappAccounts, Accounts
from models.dto import WhatsAppCreateRequest
from datetime import datetime

async def create(request: WhatsAppCreateRequest, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            account = WhatsappAccounts(
                w_accountId=str(request.w_accountId), # Converting to string as per model definition
                w_whatsappNumber=request.w_whatsappNumber,
                w_phNumberId=request.w_phNumberId,
                w_apiKey=request.w_apiKey,
                w_wabaID=request.w_wabaID,
                w_amountDeduction=request.w_amountDeduction,
                w_status='Active'
            )
            session.add(account)

            from models.db import Accounts, MemberPlans, Members
            stmt = select(Accounts).where(Accounts.a_accountId == request.w_accountId)
            acc_result = await session.execute(stmt)
            acc = acc_result.scalar_one_or_none()
            
            if acc and acc.a_planDetails:
                plan_details = dict(acc.a_planDetails)
                if "roles" in plan_details and "ADMIN" in plan_details["roles"]:
                    if "menu" not in plan_details["roles"]["ADMIN"]:
                        plan_details["roles"]["ADMIN"]["menu"] = {}
                    plan_details["roles"]["ADMIN"]["menu"]["whatsapp"] = True
                    acc.a_planDetails = plan_details
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(acc, "a_planDetails")

            stmt_members = select(MemberPlans).join(Members, MemberPlans.m_memberId == Members.m_memberId).where(Members.m_accountId == request.w_accountId, Members.m_memberRole == 'ADMIN')
            members_result = await session.execute(stmt_members)
            member_plans = members_result.scalars().all()
            for mp in member_plans:
                if mp.m_memberplanDetails:
                    mp_details = dict(mp.m_memberplanDetails)
                    if "menu" not in mp_details:
                        mp_details["menu"] = {}
                    mp_details["menu"]["whatsapp"] = True
                    mp.m_memberplanDetails = mp_details
                    flag_modified(mp, "m_memberplanDetails")

            await session.commit()
            return {"message": "WhatsApp Account Created Successfully", "id": account.w_whatsappAccountId}
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: str, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            stmt = select(
                WhatsappAccounts,
                Accounts.a_accountName
            ).join(Accounts, WhatsappAccounts.w_accountId == Accounts.a_accountId) # Implicit cast might handle int vs string, or fail.

            if searchString:
                search = f"%{searchString}%"
                stmt = stmt.where(or_(
                    WhatsappAccounts.w_whatsappNumber.ilike(search),
                    Accounts.a_accountName.ilike(search)
                ))

            if sortField and sortOrder:
                if sortField == 'a_accountName':
                    order_col = Accounts.a_accountName
                elif hasattr(WhatsappAccounts, sortField):
                    order_col = getattr(WhatsappAccounts, sortField)
                else:
                    order_col = WhatsappAccounts.w_createdOn

                if sortOrder.upper() == "DESC":
                    stmt = stmt.order_by(order_col.desc())
                else:
                    stmt = stmt.order_by(order_col.asc())
            else:
                stmt = stmt.order_by(WhatsappAccounts.w_createdOn.desc())

            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_count = (await session.execute(count_stmt)).scalar()

            stmt = stmt.offset(offset).limit(limit)
            result = await session.execute(stmt)
            rows = result.all()

            data = []
            for row in rows:
                wa_acc = row[0]
                acc_name = row[1]
                data.append({
                    "w_whatsappAccountId": wa_acc.w_whatsappAccountId,
                    "w_accountId": int(wa_acc.w_accountId) if wa_acc.w_accountId and wa_acc.w_accountId.isdigit() else wa_acc.w_accountId,
                    "a_accountName": acc_name,
                    "w_whatsappNumber": wa_acc.w_whatsappNumber,
                    "w_phNumberId": wa_acc.w_phNumberId,
                    "w_apiKey": wa_acc.w_apiKey,
                    "w_wabaID": wa_acc.w_wabaID,
                    "w_amountDeduction": wa_acc.w_amountDeduction,
                    "w_currectBalance": wa_acc.w_currectBalance,
                    "w_createdOn": wa_acc.w_createdOn.isoformat() if wa_acc.w_createdOn else None,
                    "w_updatedOn": wa_acc.w_updatedOn.isoformat() if wa_acc.w_updatedOn else None,
                    "w_status": wa_acc.w_status
                })

            return {
                "totalCount": total_count,
                "data": data
            }

        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
async def update(request: WhatsAppCreateRequest, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        try:
            # First find the existing account
            # Normally we should use request.w_whatsappAccountId but the model definition might vary.
            # Assuming we use w_whatsappAccountId if provided in the DTO or we filter by w_accountId + w_whatsappNumber
            
            # Since request is WhatsAppCreateRequest, it might not have w_whatsappAccountId.
            # However, I added it to the frontend payload. 
            # I should check the DTO definition to be sure.
            
            stmt = select(WhatsappAccounts).where(WhatsappAccounts.w_whatsappAccountId == request.w_whatsappAccountId)
            result = await session.execute(stmt)
            account = result.scalar_one_or_none()
            
            if not account:
                # Fallback to w_accountId if needed
                stmt = select(WhatsappAccounts).where(WhatsappAccounts.w_accountId == str(request.w_accountId))
                result = await session.execute(stmt)
                account = result.scalar_one_or_none()
            
            if not account:
                raise HTTPException(status_code=404, detail="WhatsApp Account not found")

            # Update fields
            account.w_whatsappNumber = request.w_whatsappNumber
            account.w_phNumberId = request.w_phNumberId
            account.w_apiKey = request.w_apiKey
            account.w_wabaID = request.w_wabaID
            account.w_amountDeduction = request.w_amountDeduction
            account.w_updatedOn = datetime.now()
            
            await session.commit()
            return {"message": "WhatsApp Account Updated Successfully"}
        except IntegrityError as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
        except SQLAlchemyError as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
