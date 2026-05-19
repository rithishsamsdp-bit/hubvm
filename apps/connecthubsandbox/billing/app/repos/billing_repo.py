import uuid
from db.context import get_sync_engine, get_async_engine
from sqlalchemy import Update, select, delete as sqlalchemy_delete,func, exists
from sqlalchemy import or_
from sqlalchemy import and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from models.db import BillingConfig,BillingHistory, Accounts
from models.dto import BillingCreate,BillingHistoryResponse,BillingUpdate,BillingConfigList
from sqlalchemy import update as sqlalchemy_update
from typing import Optional,List
from fastapi import HTTPException
from models.dto import BillingHistoryList
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from decimal import Decimal

async def creditConf(request, who_credit_id: int, database: str):

    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )
    session = async_session_maker()

    try:
        # 🔥 1. Get account
        result = await session.execute(
            select(Accounts).where(Accounts.a_accountId == request.b_billingAccountId)
        )
        account = result.scalar_one_or_none()

        if not account:
            return "account_not_found"

        # 🔥 2. Check already exists
        result = await session.execute(
            select(BillingConfig).where(
                BillingConfig.b_billingAccountId == request.b_billingAccountId
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            return "already_exists"   # ✅ skip

        # 🔥 3. Insert new config
        billing = BillingConfig(
            b_billingAccountId=account.a_accountId,
            b_billingAccountName=account.a_accountName,
            b_credit_balance=Decimal(str(request.b_credit_balance)),
            b_billing_status=request.b_billing_status,
            b_rate_per_min=request.b_rate_per_min,
            b_billing_pulse=request.b_billing_pulse,
            b_billing_type=request.b_billing_type,
            b_billingDescription=request.b_billingDescription,
            b_billing_whocredit_AccountId=who_credit_id
        )

        session.add(billing)
        await session.commit()

        return "created"

    finally:
        await session.close()
        await async_engine.dispose()

async def get_recharge_history(database: str):

    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )

    session = async_session_maker()

    try:
        result = await session.execute(
            select(BillingHistory).order_by(BillingHistory.b_creditCreatedOn.desc())
        )

        history = result.scalars().all()

        return history

    finally:
        await session.close()
        await async_engine.dispose()

async def get_billingConf_list(
    accountEncryption,
    accountId,
    limit,
    offset,
    searchString,
    sortField,
    sortOrder
):
    async_engine = get_async_engine(accountEncryption)
    session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )

    session = session_maker()

    try:
        # ✅ BASE QUERY
        base_query = select(BillingConfig)

        # ✅ OPTIONAL FILTER (if needed later)
        if accountId:
            base_query = base_query.where(
                BillingConfig.b_billingAccountId == accountId
            )

        # 🔍 SEARCH (case-safe)
        if searchString:
            search = f"%{searchString}%"
            base_query = base_query.where(
                or_(
                    BillingConfig.b_billingAccountName.ilike(search),
                    BillingConfig.b_billingAccountNO.ilike(search),
                    BillingConfig.b_billingDescription.ilike(search)
                )
            )

        # 🔽 SORT (SAFE)
        if hasattr(BillingConfig, sortField):
            column = getattr(BillingConfig, sortField)

            if sortOrder.upper() == "DESC":
                base_query = base_query.order_by(column.desc())
            else:
                base_query = base_query.order_by(column.asc())
        else:
            print("⚠️ Invalid sortField:", sortField)

        # 🔢 COUNT
        count_query = select(func.count()).select_from(base_query.subquery())
        total = (await session.execute(count_query)).scalar()

        # 📄 PAGINATION
        result = await session.execute(
            base_query.offset(offset).limit(limit)
        )
        rows = result.scalars().all()

        # ✅ RESPONSE
        return {
            "recordsTotal": total,
            "data": [
                BillingConfigList.from_orm(row).model_dump(mode="json")
                for row in rows
            ]
        }

    except Exception as e:
        print("❌ ERROR in get_billingConf_list:", str(e))
        raise

    finally:
        await session.close()
        await async_engine.dispose()

async def update_config(account_id: int, request, database: str):

    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )
    session = async_session_maker()

    try:
        # 🔥 get billing config
        result = await session.execute(
            select(BillingConfig).where(
                BillingConfig.b_billingAccountId == account_id
            )
        )
        billing = result.scalar_one_or_none()

        if not billing:
            raise HTTPException(status_code=404, detail="Billing config not found")

        # ✅ update fields (only config fields)
        billing.b_rate_per_min = request.b_rate_per_min
        billing.b_billing_pulse = request.b_billing_pulse
        billing.b_billing_type = request.b_billing_type
        billing.b_billing_status = request.b_billing_status
        billing.b_billingDescription = request.b_billingDescription

        await session.commit()

        return "success"

    finally:
        await session.close()
        await async_engine.dispose()

async def get_accounts(database: str):

    async_engine = get_async_engine(database)
    session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )

    session = session_maker()

    try:
        # ✅ Get all accounts
        result = await session.execute(select(Accounts))
        accounts = result.scalars().all()

        # ✅ Get configured account IDs
        conf_result = await session.execute(
            select(BillingConfig.b_billingAccountId)
        )
        configured_ids = {row[0] for row in conf_result.fetchall()}

        return accounts, configured_ids

    finally:
        await session.close()
        await async_engine.dispose()



async def recharge(request, b_whoCredit: int, database: str):

    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )
    session = async_session_maker()

    try:
        result = await session.execute(
            select(BillingConfig)
            .where(BillingConfig.b_billingAccountId == request.b_creditAccountId)
            .with_for_update()
        )
        billing_main = result.scalar_one_or_none()

        if not billing_main:
            return "billing_account_not_found"
        
         # 🔥 VALIDATE paymentDoneBy (MANDATORY)
        if not request.b_paymentDoneBy:
            return {"error": "b_paymentDoneBy is required"}

        # 🔥 AUTO TRANSACTION ID
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"

        # 🔥 Amount
        recharge_amount = Decimal(request.b_credit_balance)

        # 🔥 TDS
        tds_percent = Decimal(request.b_tds_percent)
        tds_amount = (recharge_amount * tds_percent) / 100

        # 🔥 GST
        gst_percent = Decimal(request.b_gst_percent)
        gst_amount = (recharge_amount * gst_percent) / 100

        # 🔥 Total payable
        total_amount = recharge_amount + gst_amount - tds_amount

        # 🔥 Balance update (IMPORTANT CHANGE 🔥)
        old_balance = Decimal(billing_main.b_credit_balance or 0)
        new_balance = old_balance + recharge_amount   # ✅ FULL 10000

        billing_main.b_credit_balance = new_balance

        # 🔥 Insert history
        history = BillingHistory(
            b_creditAccountId=billing_main.b_billingAccountId,
            b_creditAccountName=billing_main.b_billingAccountName,
            b_credit_balance=recharge_amount,   # ✅ only 10000
            b_tds_percent=tds_percent,
            b_tds_amount=tds_amount,
            b_gst_amount=gst_amount,            # ✅ 1800
            b_total_amount=total_amount,        # ✅ 11800 (NEW 🔥)
            b_creditDescription=request.b_creditDescription,
            b_whoCredit=str(b_whoCredit),
            b_transaction_id=transaction_id,
            b_paymentDoneBy=request.b_paymentDoneBy
        )

        session.add(history)
        await session.commit()

        return {
            "transaction_id": transaction_id,
            "recharge": float(recharge_amount),
            "TDS %": float(tds_percent),
            "TDS": float(tds_amount),
            "GST %": float(gst_percent),
            "GST Amount": float(gst_amount),
            "total": float(total_amount),
            "new_balance": float(new_balance),
            "b_paymentDoneBy": request.b_paymentDoneBy
        }

    except Exception as e:
        await session.rollback()
        raise e

    finally:
        await session.close()
        await async_engine.dispose()


async def get_billing_customers(database: str):

    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )

    session = async_session_maker()

    try:
        result = await session.execute(
            select(BillingConfig).order_by(BillingConfig.b_billingAccountName.asc())
        )
        customers = result.scalars().all()

        return customers

    finally:
        await session.close()
        await async_engine.dispose()



# billing history list
async def getBillingHistoryList( accountEncryption, accountId, limit, offset, searchString, dateFrom, dateTo, sortField, sortOrder):
    async_engine = get_async_engine(accountEncryption)
    session_maker = sessionmaker(
        async_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )
    session = session_maker()

    try:
        # ✅ BASE QUERY (SAFE)
        if accountId:
            base_query = select(BillingHistory).where(
                BillingHistory.b_creditAccountId == accountId
            )
        else:
            # fallback (debug / admin)
            # print("⚠️ No accountId → returning all data")
            base_query = select(BillingHistory)

        # ✅ DATE FILTER
        if dateFrom:
            base_query = base_query.where(BillingHistory.b_creditCreatedOn >= dateFrom)
        
        if dateTo:
            # If dateTo is just a date (YYYY-MM-DD), add time to include the whole day
            if len(dateTo) == 10:
                base_query = base_query.where(BillingHistory.b_creditCreatedOn <= f"{dateTo} 23:59:59")
            else:
                base_query = base_query.where(BillingHistory.b_creditCreatedOn <= dateTo)

        # ✅ SEARCH (MySQL safe)
        if searchString:
            search = f"%{searchString}%"
            base_query = base_query.where(
                or_(
                    BillingHistory.b_creditAccountName.like(search),
                    BillingHistory.b_creditDescription.like(search)
                )
            )

        # ✅ SORTING (SAFE)
        if hasattr(BillingHistory, sortField):
            column = getattr(BillingHistory, sortField)

            if sortOrder.upper() == "DESC":
                base_query = base_query.order_by(column.desc())
            else:
                base_query = base_query.order_by(column.asc())
        else:
            print("⚠️ Invalid sortField → skipping sorting")

        # ✅ COUNT
        count_query = select(func.count()).select_from(base_query.subquery())
        total = (await session.execute(count_query)).scalar()

        # ✅ PAGINATION
        result = await session.execute(
            base_query.offset(offset).limit(limit)
        )
        rows = result.scalars().all()

        # ✅ RESPONSE
        return {
            "recordsTotal": total,
            "data": [
                BillingHistoryList.from_orm(row).model_dump(mode="json")
                for row in rows
            ]
        }

    except Exception as e:
        print("❌ ERROR in repo:", str(e))
        raise

    finally:
        await session.close()
        await async_engine.dispose()