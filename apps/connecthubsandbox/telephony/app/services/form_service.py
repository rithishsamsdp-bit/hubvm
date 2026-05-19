import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import form_repo
from datetime import datetime
from typing import Optional
from pydantic import EmailStr
from utils.redis_hash import generate_cache_hash_key
import json

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

async def create_form(accountEncryption: str, m_accountId: str,m_accountNo: str,f_formName: str,f_formPayload: str,f_formcolumnName: str):
    
    # Validate Form before creating
    form_val = await form_repo.validator('f_formName', f_formcolumnName, accountEncryption, f_formId=None)
    if  form_val.status_code != 200:
        return form_val
    
    # Create the Form in the repository
    return await form_repo.create_form(accountEncryption, m_accountId, m_accountNo, f_formName, f_formPayload, f_formcolumnName)

# # Update a CLI
# async def update_form(accountEncryption: str,m_accountId: str,m_accountNo: str,f_formName: str,f_formPayload: str, f_formcolumnName: str, f_formId: int):
    
#     # Validate phone number and CLI before creating
#     cli_val = await form_repo.validator('f_formName', f_formName, accountEncryption, f_formId)
#     if  cli_val.status_code != 200:
#         return cli_val
    
#     # Update the CLI in the repository
#     return await form_repo.update_form(accountEncryption, m_accountId, m_accountNo, f_formName, f_formPayload, f_formcolumnName, f_formId)

# Delete a CLI
async def delete_form(accountEncryption:str, f_formId: str):
    return await form_repo.delete_form(accountEncryption, f_formId)

# Get a CLI by ID
async def select_form(accountEncryption: str, limit: str, offset: str, searchString: str, sortField: str, sortOrder: str, m_accountId: int, m_accountNo: int, m_memberRole: str):
    
    return await form_repo.select_form( accountEncryption, limit, offset, searchString, sortField, sortOrder, m_accountId, m_accountNo, m_memberRole)

async def dropdown(m_accountId: int, m_accountNo: int, accountEncryption: any) -> dict:

    return await  form_repo.dropdown(m_accountId, m_accountNo, accountEncryption)

async def getform(accountEncryption: str, m_accountId: str,m_accountNo: str,campid: int):
    return await form_repo.getform( accountEncryption, m_accountId, m_accountNo, campid)

async def getformcsv(accountEncryption: str, m_accountId: str,m_accountNo: str,campid: int):
    return await form_repo.getformcsv( accountEncryption, m_accountId, m_accountNo, campid)

async def check_and_create_default_form(accountEncryption: str, m_accountId: int, m_accountNo: str, f_formPayload: dict = None, f_formcolumnName: str = "Notes, Disposition"):
    return await form_repo.ensure_default_campaign_form(accountEncryption, m_accountId, m_accountNo, f_formPayload, f_formcolumnName)