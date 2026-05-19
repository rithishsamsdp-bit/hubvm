import os
from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import blockListCreateRequest, blockListUpdateRequest, blockListDeleteRequest, BlockListResponse, BlackListSelectModel
from services import blacklist_service

router = APIRouter(
    prefix="/telephony/blacklist",
    tags=["Blacklist"]
)


@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def blacklistCreate(request: blockListCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = blacklist_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    
    # Get values from token/session
    p_blacklistAccountId = data.m_accountId          
    p_blacklistAccountNO = data.m_accountNo       

    await blacklist_service.create(
        p_blacklistAccountId,
        p_blacklistAccountNO,
        request.p_blacklistNo,
        request.p_blacklistDescription,
        request.p_blacklistCalltype,
        request.p_blacklistStatus,
        data.accountEncryption
    )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"message": "Blacklist Created Successfully"}
    )


@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def blacklistUpdate(request: blockListUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = blacklist_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    current_user = await blacklist_service.get_blacklist_by_id(request.p_blacklistId, data.accountEncryption)
    if not current_user:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": "BlacklistId not found"})

    await blacklist_service.update(
        request.p_blacklistId,
        request.p_blacklistNo,
        request.p_blacklistDescription,
        request.p_blacklistCalltype,
        request.p_blacklistStatus,
        data.accountEncryption
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Blacklist Updated Successfully"}
    )


@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def blacklistDelete(request: blockListDeleteRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = blacklist_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    current_blacklist = await blacklist_service.get_blacklist_by_id(request.p_blacklistId, data.accountEncryption)
    if not current_blacklist:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": "blacklist not found"})

    await blacklist_service.delete(
        request.p_blacklistId,
        data.accountEncryption
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Blacklist Deleted Successfully"}
    )


@router.post("/select", status_code=status.HTTP_200_OK, response_model=BlockListResponse)
async def blacklistSelect(request: BlackListSelectModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = blacklist_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        print(data)
        response = await blacklist_service.getBlackList(
            accountEncryption=data.accountEncryption,
            accountId=data.m_accountId,     # <-- use this
            limit=request.limit,
            offset=request.offset,
            searchString=request.searchString,
            sortField=request.sortField,
            sortOrder=request.sortOrder
        )

        
        return response

    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, 
            content={"message": str(e.detail)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": "Internal Server Error: " + str(e)}
        )