import jwt
from fastapi.responses import JSONResponse
from fastapi import status
from models import dto
from repos import billing_repo
from datetime import datetime
from typing import Optional,List
from models.dto import BillingHistoryList
from models.dto import BillingHistoryListResponse, BillingHistoryListSelectModel, BillingHistoryList, BillingHistoryListResponse

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"


    
def decode(token: str) -> Optional[dto.TokenModel]:
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dto.TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": f"Token Invalid"
            }
        )


async def creditConf(request, who_credit_id: int, database: str):
    return await billing_repo.creditConf(request, who_credit_id, database)



# billing customers list

async def get_billing_customers(database: str):

    customers = await billing_repo.get_billing_customers(database)

    return [
        {
            "id": c.b_billingAccountId,
            "name": c.b_billingAccountName,
            "balance": float(c.b_credit_balance or 0)
        }
        for c in customers
    ]

async def getBillingConfList( accountEncryption, accountId, limit, offset, searchString, sortField, sortOrder):
    return await billing_repo.get_billingConf_list(
        accountEncryption,
        accountId,
        limit,
        offset,
        searchString,
        sortField,
        sortOrder
    )


async def recharge(request, b_whoCredit: int, database: str):
    return await billing_repo.recharge(request, b_whoCredit, database)


async def gethistoyList(accountEncryption, accountId, limit, offset, searchString, dateFrom, dateTo, sortField, sortOrder):
    return await billing_repo.getBillingHistoryList(
        accountEncryption,
        accountId,
        limit,
        offset,
        searchString,
        dateFrom,
        dateTo,
        sortField,
        sortOrder
    )


async def get_accounts(database: str):

    accounts, configured_ids = await billing_repo.get_accounts(database)

    return [
        {
            "id": acc.a_accountId,
            "name": acc.a_accountName,
            "config": "Configured" if acc.a_accountId in configured_ids else "NonConfig"
        }
        for acc in accounts
    ]