import jwt
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from models.dto import TokenModel, CampaignRules
from repos import campaign_repo
from utils.bcrypt_hashing import HashLib
from datetime import datetime
from typing import Optional, List
import asyncio, uuid, jwt, os, xml.etree.ElementTree as ET
from config import settings
from urllib.parse import quote
from xmlrpc.client import ServerProxy, Error

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

from fastapi import Request
def decode(token_or_request):
    token = None
    if isinstance(token_or_request, str):
        token = token_or_request
    elif isinstance(token_or_request, Request):
        token = token_or_request.cookies.get('accessToken')
        if not token:
            auth_header = token_or_request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
    
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Authentication token missing"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Token Expired"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Token Invalid"},
            headers={"WWW-Authenticate": "Bearer"},
        )

async def create(campaignname: str, membergroupids: List[int], cligroupId: int, formid: int, dialerType: str, campaignRules: CampaignRules, accountid: int, accountno: str, database: str, p_proxyId: int, p_proxyDirectoryName:str):
    campaignname = campaignname.strip()
    return await campaign_repo.create(campaignname, membergroupids, cligroupId, formid, dialerType, campaignRules, accountid, accountno, database, p_proxyId, p_proxyDirectoryName)


async def update(campaignid: int, campaignname: str, membergroupids: List[int], cligroupId: int, formid: int, campaignRules: CampaignRules, accountid: int, accountno: str, database: str):
    return await campaign_repo.update(campaignid, campaignname, membergroupids, cligroupId, formid, campaignRules, accountid, accountno, database)

async def delete(campaignid: int, accountid: int, accountno: str, database: str, p_proxyId: int, p_proxyDirectoryName:str):
    return await campaign_repo.delete(campaignid, accountid, accountno, database, p_proxyId, p_proxyDirectoryName)

async def fetch(m_accountId: int, m_accountNo: int, accountEncryption: any, m_memberRole: str, sortOrder: str, sortField:str, searchString:str, offset: str, limit:str) -> dict:
    return await  campaign_repo.fetch(m_accountId, m_accountNo, accountEncryption, m_memberRole, sortOrder, sortField, searchString, offset, limit)

async def listMemberGroups(m_accountId: int, m_accountNo: str, database: str):
    return await campaign_repo.listMemberGroups(m_accountId, m_accountNo, database=database)

async def phoneNumberGroup(m_accountId: int, m_accountNo: str, database: str):
    return await campaign_repo.phoneNumberGroup(m_accountId, m_accountNo, database=database)

async def form(m_accountId: int, m_accountNo: str, database: str):
    return await campaign_repo.form(m_accountId, m_accountNo, database=database)

async def agentcampaign(m_accountId: int, m_accountNo: str, database: str, m_memberId: int):
    return await campaign_repo.agentcampaign(m_accountId, m_accountNo, database, m_memberId)

async def campaignGetEdit(campaignid: int, accountid: int, accountno: str, database: str):
    return await campaign_repo.campaignGetEdit(campaignid, accountid, accountno, database)

async def campaignGetEdit(campaignid: int, accountid: int, accountno: str, database: str):
    return await campaign_repo.campaignGetEdit(campaignid, accountid, accountno, database)


async def createXML(queuegroupid: str, queuegroupstrategy: str, accountno: str, proxyid: int, proxydirectory: str, database: str):
    mediainstances = await campaign_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    tasks = [reloadMod(mediainstance.m_mediaPrivateIPAddress, "mod_callcenter") for mediainstance in mediainstances]
    params = {
        "strategy": queuegroupstrategy,
        "moh-sound": "$${hold_music}",
        "time-base-score": "system",
        "max-wait-time": "300",
        "max-wait-time-with-no-agent": "20",
        "max-wait-time-with-no-agent-time-reached": "5",
        "tier-rules-apply": "false",
        "tier-rule-wait-second": "300",
        "tier-rule-wait-multiply-level": "true",
        "tier-rule-no-agent-no-wait": "false",
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

async def updateXML(oldqueuegroupid: str, queuegroupstrategy: str, accountno: str, proxyid: int, proxydirectory: str, database: str):
    mediainstances = await campaign_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    tasks = [reloadMod(mediainstance.m_mediaPrivateIPAddress, "mod_callcenter") for mediainstance in mediainstances]
    TARGET_PATH = os.path.join(settings.FS_EFS_BASE_DIR, proxydirectory, "queue")
    os.makedirs(TARGET_PATH, exist_ok=True)
    file_path = os.path.join(TARGET_PATH, f"{oldqueuegroupid}@{accountno}.xml")
    if os.path.abspath(file_path).startswith(os.path.abspath(TARGET_PATH)):
        os.remove(file_path)
    params = {
        "strategy": queuegroupstrategy,
        "moh-sound": "$${hold_music}",
        "time-base-score": "system",
        "max-wait-time": "300",
        "max-wait-time-with-no-agent": "20",
        "max-wait-time-with-no-agent-time-reached": "5",
        "tier-rules-apply": "false",
        "tier-rule-wait-second": "300",
        "tier-rule-wait-multiply-level": "true",
        "tier-rule-no-agent-no-wait": "false",
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
    mediainstances = await campaign_repo.getMediaInstances(proxyid, database)
    if not mediainstances:
        raise HTTPException(status_code=404, detail="No media instances found")
    tasks = [reloadMod(mediainstance.m_mediaPrivateIPAddress, "mod_callcenter") for mediainstance in mediainstances]
    TARGET_PATH = os.path.join(settings.FS_EFS_BASE_DIR, proxydirectory, "queue")
    os.makedirs(TARGET_PATH, exist_ok=True)
    file_path = os.path.join(TARGET_PATH, f"{queuegroupid}@{accountno}.xml")
    if os.path.abspath(file_path).startswith(os.path.abspath(TARGET_PATH)):
        os.remove(file_path)
    await asyncio.gather(*tasks, return_exceptions=True)

async def reloadMod(host: str, module: str):
    def _run_reload():
        username = quote(settings.FS_XML_RPC_USERNAME, safe='')
        password = quote(settings.FS_XML_RPC_PASSWORD, safe='')
        try:
            server = ServerProxy(f"http://{username}:{password}@{host}:{settings.FS_XML_RPC_PORT}/RPC2", allow_none=True)
            server.freeswitch.api("reload", module)
        except Error as e:
            raise HTTPException(status_code=404, detail=f"XML-RPC Error on {host}: {e}")
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Connection failed on {host}: {e}")
    await asyncio.to_thread(_run_reload)

async def campaignstart(accountEncryption: str, m_accountId: str,m_accountNo: str,campid: int):
    return await campaign_repo.campaignstart( accountEncryption, m_accountId, m_accountNo, campid)

from db.context import asyncClientFactory

# Cache for already indexed collections to avoid redundant calls
INDEXED_COLLECTIONS = set()

async def ensure_indexes(collection):
    coll_name = collection.name
    if coll_name in INDEXED_COLLECTIONS:
        return
    
    try:
        # Index on campaign ID (Used for filtering dashboard/leads)
        await collection.create_index([("p_leadCampaignID", 1)])
        # Index on phone number (Used for search)
        await collection.create_index([("p_leadPhoneNumber", 1)])
        # Index on Status & Result (Used for aggregation)
        await collection.create_index([("p_leadStatus", 1)])
        await collection.create_index([("p_leadLastResult", 1)])
        # Index on next call time (Used for dialer engine)
        await collection.create_index([("p_leadnextCallTime", 1)])
        
        INDEXED_COLLECTIONS.add(coll_name)
    except Exception as e:
        print(f"Index creation failed for {coll_name}: {e}")

async def getleads(account_id: int, campaign_id: int, limit: int = 100, offset: int = 0, searchString: str = "", status: str = "", lastResult: str = ""):
    _, db = asyncClientFactory("onedbpredectiveleads")
    collection = db[str(account_id)]
    await ensure_indexes(collection)
    
    query = {"p_leadCampaignID": int(campaign_id)}
    if status:
        query["p_leadStatus"] = status
    if lastResult:
        query["p_leadLastResult"] = lastResult
    
    # Handle search string for phone number or lead ID
    if searchString:
        query["$or"] = [
            {"p_leadPhoneNumber": {"$regex": searchString, "$options": "i"}},
            {"p_leadID": {"$regex": searchString, "$options": "i"}}
        ]
    
    # Query leads for this campaign with pagination
    cursor = collection.find(query).skip(offset).limit(limit)
    leads = await cursor.to_list(length=limit)
    
    # Convert ObjectId and other non-serializable fields
    for lead in leads:
        lead["_id"] = str(lead["_id"])
        
    # Get counts for the campaign summary
    total_count = await collection.count_documents({"p_leadCampaignID": campaign_id})
    new_count = await collection.count_documents({"p_leadCampaignID": campaign_id, "p_leadStatus": "NEW"})
    answered_count = await collection.count_documents({"p_leadCampaignID": campaign_id, "p_leadLastResult": "ANSWERED"})
    no_answer_count = await collection.count_documents({"p_leadCampaignID": campaign_id, "p_leadLastResult": {"$in": ["NO ANSWER", "NO_ANSWER"]}})
    failed_count = await collection.count_documents({"p_leadCampaignID": campaign_id, "p_leadLastResult": {"$in": ["FAILED", "STALE_CALL"]}})
    
    return {
        "leads": leads, 
        "totalCount": total_count,
        "newCount": new_count,
        "answeredCount": answered_count,
        "noAnswerCount": no_answer_count,
        "failedCount": failed_count
    }

async def getDashboardHeader(account_id: int, campaign_id: int = None):
    _, db = asyncClientFactory("onedbpredectiveleads")
    collection = db[str(account_id)]
    await ensure_indexes(collection)

    # Global Match Condition
    match_condition = {}
    if campaign_id:
        match_condition["p_leadCampaignID"] = int(campaign_id)

    # Pipeline for global counts
    pipeline = []
    if match_condition:
        pipeline.append({"$match": match_condition})
    
    pipeline.append({
        "$group": {
            "_id": {
                "p_leadStatus": "$p_leadStatus",
                "p_leadLastResult": "$p_leadLastResult"
            },
            "count": {"$sum": 1},
            "totalAttempts": {"$sum": "$p_totalAttempts"},
            "retrySuccess": {
                "$sum": {
                    "$cond": [
                        {"$and": [{"$gt": ["$p_totalAttempts", 1]}, {"$eq": ["$p_leadLastResult", "ANSWERED"]}]},
                        1,
                        0
                    ]
                }
            }
        }
    })

    cursor = collection.aggregate(pipeline)
    results = await cursor.to_list(length=None)

    # Initialize stats
    stats = {
        "totalLeads": 0,
        "newLeads": 0,
        "completedLeads": 0,
        "answeredCount": 0,
        "noAnswerCount": 0,
        "failedCount": 0,
        "totalRetries": 0,
        "retrySuccess": 0
    }

    for res in results:
        count = res.get("count", 0)
        _id = res.get("_id", {})
        status = _id.get("p_leadStatus")
        result = _id.get("p_leadLastResult")
        
        # Increment total retries (total attempts - first call for each lead in this group)
        stats["totalRetries"] += (res.get("totalAttempts", 0) - count)
        stats["retrySuccess"] += res.get("retrySuccess", 0)

        stats["totalLeads"] += count

        if status == "NEW":
            stats["newLeads"] += count
        elif status == "COMPLETED":
            stats["completedLeads"] += count
        
        if result == "ANSWERED":
            stats["answeredCount"] += count
        elif result in ["NO ANSWER", "NO_ANSWER"]:
            stats["noAnswerCount"] += count
        elif result in ["FAILED", "STALE_CALL"] or status == "FAILED":
            stats["failedCount"] += count

    # Pipeline for Daily Volume (Current Week data starting from Mon 00:00 IST)
    import time
    from datetime import datetime, timedelta
    
    now_ts = int(time.time())
    # Current time in IST for calculating weekday
    ist_now = datetime.fromtimestamp(now_ts) + timedelta(hours=5, minutes=30)
    # Find most recent Monday 00:00 IST
    days_since_monday = ist_now.weekday() # Mon=0, Tue=1...
    current_monday_start_ist = ist_now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
    # Convert Monday start IST back to UTC timestamp (subtract 5.5 hours)
    start_of_week_ts = int((current_monday_start_ist - timedelta(hours=5, minutes=30)).timestamp())

    daily_pipeline = []
    daily_match = {
        "p_leadLastResult": {"$in": ["ANSWERED", "NO ANSWER", "FAILED", "STALE_CALL"]},
        "p_leadlastAttemptDate": {"$gte": start_of_week_ts}
    }
    if campaign_id:
        daily_match["p_leadCampaignID"] = int(campaign_id)
    
    daily_pipeline.append({"$match": daily_match})
    daily_pipeline.extend([
        {
            "$project": {
                "day": {
                    "$dayOfWeek": {
                        "date": {
                            "$cond": {
                                "if": { "$ifNull": ["$p_leadlastAttemptDate", False] },
                                "then": { "$toDate": { "$multiply": ["$p_leadlastAttemptDate", 1000] } },
                                "else": {
                                    "$cond": {
                                        "if": { "$ifNull": ["$p_createdAt", False] },
                                        "then": { "$toDate": { "$multiply": ["$p_createdAt", 1000] } },
                                        "else": { "$toDate": "$_id" }
                                    }
                                }
                            }
                        },
                        "timezone": "Asia/Kolkata"
                    }
                },
                "p_leadLastResult": 1
            }
        },
        {
            "$group": {
                "_id": {"day": "$day", "result": "$p_leadLastResult"},
                "count": {"$sum": 1}
            }
        }
    ])

    daily_cursor = collection.aggregate(daily_pipeline)
    daily_results = await daily_cursor.to_list(length=None)

    # Initialize daily stats for Mon-Sun (MongoDB dayOfWeek: 1=Sun, 2=Mon... 7=Sat)
    daily_data = {i: {"answered": 0, "noAnswer": 0, "failed": 0} for i in range(1, 8)}
    for res in daily_results:
        day = res["_id"]["day"]
        result = res["_id"]["result"]
        count = res["count"]
        if result == "ANSWERED":
            daily_data[day]["answered"] = count
        elif result == "NO ANSWER":
            daily_data[day]["noAnswer"] = count
        elif result in ["FAILED", "STALE_CALL"]:
            daily_data[day]["failed"] += count

    # Map to UI format [{name: 'Mon', answered: 10, noAnswer: 5, failed: 2}, ...]
    day_map = {2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat", 1: "Sun"}
    stats["dailyCallVolume"] = [
        {"name": day_map[i], "answered": daily_data[i]["answered"], "noAnswer": daily_data[i]["noAnswer"], "failed": daily_data[i]["failed"]}
        for i in [2, 3, 4, 5, 6, 7, 1]
    ]

    # Real-time stats from MySQL
    real_time_stats = await campaign_repo.getPredictiveStats(account_id, campaign_id)
    
    # Helper to safely convert Decimal to float
    def to_float(val):
        from decimal import Decimal
        return float(val) if isinstance(val, Decimal) else val

    if campaign_id:
        if real_time_stats:
            # Convert row mapping to dict and handle Decimal serialization
            real_time_dict = dict(real_time_stats)
            # Merge or add new keys with Decimal handling
            stats.update({
                "activeCalls": to_float(real_time_dict.get("p_predictiveactiveCalls", 0)),
                "availableAgents": to_float(real_time_dict.get("p_predictiveAvailableAgents", 0)),
                "callsTodayRealTime": to_float(real_time_dict.get("p_predictiveCallsToday", 0)),
                "connectedTodayRealTime": to_float(real_time_dict.get("p_predictiveCallsConnectedToday", 0)),
                "totalCallsRealTime": to_float(real_time_dict.get("p_predictiveTotalCalls", 0)),
                "totalConnectedRealTime": to_float(real_time_dict.get("p_predictiveTotalConnected", 0)),
                "currentRatio": to_float(real_time_dict.get("p_predictiveCurrentRatio", 0)),
                "campaignLiveStats": [{
                    "campaignId": real_time_dict.get("p_predictiveCampaignId"),
                    "campaignName": real_time_dict.get("campaignName"),
                    "activeCalls": to_float(real_time_dict.get("p_predictiveactiveCalls", 0)),
                    "availableAgents": to_float(real_time_dict.get("p_predictiveAvailableAgents", 0)),
                    "callsToday": to_float(real_time_dict.get("p_predictiveCallsToday", 0)),
                    "connectedToday": to_float(real_time_dict.get("p_predictiveCallsConnectedToday", 0)),
                    "totalCalls": to_float(real_time_dict.get("p_predictiveTotalCalls", 0)),
                    "totalConnected": to_float(real_time_dict.get("p_predictiveTotalConnected", 0)),
                    "ratio": to_float(real_time_dict.get("p_predictiveCurrentRatio", 0))
                }]
            })
        else:
            stats.update({
                "activeCalls": 0, "availableAgents": 0, "callsTodayRealTime": 0,
                "connectedTodayRealTime": 0, "totalCallsRealTime": 0,
                "totalConnectedRealTime": 0, "currentRatio": 0,
                "campaignLiveStats": []
            })
    else:
        # Case for "All Campaigns" - returning list
        live_list = []
        aggregates = {
            "activeCalls": 0, "availableAgents": 0, "callsTodayRealTime": 0,
            "connectedTodayRealTime": 0, "totalCallsRealTime": 0,
            "totalConnectedRealTime": 0, "currentRatio": 0
        }
        
        if real_time_stats:
            for item in real_time_stats:
                d = dict(item)
                live_item = {
                    "campaignId": d.get("p_predictiveCampaignId"),
                    "campaignName": d.get("campaignName"),
                    "activeCalls": to_float(d.get("p_predictiveactiveCalls", 0)),
                    "availableAgents": to_float(d.get("p_predictiveAvailableAgents", 0)),
                    "callsToday": to_float(d.get("p_predictiveCallsToday", 0)),
                    "connectedToday": to_float(d.get("p_predictiveCallsConnectedToday", 0)),
                    "totalCalls": to_float(d.get("p_predictiveTotalCalls", 0)),
                    "totalConnected": to_float(d.get("p_predictiveTotalConnected", 0)),
                    "ratio": to_float(d.get("p_predictiveCurrentRatio", 0))
                }
                live_list.append(live_item)
                
                # Aggregate for summary cards
                aggregates["activeCalls"] += live_item["activeCalls"]
                aggregates["availableAgents"] += live_item["availableAgents"]
                aggregates["callsTodayRealTime"] += live_item["callsToday"]
                aggregates["connectedTodayRealTime"] += live_item["connectedToday"]
                aggregates["totalCallsRealTime"] += live_item["totalCalls"]
                aggregates["totalConnectedRealTime"] += live_item["totalConnected"]
                # Ratio average if needed
            
            if len(live_list) > 0:
                 aggregates["currentRatio"] = sum(item["ratio"] for item in live_list) / len(live_list)
        
        stats.update(aggregates)
        stats["campaignLiveStats"] = live_list

    # Calculate Success Rate for retry stats
    called_total = stats["answeredCount"] + stats["noAnswerCount"] + stats["failedCount"]
    stats["successRate"] = round((stats["answeredCount"] / called_total * 100), 1) if called_total > 0 else 0

    return stats

async def campaignstop(accountEncryption: str, m_accountId: str, m_accountNo: str, campid: int):
    return await campaign_repo.campaignstop(accountEncryption, m_accountId, m_accountNo, campid)
