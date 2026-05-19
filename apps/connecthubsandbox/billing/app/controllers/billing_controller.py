from fastapi import APIRouter, HTTPException, Request, Response, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from models.dto import BillingCreate,BillingUpdate,BillingHistoryCreate,BillingHistoryResponse,BillingHistoryListSelectModel,BillingConfigListSelectModel,BillingConfigListResponse
from models.dto import BillingHistoryListResponse, BillingHistoryListSelectModel
from services import billing_service
from models.db import Accounts

router = APIRouter(
    prefix="/billing/billconf",
    tags=["Billing"]
)

@router.post("/creditConf", status_code=status.HTTP_201_CREATED)
async def credit(request: BillingCreate, tokenRequest: Request):

    token = tokenRequest.cookies.get("accessToken")
    data = billing_service.decode(token)

    if isinstance(data, JSONResponse):
        return data

    result = await billing_service.creditConf(
        request,
        data.m_accountId,
        data.accountEncryption
    )

    if result == "already_exists":
        return JSONResponse(
            status_code=200,
            content={"message": "Billing config already exists (skipped)"}
        )

    elif result == "account_not_found":
        return JSONResponse(
            status_code=404,
            content={"message": "Account not found"}
        )

    return JSONResponse(
        status_code=201,
        content={"message": "Billing Config Created Successfully"}
    )

@router.post("/billingConf_list",response_model=BillingConfigListResponse, status_code=status.HTTP_200_OK)
async def get_creditConf_list(
    request: BillingConfigListSelectModel,
    tokenRequest: Request
):
    token = tokenRequest.cookies.get("accessToken")

    if not token:
        return JSONResponse(
            status_code=401,
            content={"message": "Token missing"}
        )

    data = billing_service.decode(token)

    if isinstance(data, JSONResponse):
        return data

    accountId = getattr(data, "accountId", None) \
        or getattr(data, "b_creditAccountId", None)

    result = await billing_service.getBillingConfList(
        accountEncryption=data.accountEncryption,
        accountId=accountId,
        limit=request.limit,
        offset=request.offset,
        searchString=request.searchString,
        sortField=request.sortField,
        sortOrder=request.sortOrder
    )

    return result

@router.post("/updateconfig/{account_id}", status_code=200)
async def update_config(account_id: int, request: BillingUpdate, tokenRequest: Request):

    token = tokenRequest.cookies.get("accessToken")

    if not token:
        return JSONResponse(
            status_code=401,
            content={"message": "Token Missing"}
        )

    data = billing_service.decode(token)

    if isinstance(data, JSONResponse):
        return data

    result = await billing_service.update_config(
        account_id,
        request,
        data.accountEncryption
    )

    return {
        "message": "Billing Config Updated Successfully",
        "status": result
    }

# 🔥 ACCOUNTS DROPDOWN API
@router.get("/accounts", status_code=200)
async def get_accounts(tokenRequest: Request):
    
    token = tokenRequest.cookies.get("accessToken")
    data = billing_service.decode(token)

    if isinstance(data, JSONResponse):
        return data

    result = await billing_service.get_accounts(data.accountEncryption)

    return JSONResponse(
        status_code=200,
        content=result
    )

@router.post("/recharge", status_code=status.HTTP_201_CREATED)
async def recharge(request: BillingHistoryCreate, tokenRequest: Request):

    token = tokenRequest.cookies.get("accessToken")
    data = billing_service.decode(token)

    if isinstance(data, JSONResponse):
        return data

    result = await billing_service.recharge(
        request,
        data.m_accountId,
        data.accountEncryption
    )


    return JSONResponse(
        status_code=200,
        content={
            "message": "Recharge done",
            "data": result
        }
    )


# biliingEnabledCustomers API
@router.post(
    "/billingConf_list",
    response_model=BillingConfigListResponse
)
async def get_creditConf_list(
    request: BillingConfigListSelectModel,
    tokenRequest: Request
):
    token = tokenRequest.cookies.get("accessToken")

    if not token:
        return JSONResponse(
            status_code=401,
            content={"message": "Token missing"}
        )

    data = billing_service.decode(token)

    if isinstance(data, JSONResponse):
        return data

    accountId = getattr(data, "accountId", None) \
        or getattr(data, "b_creditAccountId", None)

    result = await billing_service.getBillingConfList(
        accountEncryption=data.accountEncryption,
        accountId=accountId,
        limit=request.limit,
        offset=request.offset,
        searchString=request.searchString,
        sortField=request.sortField,
        sortOrder=request.sortOrder
    )

    return result

# Recharge History API
@router.post( "/select_recharge_history", status_code=status.HTTP_200_OK, response_model=BillingHistoryListResponse)
async def select_billinghistory_controller(
    request: BillingHistoryListSelectModel,
    tokenRequest: Request
):
    token = tokenRequest.cookies.get("accessToken")

    data = billing_service.decode(token)

    b_creditAccountId = getattr(data, "b_creditAccountId", None)

    result = await billing_service.gethistoyList(
        accountEncryption=data.accountEncryption,
        accountId=b_creditAccountId,
        limit=request.limit,
        offset=request.offset,
        searchString=request.searchString,
        dateFrom=request.dateFrom,
        dateTo=request.dateTo,
        sortField=request.sortField,
        sortOrder=request.sortOrder
    )

    return result