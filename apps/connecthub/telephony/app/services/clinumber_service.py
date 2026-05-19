from fastapi import status
from fastapi.responses import JSONResponse
from config import settings
from models.dto import TokenModel, SMSMember
from repos import clinumber_repo
from typing import List,Dict, Any, Optional
import jwt, httpx
from httpx import RequestError, HTTPStatusError

def decode(token: str):
    try:
        token_data = jwt.decode(token, settings.AUTH_TOKEN_SECRET_KEY, algorithms=[settings.AUTH_TOKEN_ALGORITHM])
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

async def create(database: str, cliNumbers: dict, peerid: int):
    return await clinumber_repo.create(database, [cliNumbers], peerid)

async def update(accountid: int, accountno: str, accountprefix: int, clinumberid: int, clinumbername: str, clinumbertype: str, clinumbercountrycode: str, clinumbercountryname: str, clinumberstatus: str, prefixsubstringcount: int, peerid: int, database: str):
    return await clinumber_repo.update(accountid, accountno, accountprefix, clinumberid, clinumbername, clinumbertype, clinumbercountrycode, clinumbercountryname, clinumberstatus, prefixsubstringcount, peerid, database)

async def delete(clinumberid: int, database:str):
    return await clinumber_repo.delete(clinumberid, database)

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, database: str, accountid: int, accountno: str, memberrole: str) -> dict:
    return await clinumber_repo.fetch(limit, offset, sortField, sortOrder, searchString, database, accountid, accountno, memberrole)

async def map(clinumbername: str, clinumberid: int, clinumbermapname: str, callflowid: Optional[int], callflowname: Optional[str], locationid: Optional[int], memberids: List[int], smsmembers: List[SMSMember], apiIntegration:str, apis: List[Dict[str, Any]], accountid: int, accountno: str, database: str):
    return await clinumber_repo.map(clinumbername, clinumberid, clinumbermapname, callflowid, callflowname, locationid, memberids, smsmembers, apiIntegration, apis, accountid, accountno, database)

async def getCLINumber(clinumberid: int, accountid: int, accountno: str, database: str):
    return await clinumber_repo.getCLINumber(clinumberid, accountid, accountno, database)

async def listAccounts(database: str):
    return await clinumber_repo.listAccounts(database=database)

async def listPeers(database: str):
    return await clinumber_repo.listPeers(database=database)

async def listCallFlows(accountid: int, accountno: str, database: str):
    return await clinumber_repo.listCallFlows(accountid, accountno, database)

async def listMembers(accountid: int, accountno: str, database: str):
    return await clinumber_repo.listMembers(accountid, accountno, database)

async def upload(database: str, cliNumbers: list, peerid:int):
    return await clinumber_repo.create(database, cliNumbers, peerid)
    
async def getPeerID(database: str):
    return await clinumber_repo.getPeerID(database)

async def getAccounts(database: str):
    return await clinumber_repo.getAccounts(database)

async def createCONF(peername: str, peerhost: str, peerpilotno: str, peeroutboundprefix: str, peerinboundprefix: str, clinumbername: str, clinumbertype: str, clinumbercountrycode: str, clinumbercountryname: str, prefixsubstringcount: int, accountid: int, accountno: str, accountname: str, accountprefix: int, accountserviceregion: str):
    payload = {
        "peername": peername,
        "peerpilotno": peerpilotno,
        "peeroutboundprefix": peeroutboundprefix,
        "peerinboundprefix": peerinboundprefix,
        "clinumbername": clinumbername,
        "clinumbertype": clinumbertype,
        "clinumbercountrycode": clinumbercountrycode,
        "clinumbercountryname": clinumbercountryname,
        "prefixsubstringcount": prefixsubstringcount,
        "accountid": accountid,
        "accountno": accountno,
        "accountname": accountname,
        "accountprefix": accountprefix,
        "accountserviceregion": accountserviceregion
    }
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        for scheme in ["http", "https"]:
            url = f"{scheme}://{peerhost}/Connecthub_API/clinumbers_configuration_filewriter.php"
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
            except (RequestError, HTTPStatusError) as e:
                continue
        return None

async def deleteCONF(peerhost: str, clinumbername: str):
    payload = {
        "clinumbername": clinumbername,
    }
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        for scheme in ["http", "https"]:
            url = f"{scheme}://{peerhost}/Connecthub_API/clinumbers_configuration_fileremover.php"
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
            except (RequestError, HTTPStatusError) as e:
                continue
        return None

async def listPhoneNumbers(database: str, accountno: str, memberrole: str):
    return await clinumber_repo.listPhoneNumbers(database, accountno, memberrole)

async def getPhoneNumbers(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, database: str, accountid: int, accountno: str, memberrole: str) -> dict:
    return await clinumber_repo.getPhoneNumbers(limit, offset, sortField, sortOrder, searchString, database, accountid, accountno, memberrole)

async def channelcount(database: str, accountid: int, accountno: str, memberrole: str) -> dict:
    return await clinumber_repo.channelcount(database, accountid, accountno, memberrole)

async def mapCallflow(request: dict, accountid: int, accountno: str, database: str):
    return await clinumber_repo.mapCallflow(request.clinumbername, request.wssurl, request.frequency, accountid, accountno, database)

async def getPassword(extension: str, database: str):
    return await clinumber_repo.getPassword(extension, database)

async def Register(domain: str, extension: str, password: str, database: str):
    xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <document type="freeswitch/xml">
        <section name="directory">
            <domain name="{domain}">
                <user id="{extension}">
                <params>
                    <param name="password" value="{password}"/>
                    <param name="vm-password" value="{extension}"/>
                </params>
                <variables>
                    <variable name="sip-force-contact" value="NDLB-connectile-dysfunction"/>
                    <variable name="toll_allow" value="domestic,international,local"/>
                    <variable name="accountcode" value="{extension}"/>
                    <variable name="user_context" value="webrtc"/>
                    <variable name="effective_caller_id_name" value="Extension {extension}"/>
                    <variable name="effective_caller_id_number" value="{extension}"/>
                    <variable name="outbound_caller_id_name" value="$${{outbound_caller_name}}"/>
                    <variable name="outbound_caller_id_number" value="$${{outbound_caller_id}}"/>
                    <variable name="callgroup" value="techsupport"/>
                </variables>
                </user>
            </domain>
        </section>
    </document>'''
    return xml