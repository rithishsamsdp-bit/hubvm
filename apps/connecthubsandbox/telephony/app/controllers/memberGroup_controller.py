from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import MemberGroupCreateRequest, MemberGroupUpdateRequest, MemberGroupDeleteRequest, MemberGroupFetchRequest
from services import memberGroup_service

router = APIRouter(
    prefix="/telephony/membergroup",
    tags=["MemberGroup"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create(request: MemberGroupCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = memberGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await memberGroup_service.create(
            request.membergroupname,
            request.memberids,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Member Group Created Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def update(request: MemberGroupUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = memberGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await memberGroup_service.update(
            request.membergroupid,
            request.membergroupname,
            request.memberids,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Member Group Updated Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def delete(request: MemberGroupDeleteRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = memberGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await memberGroup_service.delete(
            request.membergroupid,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Member Group Deleted Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def fetch(request: MemberGroupFetchRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = memberGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await memberGroup_service.fetch(
            request.limit,
            request.offset,
            request.sortOrder,
            request.sortField,
            request.searchString,
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Member Groups Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.get("/list/members", status_code=status.HTTP_200_OK, response_model=dict)
async def listMembers(tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = memberGroup_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await memberGroup_service.listMembers(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Members Fetched Successfully",
                "data": result
            }
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})