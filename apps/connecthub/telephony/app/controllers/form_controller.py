import uuid
import sys
from typing import Union, List
from fastapi import APIRouter,  Request, Response, status, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
import logging
from models.dto import FormCreate, FormUpdate, FormDelete, FormSelect, CampaignForm
from services import form_service

router = APIRouter(
    prefix="/telephony/formbuilder",
    tags=["formbuilder"]
)

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_form(request: FormCreate, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = form_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    
    try:
        response = await form_service.create_form(
            data.accountEncryption,
            data.m_accountId,
            data.m_accountNo, 
            request.f_formName,
            request.f_formPayload,
            request.f_formcolumnName
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

# @router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
# async def update_form(request: FormUpdate, tokenRequest: Request, response: Response):
#     token = tokenRequest.cookies.get("accessToken")
#     data = form_service.decode(token)
#     if isinstance(data, JSONResponse):
#         return data
#     try:
#         print(data)
#         response = await form_service.update_form(
#             data.accountEncryption,
#             data.m_accountId,
#             data.m_accountNo, 
#             request.f_formName,
#             request.f_formPayload,
#             request.f_formcolumnName,
#             request.f_formId
#         )
#         return response   
#     except HTTPException as e:
#         return JSONResponse(
#             status_code=e.status_code, 
#             content={"message": str(e.detail)}
#         )
#     except Exception as e:
#         return JSONResponse(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             content={"message": "Internal Server Error: " + str(e)}
#         )


# Delete a CLI
# This endpoint deletes an existing contact by its ID.
@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def delete_form(request: FormDelete, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = form_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        
        response = await form_service.delete_form(
            data.accountEncryption,
            request.f_formId
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
        
# Select Form
@router.post("/select", status_code=status.HTTP_200_OK)
async def cliSelect(request: FormSelect, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = form_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        print(data)
        response =  await form_service.select_form(data.accountEncryption, request.limit, request.offset, request.searchString, request.sortField, request.sortOrder, data.m_accountId, data.m_accountNo, data.m_memberRole)
        
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

@router.get("/dropdown", status_code=status.HTTP_200_OK, response_model=dict)
async def dropdown( tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = form_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        result =  await form_service.dropdown(
            data.m_accountId,
            data.m_accountNo,
            data.accountEncryption
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

@router.post("/getform", status_code=status.HTTP_200_OK)
async def cliSelect(request: CampaignForm, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = form_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    try:
        print(data)
        response =  await form_service.getform(data.accountEncryption, data.m_accountId, data.m_accountNo, request.campid)
        
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

@router.get("/form/csv",response_class=StreamingResponse)
async def download_form_csv(campid: int = Query(..., description="Campaign ID"),tokenRequest: Request = None):
    token = tokenRequest.cookies.get("accessToken")
    data = form_service.decode(token)
    
    if isinstance(data, JSONResponse):
        return data

    try:
        return await form_service.getformcsv(data.accountEncryption,data.m_accountId,data.m_accountNo,campid)
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