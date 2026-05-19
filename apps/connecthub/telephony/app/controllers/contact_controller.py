from fastapi import APIRouter,  Request, Response, status, HTTPException, Depends
from fastapi.responses import JSONResponse
from models.dto import ContactCreateRequest, ContactUpdateModel, ContactDeleteModel, ContactSelectModel, ContactResponse, ContactValidationRequest, ContactlistSelectModel, ContactHistoryRequest
from models.dto import ContactHistoryResponse
from services import contact_service
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/telephony/contact",
    tags=["Contact"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create(request: ContactCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        created_contact = await contact_service.create(
            request.c_Name,
            request.c_phoneNumber,
            request.c_countryCode,
            request.c_mailId,
            request.c_organizationName,
            request.c_address,
            data.m_memberExtensionNo,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberId
        )
        
        print("QUERY RESPONSE:", created_contact)  
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Contact Created Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    
@router.post("/create/app", status_code=status.HTTP_201_CREATED)
async def create(
    request: ContactCreateRequest,
    response: Response,
    token: str = Depends(oauth2_scheme)
):
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        await contact_service.create(
            request.c_Name,
            request.c_phoneNumber,
            request.c_countryCode,
            request.c_mailId,
            request.c_organizationName,
            request.c_address,
            data.m_memberExtensionNo,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberId
        )

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Contact Created Successfully"}
        )

    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})


@router.post("/validation", status_code=status.HTTP_200_OK, response_model=dict)
async def validation(request: ContactValidationRequest, tokenRequest: Request, response: Response):
    print("Received request to validate contact:", request)
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response = await contact_service.validator(
            request.vtype,
            request.vvalue,
            request.c_id,
            data.m_memberExtensionNo,
            data.accountEncryption, 
            data.m_accountId,
            data.m_accountNo
        )
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})
    

@router.post("/validation/app", status_code=status.HTTP_200_OK, response_model=dict)
async def validate_contact(request: ContactValidationRequest, response: Response, token: str = Depends(oauth2_scheme)):
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        result = await contact_service.validator(
            request.vtype,
            request.vvalue,
            request.c_id,
            data.m_memberExtensionNo,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo
        )

        return result 

    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"message": e.detail}
        )

    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"Internal Server Error: {str(e)}"}
        )
    
# Update a contact
# This endpoint updates an existing contact with the provided details.
@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def contactUpdate(request: ContactUpdateModel, tokenRequest: Request, response: Response):
    print(tokenRequest.cookies.get("accessToken"))
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        print(data)
        response = await contact_service.update(
            request.c_Name,
            request.c_countryCode,
            request.c_phoneNumber,
            request.c_mailId,
            request.c_organizationName,
            request.c_address,
            data.m_memberExtensionNo,
            request.c_Id,
            data.accountEncryption, 
            data.m_accountId,
            data.m_accountNo
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


@router.post("/update/app", status_code=status.HTTP_200_OK)
async def contactUpdate(request: ContactUpdateModel,response: Response,token: str = Depends(oauth2_scheme)):
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        await contact_service.update(
            request.c_Name,
            request.c_countryCode,
            request.c_phoneNumber,
            request.c_mailId,
            request.c_organizationName,
            request.c_address,
            data.m_memberExtensionNo,
            request.c_Id,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Contact Updated Successfully"}
        )

    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"message": str(e.detail)}
        )

    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"Internal Server Error: {str(e)}"}
        )

# Delete a contact
# This endpoint deletes an existing contact by its ID.
@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def contactUpdate(request: ContactDeleteModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        
        response = await contact_service.delete(
            request.c_Id,
            data.m_memberExtensionNo,
            data.accountEncryption, 
            data.m_accountId
        )

        return response

        
    except HTTPException as e:
        return {"status": "error", "detail": str(e.detail)}
    
    except Exception as e:
        return {"status": "error", "detail": str(e)}
    


@router.post("/delete/app", status_code=status.HTTP_200_OK)
async def contact_delete(
    request: ContactDeleteModel,
    response: Response,
    token: str = Depends(oauth2_scheme) 
):
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        await contact_service.delete(
            request.c_Id,
            data.m_memberExtensionNo,
            data.accountEncryption,
            data.m_accountId
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Contact Deleted Successfully"}
        )

    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"message": str(e.detail)}
        )

    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"Internal Server Error: {str(e)}"}
        )

# Select contacts
# This endpoint retrieves a list of contacts based on the provided filters and pagination.
@router.post("/select", status_code=status.HTTP_200_OK, response_model=ContactResponse)
async def contactSelect(request: ContactSelectModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        print(data)
        response =  await contact_service.getContact(request.sortOrder, request.sortField, request.sortString, request.searchString, request.offset,request.limit, data.m_memberExtensionNo, data.accountEncryption, data.m_accountId)
        
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
    

@router.post( "/select/app", status_code=status.HTTP_200_OK, response_model=ContactResponse)
async def contact_select( request: ContactSelectModel, response: Response, token: str = Depends(oauth2_scheme)):
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    try:
        result = await contact_service.getContact(
            request.sortOrder,
            request.sortField,
            request.sortString,
            request.searchString,
            request.offset,
            request.limit,
            data.m_memberExtensionNo,
            data.accountEncryption,
            data.m_accountId
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
            content={"message": f"Internal Server Error: {str(e)}"}
        )

@router.post("/list/select", status_code=status.HTTP_200_OK, response_model=ContactResponse)
async def contactSelect(request: ContactlistSelectModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response =  await contact_service.getContactlist(request.searchString, request.offset,request.limit, data.m_memberExtensionNo, data.accountEncryption, data.m_accountId)
        
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
    
@router.post("/list/select/app", status_code=status.HTTP_200_OK, response_model=ContactResponse)
async def contactSelect(request: ContactlistSelectModel, response: Response, token: str = Depends(oauth2_scheme)):
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        response =  await contact_service.getContactlist(request.searchString, request.offset,request.limit, data.m_memberExtensionNo, data.accountEncryption, data.m_accountId)
        
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

@router.post("/history", status_code=status.HTTP_200_OK, response_model=ContactHistoryResponse)
async def history(request: ContactHistoryRequest, response: Response, tokenRequest: Request):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result = await contact_service.history(request, data.m_accountId, data.m_accountNo, 'onedb')
        return {
            "message": f"Contact History Fetched Successfully",
            "data": result
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

# ----------------- ADMIN ENDPOINTS -----------------

@router.post("/admin/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def admin_create(request: ContactCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Role check
    if data.m_memberRole not in ["ADMIN", "SUPERADMIN"]:
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"message": "Unauthorized"})

    try:
        await contact_service.admin_create(
            request.c_Name,
            request.c_phoneNumber,
            request.c_countryCode,
            request.c_mailId,
            request.c_organizationName,
            request.c_address,
            data.m_memberExtensionNo,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo,
            data.m_memberId
        )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Contact Created Successfully"}
        )
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"message": e.detail})

@router.post("/admin/update", status_code=status.HTTP_200_OK, response_model=dict)
async def admin_update(request: ContactUpdateModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    if data.m_memberRole not in ["ADMIN", "SUPERADMIN"]:
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"message": "Unauthorized"})
    try:
        response = await contact_service.admin_update(
            request.c_Name,
            request.c_countryCode,
            request.c_phoneNumber,
            request.c_mailId,
            request.c_organizationName,
            request.c_address,
            data.m_memberExtensionNo,
            request.c_Id,
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo
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

@router.post("/admin/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def admin_delete(request: ContactDeleteModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    if data.m_memberRole not in ["ADMIN", "SUPERADMIN"]:
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"message": "Unauthorized"})
    try:
        response = await contact_service.admin_delete(
            request.c_Id,
            data.m_memberExtensionNo,
            data.accountEncryption,
            data.m_accountId
        )
        return response
    except HTTPException as e:
        return {"status": "error", "detail": str(e.detail)}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.post("/admin/select", status_code=status.HTTP_200_OK, response_model=ContactResponse)
async def admin_select(request: ContactSelectModel, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = contact_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    if data.m_memberRole not in ["ADMIN", "SUPERADMIN"]:
         return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"message": "Unauthorized"})
    try:
        response = await contact_service.admin_getContact(
            request.sortOrder, 
            request.sortField, 
            request.sortString, 
            request.searchString, 
            request.offset,
            request.limit, 
            data.m_memberExtensionNo, 
            data.accountEncryption, 
            data.m_accountId
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
