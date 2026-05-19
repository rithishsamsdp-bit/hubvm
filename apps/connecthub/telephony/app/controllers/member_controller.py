from fastapi import APIRouter, Request, Response, HTTPException, status, Path, Depends, Query, UploadFile, File
from fastapi.responses import JSONResponse
from models.dto import MemberRequestModel, MemberSuperBatchRequestModel, MembervalidationModel, MemberUpdateModel, MemberSuperUpdateModel, MemberDeleteModel, MemberSuperDeleteModel, MemberResponse, MemberSelectModel, MemberBatchRequestModel, MemberclicktocallUpdateModel, Member2FAStatusUpdateModel, MemberAccessStatusUpdateModel
from services import member_service
from typing import Annotated
from utils.RoleChecker import RoleChecker
import pandas as pd
from io import BytesIO
from types import SimpleNamespace
import asyncio
from typing import Annotated, Optional

router = APIRouter(
    prefix="/telephony/member",
    tags=["member"]
)

# This api is for superadmin
@router.post("/supercreate", status_code=status.HTTP_201_CREATED, response_model=dict)
async def memberSuperCreate(request: MemberSuperBatchRequestModel, tokenRequest: Request, response: Response, _: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    else:
        try:
            result = await member_service.create(
                data.accountEncryption,
                request.users,
                "ENTRY"
            )
            return result
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

# This api is for admin
@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def memberCreate(request: MemberBatchRequestModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["ADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    else:
        try:
            users = request.users  
            for u in users:
                u.m_accountId = data.m_accountId
            result = await member_service.create(str(data.m_accountId), data.m_accountCode, users, "ENTRY")
            return result
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

# Validate a Member
@router.post("/validation", status_code=status.HTTP_201_CREATED, response_model=dict)
async def validation(request: MembervalidationModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response = await member_service.validator(
            str(data.m_accountId),
            request.vtype,
            request.vvalue,
            data.m_accountCode,
            request.m_memberId
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


@router.post("/superupdate", status_code=status.HTTP_200_OK, response_model=dict)
async def memberSuperUpdate(request: MemberSuperUpdateModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response = await member_service.update(
            data.accountEncryption,
            request.m_accountId,
            request.m_memberId,
            request.m_memberName,
            request.m_memberPassword,
            request.m_memberRole,
            request.m_memberCallerIdMode,
            request.m_memberCallerId,
            request.m_memberMobileNo,
            request.m_memberMailId,
            request.m_memberMode,
            request.m_memberPlatformType
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

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def memberUpdate(request: MemberUpdateModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["ADMIN"]))],):
    print("Member Update Start")
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response = await member_service.update(
            data.accountEncryption,
            data.m_accountId,
            request.m_memberId,
            request.m_memberName,
            request.m_memberPassword,
            request.m_memberRole,
            request.m_memberCallerIdMode,
            request.m_memberCallerId,
            request.m_memberMobileNo,
            request.m_memberMailId,
            request.m_memberMode,
            request.m_memberPlatformType,
            data.m_accountCode
        )
        print("Member Update End")
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

# Delete a Member
@router.post("/superdelete", status_code=status.HTTP_200_OK, response_model=dict)
async def membersuperdelete(request: MemberSuperDeleteModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        
        response = await member_service.delete(
            data.accountEncryption,
            request.m_accountId,
            request.m_memberId
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

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def membersuperdelete(request: MemberDeleteModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["ADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        
        response = await member_service.delete(
            data.accountEncryption,
            data.m_accountId,
            request.m_memberId
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


# Select Member
@router.post("/select", status_code=status.HTTP_200_OK, response_model=MemberResponse)
async def cliSelect(request: MemberSelectModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["ADMIN","SUPERADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        print(data)
        response =  await member_service.getMember(data.accountEncryption,  data.m_accountNo,data.m_memberRole, request.limit, request.offset, request.searchString, request.sortField, request.sortOrder, request.roleFilter, request.memberMode, request.memberPlatform, request.type)
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

@router.post("/createUserBulkCSV", status_code=status.HTTP_201_CREATED, response_model=dict)
async def memberCreateCSV(file: UploadFile = File(...),tokenRequest: Request = None,response: Response = None,_: bool = Depends(RoleChecker(["ADMIN"]))):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    VALID_MEMBER_MODES = {"BROWSER", "SOFTPHONE"}
    VALID_PLATFORM_TYPES = {"CALLCENTER", "RCM"}
    if isinstance(data, JSONResponse):
        return data
    
    try:
        # Check CSV file type
        if file.content_type != "text/csv":
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")

        content = await file.read()
        try:
            df = pd.read_csv(BytesIO(content), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(BytesIO(content), encoding="ISO-8859-1")


        users = []
        errors = []

        # Process CSV rows
        for i, row in df.iterrows():
            row_num = i + 2  # account for header
            mode = str(row.get("m_memberMode", "")).strip()
            platform = str(row.get("m_memberPlatformType", "")).strip()

            # Validate mode and platform
            if mode not in VALID_MEMBER_MODES:
                errors.append(f"Row {row_num}: Invalid m_memberMode '{mode}'")
                continue
            if platform not in VALID_PLATFORM_TYPES:
                errors.append(f"Row {row_num}: Invalid m_memberPlatformType '{platform}'")
                continue

            # Required fields check
            name = str(row.get("m_memberName", "")).strip()
            password = str(row.get("m_memberPassword", "")).strip()
            email = str(row.get("m_memberMailId", "")).strip()
            if not name or not password or not email:
                errors.append(f"Row {row_num}: Missing required fields")
                continue

            # ---- OPTIONAL EXTENSION (COLUMN MAY NOT EXIST) ----
            raw_extension = row.get("m_memberExtensionNo", None)

            if pd.notna(raw_extension):
                extension = str(raw_extension).strip()
            else:
                extension = ""

            # Convert to object for create function
            user_obj = SimpleNamespace(
                m_memberName=name,
                m_memberPassword=password,
                m_memberExtensionNo=extension,
                m_memberMobileNo=str(row.get("m_memberMobileNo", "")).strip(),
                m_memberMailId=email,
                m_memberMode=mode,
                m_memberPlatformType=platform,
                m_accountId=data.m_accountId,
                m_memberRole="USER",
                m_memberCallerIdMode="",
                m_memberCallerId="",
            )
            users.append(user_obj)
            print(users)
        # Return CSV validation errors if any
        if errors:
            return JSONResponse(
                status_code=400,
                content={"message": "Validation failed", "errors": errors},
            )

        # Call service to create users
        task = asyncio.create_task(member_service.create(data.m_accountId, data.m_accountCode, users, "UPLOAD"))
        return {"message": "User creation started", "task_id": id(task)}

    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": str(e.detail)})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": "Internal Server Error: " + str(e)},
        )

@router.get("/select/export", status_code=status.HTTP_200_OK, response_model=dict)
async def breakreport( tokenRequest: Request, response: Response, limit: int = Query(10, description="Number of records to fetch"), offset: int = Query(0, description="Offset for pagination"), searchString: Optional[str] = Query(None, description="Search string"), sortField: Optional[str] = Query(None, description="Sort field name"), sortOrder: Optional[str] = Query(None, description="Sort order (asc/desc)"), roleFilter: Optional[str] = Query(None, description="Filter by role"), memberMode: Optional[str] = Query(None, description="Member mode"), memberPlatform: Optional[str] = Query(None, description="Member platform"), type: Optional[str] = Query(None, description="Type filter")):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data
    
    try:
        result = await member_service.getMember(data.accountEncryption,  data.m_accountNo,data.m_memberRole, limit, offset, searchString, sortField, sortOrder, roleFilter, memberMode, memberPlatform, type)
        return result
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/update/clicktocall", status_code=status.HTTP_200_OK, response_model=dict)
async def updateclicktocall(request: MemberclicktocallUpdateModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["ADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response = await member_service.updateclicktocall(
                    data.m_accountId,
                    data.m_accountNo,
                    data.accountEncryption,
                    request.m_memberId,
                    request.m_clicktocallType
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

@router.post("/update/2fa/status", status_code=status.HTTP_200_OK, response_model=dict)
async def update2FAStatus(request: Member2FAStatusUpdateModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["ADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await member_service.update2FAStatus(
            data.m_accountId,
            data.m_accountNo,
            request.m_memberId,
            request.m_member2FAStatus,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": f"2FA Status Updated Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/update/access/status", status_code=status.HTTP_200_OK, response_model=dict)
async def updateAccessStatus(request: MemberAccessStatusUpdateModel, tokenRequest: Request, response: Response,_: Annotated[bool, Depends(RoleChecker(["SUPERADMIN"]))],):
    token = tokenRequest.cookies.get("accessToken")
    data = member_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        await member_service.updateAccessStatus(
            request.memberid,
            request.memberaccessstatus,
            'onedb'
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": f"Member Access Status Updated Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})