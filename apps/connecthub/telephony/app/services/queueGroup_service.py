from fastapi import status, HTTPException
from fastapi.responses import JSONResponse
from config import settings
from models.dto import TokenModel
from repos import queueGroup_repo
from typing import List
from xmlrpc.client import ServerProxy, Error
from urllib.parse import quote
import asyncio, uuid, jwt, os, xml.etree.ElementTree as ET

os.makedirs(settings.FS_EFS_BASE_DIR, exist_ok=True)

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

async def create(queuegroupname: str, queuegroupstrategy: str, queuegrouptimeout: int, agentwaittime: int, memberids: List[int], memberextensions: List[int], proxyid: int, proxyprivateipaddress: str, accountid: int, accountno: str, database: str):
    queuegroupname = queuegroupname.strip()
    queuegroupstrategy = queuegroupstrategy.strip()
    queuegroupid = uuid.uuid4().int & ((1 << 63) - 1)
    mediainstances = await queueGroup_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    mediainstancenames = [mediainstance.m_mediaName for mediainstance in mediainstances]
    if proxyid == 3:
        await queueGroup_repo.createMidReg(queuegroupid, queuegroupname, queuegroupstrategy, queuegrouptimeout, agentwaittime, memberids, memberextensions, mediainstancenames, proxyprivateipaddress, accountid, accountno, database)
    else:
        await queueGroup_repo.create(queuegroupid, queuegroupname, queuegroupstrategy, queuegrouptimeout, agentwaittime, memberids, memberextensions, mediainstancenames, proxyprivateipaddress, accountid, accountno, database)
    return queuegroupid

async def update(oldqueuegroupid: int, queuegroupname: str, queuegroupstrategy: str, queuegrouptimeout: int, agentwaittime: int, memberids: List[int], memberextensions: List[int], proxyid: int, proxyprivateipaddress: str, accountid: int, accountno: str, database: str):
    queuegroupname = queuegroupname.strip()
    queuegroupstrategy = queuegroupstrategy.strip()
    mediainstances = await queueGroup_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    mediainstancenames = [mediainstance.m_mediaName for mediainstance in mediainstances]
    if proxyid == 3:
        await queueGroup_repo.updateMidReg(oldqueuegroupid, queuegroupname, queuegroupstrategy, queuegrouptimeout, agentwaittime, memberids, memberextensions, mediainstancenames, proxyprivateipaddress, accountid, accountno, database)
    else:
        await queueGroup_repo.update(oldqueuegroupid, queuegroupname, queuegroupstrategy, queuegrouptimeout, agentwaittime, memberids, memberextensions, mediainstancenames, proxyprivateipaddress, accountid, accountno, database)
    return oldqueuegroupid

async def delete(queuegroupid: int, accountid: int, accountno: str, database: str):
    return await queueGroup_repo.delete(queuegroupid, accountid, accountno, database)

async def fetch(limit: int, offset: int, sortOrder: str, sortField: str, searchString: any, accountid: int, accountno: str, database: str):
    return await queueGroup_repo.fetch(limit, offset, sortOrder, sortField, searchString, accountid, accountno, database)

async def listMembers(accountid: int, accountno: str, database: str):
    return await queueGroup_repo.listMembers(accountid, accountno, database)

async def createXML(queuegroupid: str, queuegroupstrategy: str, accountno: str, proxyid: int, proxydirectory: str, queuegrouptimeout: int, database: str):
    mediainstances = await queueGroup_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    command = "callcenter_config queue load" + f" {queuegroupid}@{accountno}"
    print(command)
    print(mediainstances)
    tasks = [reloadMod(mediainstance.m_mediaPrivateIPAddress, command) for mediainstance in mediainstances]
    params = {
        "strategy": queuegroupstrategy,
        "moh-sound": "$${hold_music}",
        "time-base-score": "queue",
        "max-wait-time": str(queuegrouptimeout),
        "max-wait-time-with-no-agent": "20",
        "max-wait-time-with-no-agent-time-reached": "5",
        "tier-rules-apply": "true",
        "tier-rule-wait-second": "0",
        "tier-rule-wait-multiply-level": "false",
        "tier-rule-no-agent-no-wait": "true",
        "discard-abandoned-after": "60",
        "abandoned-resume-allowed": "false"
    }
    queue_element = ET.Element("queue", name=f"{queuegroupid}@{accountno}")
    for name, value in params.items():
        ET.SubElement(queue_element, "param", name=name, value=value)
    TARGET_PATH = os.path.join(settings.FS_EFS_BASE_DIR, proxydirectory, "queue")
    os.makedirs(TARGET_PATH, exist_ok=True)
    file_path = os.path.join(TARGET_PATH, f"{queuegroupid}@{accountno}.xml")
    ET.ElementTree(queue_element).write(file_path, encoding="utf-8", xml_declaration=True)
    await asyncio.gather(*tasks, return_exceptions=True)

async def updateXML(oldqueuegroupid: str, queuegroupstrategy: str, accountno: str, proxyid: int, proxydirectory: str, queuegrouptimeout: int, database: str):
    mediainstances = await queueGroup_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    command = "callcenter_config queue reload" + f" {oldqueuegroupid}@{accountno}"
    print(command)
    print(mediainstances)
    tasks = [reloadMod(mediainstance.m_mediaPrivateIPAddress, command) for mediainstance in mediainstances]
    TARGET_PATH = os.path.join(settings.FS_EFS_BASE_DIR, proxydirectory, "queue")
    os.makedirs(TARGET_PATH, exist_ok=True)
    file_path = os.path.join(TARGET_PATH, f"{oldqueuegroupid}@{accountno}.xml")
    if os.path.abspath(file_path).startswith(os.path.abspath(TARGET_PATH)):
        os.remove(file_path)
    params = {
        "strategy": queuegroupstrategy,
        "moh-sound": "$${hold_music}",
        "time-base-score": "queue",
        "max-wait-time": str(queuegrouptimeout),
        "max-wait-time-with-no-agent": "20",
        "max-wait-time-with-no-agent-time-reached": "5",
        "tier-rules-apply": "true",
        "tier-rule-wait-second": "0",
        "tier-rule-wait-multiply-level": "false",
        "tier-rule-no-agent-no-wait": "true",
        "discard-abandoned-after": "60",
        "abandoned-resume-allowed": "false"
    }
    queue_element = ET.Element("queue", name=f"{oldqueuegroupid}@{accountno}")
    for name, value in params.items():
        ET.SubElement(queue_element, "param", name=name, value=value)
    file_path = os.path.join(TARGET_PATH, f"{oldqueuegroupid}@{accountno}.xml")
    ET.ElementTree(queue_element).write(file_path, encoding="utf-8", xml_declaration=True)
    await asyncio.gather(*tasks, return_exceptions=True)

async def deleteXML(queuegroupid: str, accountno: str, proxyid: int, proxydirectory: str, database: str):
    mediainstances = await queueGroup_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    command = "callcenter_config queue unload" + f" {queuegroupid}@{accountno}"
    print(command)
    print(mediainstances)
    tasks = [reloadMod(mediainstance.m_mediaPrivateIPAddress, command) for mediainstance in mediainstances]
    TARGET_PATH = os.path.join(settings.FS_EFS_BASE_DIR, proxydirectory, "queue")
    os.makedirs(TARGET_PATH, exist_ok=True)
    file_path = os.path.join(TARGET_PATH, f"{queuegroupid}@{accountno}.xml")
    if os.path.abspath(file_path).startswith(os.path.abspath(TARGET_PATH)):
        os.remove(file_path)
    await asyncio.gather(*tasks, return_exceptions=True)

async def reloadMod(host: str, command: str):
    def _run_reload():
        print(host)
        username = quote(settings.FS_XML_RPC_USERNAME, safe='')
        password = quote(settings.FS_XML_RPC_PASSWORD, safe='')
        try:
            server = ServerProxy(f"http://{username}:{password}@{host}:{settings.FS_XML_RPC_PORT}/RPC2", allow_none=True)
            respone1 = server.freeswitch.api("reloadxml", "mod_commands")
            response2 = server.freeswitch.api(command, "mod_callcenter")
            print(respone1)
            print(response2)
        except Error as e:
            print(f"XML-RPC Error on {host}: {e}")
            raise HTTPException(status_code=404, detail=f"XML-RPC Error on {host}: {e}")
        except Exception as e:
            print(f"XML-RPC Error on {host}: {e}")
            raise HTTPException(status_code=404, detail=f"Connection failed on {host}: {e}")
    await asyncio.to_thread(_run_reload)
