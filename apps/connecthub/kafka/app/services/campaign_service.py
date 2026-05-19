import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models import dto
from repos import campaign_repo
from datetime import datetime
from typing import Optional

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def encode(userdetails: dict, exp: datetime, encryption) -> str:
    token = dto.TokenModel(
        a_agentId = userdetails.a_agentId,
        a_regId = userdetails.a_regId,
        a_companyCode = userdetails.a_companyCode,
        a_userName = userdetails.a_userName,
        a_password = userdetails.a_password,
        a_phLogin = userdetails.a_phLogin,
        a_campaignId = userdetails.a_campaignId,
        a_mode = userdetails.a_mode,
        a_platFormType = userdetails.a_platFormType,
        a_role = userdetails.a_role,
        a_callerId = userdetails.a_callerId,
        a_mailId = userdetails.a_mailId,
        a_loginStatus = userdetails.a_loginStatus,
        a_context = userdetails.a_context,
        a_passwordHash = userdetails.a_passwordHash,
        a_mobileNumber = userdetails.a_mobileNumber,
        a_uniqueid = userdetails.a_uniqueid,
        a_calltype = userdetails.a_calltype,
        a_confdetails = userdetails.a_confdetails,
        exp=exp,
        encryption = encryption
    )
    return jwt.encode(token.model_dump(), SECRET_KEY, algorithm=ALGORITHM)
    
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
    
def create(campaignname: str, campaigndescription: str, carrierid: int, carriername: str, flowid: int, flowname: str, database: str):
    campaignname = campaignname.strip()
    campaigndescription = campaigndescription
    carrierid = carrierid
    carriername = carriername
    flowid = flowid
    flowname = flowname
    database = database
    return campaign_repo.create(campaignname, campaigndescription, carrierid, carriername, flowid, flowname, database)

async def numbersCreate(file_path: str, file_extension: str, campaignid: int, campaignname: str, campaigndescription: str, database: str):
    file_path = file_path
    file_extension = file_extension
    campaignid = campaignid
    campaignname = campaignname.strip()
    campaigndescription = campaigndescription
    database = database
    return await campaign_repo.numbersCreate(file_path, file_extension, campaignid, campaignname, campaigndescription, database)

async def update(campaignid: int, campaignname: str, campaigndescription: str, carrierid: int, carriername: str, flowid: int, flowname: str, database: str):
    campaignid = campaignid
    campaignname = campaignname.strip()
    campaigndescription = campaigndescription
    carrierid = carrierid
    carriername = carriername
    flowid = flowid
    flowname = flowname
    database = database
    return await campaign_repo.update(campaignid, campaignname, campaigndescription, carrierid, carriername, flowid, flowname, database)

async def delete(campaignid: int, database: str):
    campaignid = campaignid
    database = database
    return await campaign_repo.delete(campaignid, database)

def fetch(limit: int, offset: int, searchString: any, database: str) -> dict:
    return campaign_repo.fetch(limit=limit, offset=offset, searchString=searchString, database=database)

def listCarrier(database: str) -> dict:
    return campaign_repo.listCarrier(database=database)

def listFlow(database: str) -> dict:
    return campaign_repo.listFlow(database=database)

def check(campaignname: str, database: str) -> dict:
    result = campaign_repo.check(campaignname=campaignname, database=database)
    return result

"""IVR Blast Trigger"""
def fetchNumbers(campaignid: int, ratiolimit: int, database: str) -> dict:
    return campaign_repo.fetchNumbers(campaignid=campaignid, ratiolimit=ratiolimit, database=database)

async def updateLeadStatus(campaignid: int, lead_number: int, status: str, database: str) -> dict:
    return await campaign_repo.updateLeadStatus(campaignid=campaignid, lead_number=lead_number, status=status, database=database)

async def updateCampaignStatus(campaign_id: int, status: str, database: str) -> dict:
    return await campaign_repo.updateCampaignStatus(campaign_id=campaign_id, status=status, database=database)

def getCampaignStatus(campaignid: int, database: str) -> dict:
    return campaign_repo.getCampaignStatus(campaignid=campaignid, database=database)

def getRemainingLeadsCount(campaignid: int, database: str) -> dict:
    return campaign_repo.getRemainingLeadsCount(campaignid=campaignid, database=database)

def getRatioCount(campaignid: int, database: str) -> dict:
    return campaign_repo.getRatioCount(campaignid=campaignid, database=database)

async def resetCampaignLeads(campaignid: int, database: str) -> dict:
    return await campaign_repo.resetCampaignLeads(campaignid=campaignid, database=database)

def getIvr(campaignid: str, database: str) -> dict:
    result = campaign_repo.getIvr(campaignid=campaignid, database=database)
    return result

""" For Dynamic Caller ID """
def fetchDynamicCallerIds(campaignid: int, batch_count: int, database: str) -> dict:
    return campaign_repo.fetchDynamicCallerIds(campaignid=campaignid, batch_count=batch_count, database=database)

async def updateDynamicCallerIdConfig(campaignid: int, status:str, batch_count: int, database: str) -> dict:
    return await campaign_repo.updateDynamicCallerIdConfig(campaignid=campaignid, status=status, batch_count=batch_count, database=database)

def getDynamicCallerIdConfig(campaign_id: int, database: str) -> dict:
    return campaign_repo.getDynamicCallerIdConfig(campaignid=campaign_id, database=database)

async def updateCarrierIndex(campaign_id: int, new_index: int, database: str) -> dict:
    return await campaign_repo.updateCarrierIndex(campaignid=campaign_id, new_index=new_index, database=database)
