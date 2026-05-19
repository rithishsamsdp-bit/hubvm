from fastapi import status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import peer_repo
import httpx, jwt, os, xml.etree.ElementTree as ET
from httpx import RequestError, HTTPStatusError

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def getTargetedfolder(folder: str, subfolder: str = "external") -> str:
    EFS_BASE_DIR = "/opt/freeswitch/storage"
    path = os.path.join(EFS_BASE_DIR, folder, subfolder)
    os.makedirs(path, exist_ok=True)
    return path

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

async def create(request: dict, database: str):
    peername = request.peername.strip()
    peersecret = request.peersecret.strip()
    peerhost = request.peerhost.strip()
    peerport = request.peerport.strip()
    peerprefix = request.peerprefix.strip()
    peerpilotno = request.peerpilotno.strip()
    peeroutboundprefix = request.peeroutboundprefix.strip()
    peerinboundprefix = request.peerinboundprefix.strip()
    proxyid = request.proxyid.strip()
    proxyname = request.proxyname.strip()
    proxyipaddress = request.proxyipaddress.strip()
    proxydirectoryname = request.proxydirectoryname.strip()
    database = database.strip()
    columnname = 'p_peerName'
    columnvalue = peername
    existingAccount = await peer_repo.validate(columnname, columnvalue, database)
    if not existingAccount:
        await peer_repo.create(peername, peersecret, peerhost, peerport, peerprefix, peerpilotno, peeroutboundprefix, peerinboundprefix, proxyid, proxyname, proxyipaddress, proxydirectoryname, database)
    else:
        raise HTTPException(status_code=409, detail="Peer Name Already Exists")

# async def update(m_accountId: int, m_accountNo: str, accountEncryption: str,m_memberExtensionNo:str, p_peerId: str, p_peerName: str, p_peerSecret: str, p_peerHost: str, p_peerPrefix: str, p_peerPort: str, p_peerType:str, p_peerStatus: str, p_peerPilotno: str, p_peerOutboundPrefix: str, p_peerInboundPrefix: str) -> dict:
#     redis_key = "peer:list" + accountEncryption
#     p_peerId = p_peerId
#     p_peerName = p_peerName.strip()
#     p_peerSecret = p_peerSecret.strip()
#     p_peerHost = p_peerHost
#     p_peerPrefix = p_peerPrefix
#     p_peerPort = p_peerPort
#     p_peerType = p_peerType.strip()
#     p_peerStatus = p_peerStatus.strip()
#     p_peerPilotno = p_peerPilotno.strip()
#     p_peerOutboundPrefix = p_peerOutboundPrefix.strip()
#     p_peerInboundPrefix = p_peerInboundPrefix.strip()
#     accountEncryption = accountEncryption

#     trunkName_val = await  peer_repo.validator('p_peerName', p_peerName.strip(), m_memberExtensionNo, accountEncryption, redis_key, m_accountId, m_accountNo, p_peerId)
#     if  trunkName_val.status_code != 200:
#         return trunkName_val
#     return await peer_repo.update(m_accountId, m_accountNo, accountEncryption, m_memberExtensionNo, p_peerId, p_peerName, p_peerSecret, p_peerHost, p_peerPrefix, p_peerPort, p_peerType, p_peerStatus, p_peerPilotno, p_peerOutboundPrefix, p_peerInboundPrefix, redis_key)

async def delete(request: dict, database: str):
    peerid = int(request.peerid.strip())
    await peer_repo.delete(peerid, database)

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, database: str):
    return await peer_repo.fetch(limit, offset, sortField, sortOrder, searchString, database)

# async def dropdown(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberExtensionNo: str):
#     return await  peer_repo.dropdown(m_accountId, m_accountNo, accountEncryption, m_memberExtensionNo)

# async def validator(vtype: str, vvalue: str, p_peerId: str, m_memberExtensionNo: str, accountEncryption: str, m_accountId: int, m_accountNo: str):
#     accountEncryption = accountEncryption
#     print(vtype)
#     redis_key = "peer:list" + accountEncryption
#     return await peer_repo.validator(vtype, vvalue, m_memberExtensionNo, accountEncryption, redis_key, m_accountId, m_accountNo, p_peerId)

async def WhatsappPeerCreate(request: dict, database: str):
    peername = request.peername.strip()
    peersecret = request.peersecret.strip()
    peerhost = request.peerhost.strip()
    peerport = request.peerport.strip()
    proxyid = request.proxyid.strip()
    proxyname = request.proxyname.strip()
    proxyipaddress = request.proxyipaddress.strip()
    proxydirectoryname = request.proxydirectoryname.strip()
    database = database.strip()
    columnname = 'p_peerName'
    columnvalue = peername
    existingAccount = await peer_repo.validate(columnname, columnvalue, database)
    if not existingAccount:
        await peer_repo.WhatsappPeerCreate(peername, peersecret, peerhost, peerport, proxyid, proxyname, proxyipaddress, proxydirectoryname, database)
    else:
        raise HTTPException(status_code=409, detail="Peer Name Already Exists")

async def WhatsappPeerDelete(request: dict, database: str):
    peerid = int(request.peerid.strip())
    await peer_repo.WhatsappPeerDelete(peerid, database)

async def WhatsappPeerFetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, database: str):
    return await peer_repo.WhatsappPeerFetch(limit, offset, sortField, sortOrder, searchString, database)

async def createXML(peername: str, peersecret: str, peerhost: str, peerport: str, proxydirectoryname: str):
    params = {
        "username": peername,
        "password": peersecret,               
        "realm": peerhost,
        "proxy": f"{peerhost}:{peerport}",
        "register": "false",
        "context": "Pulse-Inbound",
        "extension": peername,
        "caller-id-in-from":"true"
    }
    peernamefile = ET.Element("gateway", name=peername)
    for name, value in params.items():
        ET.SubElement(peernamefile, "param", name=name, value=value)
    TARGET_PATH = getTargetedfolder(proxydirectoryname)
    file_path = os.path.join(TARGET_PATH, f"{peername}.xml")
    ET.ElementTree(peernamefile).write(file_path, encoding="utf-8", xml_declaration=True)

# async def updateXML(p_oldpeerName: str, p_peerName: str, password: str, p_peerHost: str, p_peerPort: str, folder: str):
#     TARGET_PATH = getTargetedfolder(folder)
#     file_path = os.path.join(TARGET_PATH, f"{p_oldpeerName}.xml")
#     if os.path.abspath(file_path).startswith(os.path.abspath(TARGET_PATH)):
#         os.remove(file_path)
#     params = {
#         "username": p_peerName,
#         "password": password,
#         "realm": p_peerHost,
#         "proxy": f"{p_peerHost}:{p_peerPort}",
#         "register": "false",
#         "context": "Pulse-Inbound",
#         "extension": p_peerName,
#         "caller-id-in-from":"true"
#     }
#     peer_element = ET.Element("gateway", name=p_peerName)
#     for name, value in params.items():
#         ET.SubElement(peer_element, "param", name=name, value=value)
#     file_path = os.path.join(TARGET_PATH, f"{p_peerName}.xml")
#     ET.ElementTree(peer_element).write(file_path, encoding="utf-8", xml_declaration=True)

async def deleteXML(peername: str, proxydirectoryname: str):
    TARGET_PATH = getTargetedfolder(proxydirectoryname)
    file_path = os.path.join(TARGET_PATH, f"{peername}.xml")
    if os.path.abspath(file_path).startswith(os.path.abspath(TARGET_PATH)):
        os.remove(file_path)

async def createCONF(peername: str, peersecret: str, peerhost: str, peerport: str, peerpilotno: str, proxyipaddress):
    payload = {
        "peerName": peername,
        "peerSecret": peersecret,
        "peerPort": peerport,
        "peerPilotno": peerpilotno,
        "proxyIPAddress": proxyipaddress
    }
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        for scheme in ["http", "https"]:
            url = f"{scheme}://{peerhost}/Connecthub_API/peer_configuration_filewriter.php"
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
            except (RequestError, HTTPStatusError) as e:
                continue
        return None

async def deleteCONF(peername: str, peerhost: str):
    payload = {
        "peerName": peername
    }
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        for scheme in ["http", "https"]:
            url = f"{scheme}://{peerhost}/Connecthub_API/peer_configuration_fileremover.php"
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
            except (RequestError, HTTPStatusError) as e:
                continue
        return None

async def reachabilityTest(peerhost: str):
    payload = {
        "peerName": peerhost,
    }
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        for scheme in ["http", "https"]:
            url = f"{scheme}://{peerhost}/Connecthub_API/test.php"
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
            except (RequestError, HTTPStatusError) as e:
                continue
        return {
            "message": "Server is Unreachable"
        }