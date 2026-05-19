from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import contact_repo
from pydantic import EmailStr
from utils.redis_hash import generate_cache_hash_key
import jwt
from services import form_service

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str):
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Invalid"
            }
        )

async def create(contactname: str, contactnumber: str, c_countryCode: str, contactmailid: EmailStr, contactorgname: str, contactaddress: str, memberextensionno: str, database: str, accountid: int, accountno: str, memberid:int):
    redis_key = "contacts:list" + database + str(memberextensionno)

    ph_val = await  contact_repo.validator('phoneNumber', contactnumber, memberextensionno, database, redis_key, accountid, accountno)
    # email_val = await  contact_repo.validator('mailId', contactmailid, memberextensionno, database, redis_key, accountid, accountno)
    
    # if email_val.status_code != 200:
    #     return email_val
    if ph_val.status_code != 200:
        return ph_val
        
    # Ensure default form exists for Campaign 0 (Individual)
    default_form_payload = {
        "formTitle": "Followup",
        "elements": [
            {
                "id": "0",
                "type": "Single Line Text field",
                "label": "Notes",
                "required": False,
                "minChar": False,
                "maxChar": False,
                "layout": {
                    "x": 0,
                    "y": 0,
                    "w": 4,
                    "h": 3,
                    "minW": 2,
                    "maxW": 12,
                    "minH": 2,
                    "maxH": 6
                }
            },
            {
                "id": "1",
                "type": "Single Line Text field",
                "label": "Disposition",
                "required": False,
                "minChar": False,
                "maxChar": False,
                "layout": {
                    "x": 4,
                    "y": 0,
                    "w": 4,
                    "h": 3,
                    "minW": 2,
                    "maxW": 12,
                    "minH": 2,
                    "maxH": 6
                }
            }
        ]
    }
    await form_service.check_and_create_default_form(database, accountid, accountno, default_form_payload, "Notes, Disposition")

    return await contact_repo.create(contactname, contactnumber, c_countryCode, contactmailid, contactorgname, contactaddress, memberextensionno, database, accountid, redis_key, accountno, memberid)

# Validate a contact
async def validator(vtype: str, vvalue: str, c_id: str, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int, m_accountNo: str):
    accountEncryption = accountEncryption
    redis_key = "contacts:list" + accountEncryption + str(m_memberExtensionNo)
    return await contact_repo.validator(vtype, vvalue, m_memberExtensionNo, accountEncryption, redis_key, m_accountId, m_accountNo, c_id)

# Update a contact
async def update(c_Name: str, c_countryCode:str,c_phoneNumber: str,c_mailId: EmailStr,c_organizationName: str,c_address: str, m_memberExtensionNo: str, c_Id: int,  accountEncryption: str, m_accountId: int, m_accountNo: str):
    accountEncryption = accountEncryption
    redis_key = "contacts:list" + accountEncryption + str(m_memberExtensionNo)
    
    # Validate phone number and email before updating
    ph_val = await  contact_repo.validator('phoneNumber', c_phoneNumber, m_memberExtensionNo, accountEncryption, redis_key, m_accountId, m_accountNo, c_Id)
    email_val = await  contact_repo.validator('mailId', c_mailId, m_memberExtensionNo, accountEncryption, redis_key, m_accountId, m_accountNo, c_Id)
    if email_val.status_code != 200:
        return email_val
    if ph_val.status_code != 200:
        return ph_val
    
    # Update the contact in the repository
    return await contact_repo.update(c_Name, c_countryCode, c_phoneNumber, c_mailId, c_organizationName, c_address, m_memberExtensionNo, c_Id, accountEncryption, m_accountId, redis_key)

# Delete a contact
async def delete(c_Id: int, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int):
    accountEncryption = accountEncryption
    redis_key = "contacts:list" + accountEncryption + str(m_memberExtensionNo)
    return await contact_repo.delete( c_Id, m_memberExtensionNo, accountEncryption, m_accountId, redis_key)

# Get a contact by ID
async def getContact(sortOrder: str, sortField: str, sortString: str, searchString: str, offset: int, limit: int, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int):
    key_base = f"{sortOrder}_{sortField}_{sortString}_{searchString}_{offset}_{limit}_{m_memberExtensionNo}"
    hash_field = generate_cache_hash_key(key_base)
    redis_key = "contacts:list" + accountEncryption + str(m_memberExtensionNo)
    return await contact_repo.getContact( sortOrder, sortField, sortString, searchString, offset, limit, m_memberExtensionNo, accountEncryption, redis_key, hash_field, m_accountId)

# Get a contact by ID
async def getContactlist(searchString: str, offset: int, limit: int, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int):
    return await contact_repo.getContactlist(searchString, offset, limit, m_memberExtensionNo, accountEncryption, m_accountId)

async def history(request: dict, accountid: int, accountno: str, database: str):
    return await contact_repo.history(request.phoneno, request.countrycode, accountid, accountno, database)

# ----------------- ADMIN SERVICE METHODS -----------------

async def admin_create(contactname: str, contactnumber: str, c_countryCode: str, contactmailid: EmailStr, contactorgname: str, contactaddress: str, memberextensionno: str, database: str, accountid: int, accountno: str, memberid:int):
    redis_key = "contacts:list" + database + str(memberextensionno) # Keep using extension specific key for now or maybe account wide key?
    # For Admin, we might want to check global uniqueness within account, but let's stick to simple first.
    
    ph_val = await contact_repo.admin_validator('phoneNumber', contactnumber, database, accountid, accountno)
    if ph_val.status_code != 200:
        return ph_val

    # Ensure default form exists for Campaign 0 (Individual)
    default_form_payload = {
        "formTitle": "Followup",
        "elements": [
            {
                "id": "0",
                "type": "Single Line Text field",
                "label": "Notes",
                "required": False,
                "minChar": False,
                "maxChar": False,
                "layout": {
                    "x": 0,
                    "y": 0,
                    "w": 4,
                    "h": 3,
                    "minW": 2,
                    "maxW": 12,
                    "minH": 2,
                    "maxH": 6
                }
            },
            {
                "id": "1",
                "type": "Single Line Text field",
                "label": "Disposition",
                "required": False,
                "minChar": False,
                "maxChar": False,
                "layout": {
                    "x": 4,
                    "y": 0,
                    "w": 4,
                    "h": 3,
                    "minW": 2,
                    "maxW": 12,
                    "minH": 2,
                    "maxH": 6
                }
            }
        ]
    }
    await form_service.check_and_create_default_form(database, accountid, accountno, default_form_payload, "Notes, Disposition")

    return await contact_repo.admin_create(contactname, contactnumber, c_countryCode, contactmailid, contactorgname, contactaddress, memberextensionno, database, accountid, redis_key, accountno, memberid)

async def admin_update(c_Name: str, c_countryCode:str,c_phoneNumber: str,c_mailId: EmailStr,c_organizationName: str,c_address: str, m_memberExtensionNo: str, c_Id: int,  accountEncryption: str, m_accountId: int, m_accountNo: str):
    accountEncryption = accountEncryption
    redis_key = "contacts:list" + accountEncryption + str(m_memberExtensionNo)
    
    ph_val = await contact_repo.admin_validator('phoneNumber', c_phoneNumber, accountEncryption, m_accountId, m_accountNo, c_Id)
    # email_val = await contact_repo.admin_validator('mailId', c_mailId, accountEncryption, m_accountId, m_accountNo, c_Id)
    
    if ph_val.status_code != 200:
        return ph_val
    
    return await contact_repo.admin_update(c_Name, c_countryCode, c_phoneNumber, c_mailId, c_organizationName, c_address, c_Id, accountEncryption, m_accountId, redis_key)

async def admin_delete(c_Id: int, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int):
    accountEncryption = accountEncryption
    redis_key = "contacts:list" + accountEncryption + str(m_memberExtensionNo)
    return await contact_repo.admin_delete(c_Id, accountEncryption, m_accountId, redis_key)

async def admin_getContact(sortOrder: str, sortField: str, sortString: str, searchString: str, offset: int, limit: int, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int):
    key_base = f"ADMIN_{sortOrder}_{sortField}_{sortString}_{searchString}_{offset}_{limit}_{m_accountId}"
    hash_field = generate_cache_hash_key(key_base)
    redis_key = "contacts:list:admin" + accountEncryption + str(m_accountId) 
    return await contact_repo.admin_getContact(sortOrder, sortField, sortString, searchString, offset, limit, accountEncryption, redis_key, hash_field, m_accountId)