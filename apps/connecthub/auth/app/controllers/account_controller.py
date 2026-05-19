from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from config import settings
from models.dto import AccountCreateRequest, AccountFetchRequest, AccountDetailsRequest, UpdateAccountDetailsRequest, CompanyUsersRequest, ValidateAccountRequest, IpCreateRequest, IpListRequest
from services import account_service

router = APIRouter(
    prefix="/onboarding",
    tags=["Account"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create(request: AccountCreateRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await account_service.create(request, 'onedb')
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": f"Account Created Successfullyy"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def fetch(request: AccountFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await account_service.fetch(
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Accounts Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/accountdetails", status_code=status.HTTP_200_OK, response_model=dict)
async def accountdetails(request: AccountDetailsRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await account_service.accountdetails(
            request.accountid,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Account Details Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/updateaccountdetails", status_code=status.HTTP_200_OK, response_model=dict)
async def updateaccountdetails(request: UpdateAccountDetailsRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await account_service.updateaccountdetails(
            request.accountId,
            request.planDetails,
            request.accounttimezone,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={

                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/companyusers", status_code=status.HTTP_200_OK, response_model=dict)
async def companyusers(request: CompanyUsersRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await account_service.fetchCompanyUsers(
            request.accountid,
            request.limit,
            request.offset,
            request.sortField,
            request.sortOrder,
            request.searchString,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Company Users Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/validate", status_code=200)
async def validate_account(request: ValidateAccountRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    exists = await account_service.validate_account_code(
        request.accountcode,
        "onedb"
    )


    return JSONResponse(status_code=200, content={"exists": exists})

@router.post("/ip/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_ip(request: IpCreateRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await account_service.createIp(request, 'onedb')
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/ip/list", status_code=status.HTTP_200_OK, response_model=dict)
async def fetch_ip_list(request: IpListRequest, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await account_service.fetchIpList(request, 'onedb')
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.delete("/ip/delete/{id}/{accountId}", status_code=status.HTTP_200_OK, response_model=dict)
async def delete_ip(id: int, accountId: int, tokenRequest: Request):
    token = tokenRequest.cookies.get(settings.AUTH_TOKEN_NAME)
    data = account_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await account_service.deleteIp(id, accountId, 'onedb')
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


