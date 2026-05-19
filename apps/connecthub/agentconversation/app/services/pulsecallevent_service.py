from fastapi import status
from fastapi.responses import JSONResponse
from producer.kafkaproducer import send_message
from models.dto import TokenModel
from repos import pulsecallevent_repo
from jinja2 import Environment, BaseLoader, StrictUndefined
import jwt, asyncio, os, httpx, json, re, time

KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "livemonitor-topic")
SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

jinja_env = Environment(
    loader=BaseLoader(),
    undefined=StrictUndefined,   # Error if variable missing
    autoescape=False             # We are rendering JSON, not HTML
)

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

async def outboundInit(request: dict, accountid: int, accountno: str, database: str):
    return await pulsecallevent_repo.outboundInit(int(request.phonenumber), request.memberextensionno, request.callid, request.campaignid, accountid, accountno, database)

# async def outboundAnswer(request: dict, database: str):
#     data = {
#         "eventOriginate": request.eventOriginate,
#         "type": request.type,
#         "l_memberExtention": request.l_memberExtention,
#         "l_memberCustomerNumber": request.l_memberCustomerNumber,
#         "l_memberCliNumberId": request.l_memberCliNumberId,
#         "l_memberCallDirection": request.l_memberCallDirection,
#         "l_memberServerIp": request.l_memberServerIp,
#         "l_memberStatus": request.l_memberStatus,
#         "expires": request.expires,
#         "l_memberuuid": request.l_memberuuid
#     }
#     await send_message(KAFKA_TOPIC, "Livemonitor", data)

async def outboundAnswer(request: dict, database: str):
    data = {
        "eventOriginate": "Freeswitch",
        "type": "AgentPresence",
        "l_memberExtention": request.memberextensionno,
        "l_memberCustomerNumber": "",
        "l_memberCliNumberId": "",
        "l_memberCallDirection": "",
        "l_memberServerIp": "",
        "l_memberStatus": "ONCALL",
        "expires": "",
        "l_memberuuid": request.callid
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)

async def outboundTermination(request: dict, database: str):
    data = {
        "l_memberStatus": "COMPLETED",
        "l_memberExtention": request.memberextensionno,
        "l_memberCustomerNumber": "",
        "l_memberCliNumberId": "",
        "l_memberCallDirection": "",
        "l_memberuuid": request.freeuuid,
        "l_memberServerIp": "",
        "eventOriginate": "Freeswitch",
        "l_accountid": request.accountid,
        "type":"AgentPresence"
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)

    # External Integration API Execution - Event - OUTBOUND_CALL_COMPLETED
    asyncio.create_task(executeExternalIntegrationAPI(request, "OUTBOUND_CALL_COMPLETED", database))

    if request.callmode.upper() == 'BROWSER':
        await pulsecallevent_repo.outboundTerminationOne(request.conversationid, request.callid, request.campaignid, request.starttime, request.endtime, request.answertime, database)
        asyncio.create_task(pulsecallevent_repo.outboundTerminationTwo(request.leadid, request.conversationid, request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, request.recordingUrl, database))
    elif request.callmode.upper() == 'SOFTPHONE':
        asyncio.create_task(pulsecallevent_repo.outboundTerminationThree(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, database, request.wss, request.clientUniqueId, request.recordingUrl))

async def executeExternalIntegrationAPI(request: dict, event: str, database: str):
    print("executeExternalIntegrationAPI TRIGGERED")
    print("Event:", event)
    print("Account:", request.accountid)
    print("Incoming clinumber raw:", request.clinumbername)
    print("request:", request)
    externalintegrationapis = await pulsecallevent_repo.getExternalIntegrationAPI(request.clinumbername, request.accountid, event, database)
    if not externalintegrationapis:
        return
    print("APIs Found:", len(externalintegrationapis))
    eventvariables = getEventVariables(request, event)
    print("Event Variables:", eventvariables)
    async with httpx.AsyncClient(timeout=10) as client:
        for api in externalintegrationapis:
            try:
                endpoint = renderEventVariables(api.e_integrationapiEndpoint, eventvariables)
                print("API endpoint:", endpoint)
                headers = renderEventVariables(api.e_integrationapiHeader or {}, eventvariables)
                print("API headers:", headers)
                payload = renderEventVariables(api.e_integrationapiQueryParams or {}, eventvariables)
                print("API payload:", payload)
                method = api.e_integrationapiMethod.upper()
                print("API method:", method)
                start = time.time()
                if method == "GET":
                    response = await client.get(
                        endpoint,
                        headers=headers,
                        params=payload
                    )
                else:
                    response = await client.request(
                        method,
                        endpoint,
                        headers=headers,
                        json=payload
                    )
                responsetime = int((time.time() - start) * 1000)
                print(f"[Webhook Success] {api.e_integrationapiName} Status: {response.status_code}")
                asyncio.create_task(pulsecallevent_repo.logExternalIntegrationAPIStatus(
                    database=database,
                    api_id=api.e_integrationapiId,
                    name=api.e_integrationapiName,
                    endpoint=endpoint,
                    headers=headers,
                    payload=payload,
                    method=method,
                    status="SUCCESS",
                    response_status=response.status_code,
                    response_body=response.text,
                    response_time=responsetime,
                    clinumber=request.clinumbername,
                    accountid=request.accountid,
                    event=event,
                    request_id = request.callid
                ))
            except Exception as e:
                print(f"[Webhook Failed] {api.e_integrationapiName} Error: {str(e)}")
                asyncio.create_task(pulsecallevent_repo.logExternalIntegrationAPIStatus(
                    database=database,
                    api_id=api.e_integrationapiId,
                    name=api.e_integrationapiName,
                    endpoint=endpoint,
                    headers=headers,
                    payload=payload,
                    method=method,
                    status="FAILED",
                    error=str(e),
                    clinumber=request.clinumbername,
                    accountid=request.accountid,
                    event=event,
                    request_id = request.callid
                ))

def getEventVariables(request: dict, event: str):
    if event == "OUTBOUND_CALL_COMPLETED":
        return {
            "agent_extension": request.memberextensionno,
            "agent_phone_number": request.memberphoneno,
            "customer_phone_number": request.customerphoneno,
            "business_phone_number": request.clinumbername,
            "display_phone_number": request.callerName,
            "call_started_at": request.starttime,
            "call_ended_at": request.endtime,
            "call_answered_at": request.answertime,
            "total_duration_seconds": request.duration,
            "talk_duration_seconds": request.talktime,
            "call_status": request.disposition,
            "call_direction": "OUTBOUND",
            "call_ended_by": request.terminationend,
            "recording_url": request.recordingUrl,
            "call_id": request.callid,
            "custom": request.custom
        }
    elif event == "INBOUND_CALL_COMPLETED":
        return {
            "agent_extension": request.memberextensionno,
            "agent_phone_number": request.memberphoneno,
            "customer_phone_number": request.customerphoneno,
            "business_phone_number": request.clinumbername,
            "display_phone_number": request.callerName,
            "call_started_at": request.starttime,
            "call_ended_at": request.endtime,
            "call_answered_at": request.answertime,
            "total_duration_seconds": request.duration,
            "talk_duration_seconds": request.talktime,
            "call_status": request.disposition,
            "call_direction": "INBOUND",
            "call_ended_by": request.terminationend,
            "recording_url": request.recordingUrl,
            "call_id": request.callid
        }
    else:
        return {}
    
def renderEventVariables(data, context):
    if isinstance(data, dict):
        return {
            key: renderEventVariables(value, context)
            for key, value in data.items()
        }
    elif isinstance(data, list):
        return [
            renderEventVariables(item, context)
            for item in data
        ]
    elif isinstance(data, str):
        match = re.fullmatch(r"\{\{\s*([\w\.]+)\s*\}\}", data)
        if match:
            var_path = match.group(1)
            # 🔥 Resolve nested keys like custom.leadId
            value = context
            for part in var_path.split("."):
                if isinstance(value, dict):
                    value = value.get(part)
                else:
                    value = getattr(value, part, None)
                if value is None:
                    break
            return value  # ✅ return original datatype
        # 🔥 Otherwise treat as string template
        template = jinja_env.from_string(data)
        return template.render(**context)
    return data

async def outboundTerminationSarvam(request: dict, database: str):
    print("OK")
    # data = {
    #     "l_memberStatus": "COMPLETED",
    #     "l_memberExtention": request.memberextensionno,
    #     "l_memberCustomerNumber": "",
    #     "l_memberCliNumberId": "",
    #     "l_memberCallDirection": "",
    #     "l_memberuuid": request.freeuuid,
    #     "l_memberServerIp": "",
    #     "eventOriginate": "Freeswitch",
    #     "l_accountid": request.accountid,
    #     "type":"AgentPresence"
    # }
    # await send_message(KAFKA_TOPIC, "Livemonitor", data)
    # if request.callmode.upper() == 'BROWSER':
        # await pulsecallevent_repo.outboundTerminationOne(request.conversationid, request.callid, request.campaignid, request.starttime, request.endtime, request.answertime, database)
        # asyncio.create_task(pulsecallevent_repo.outboundTerminationTwo(request.leadid, request.conversationid, request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, database))
    # elif request.callmode.upper() == 'SOFTPHONE':
        # asyncio.create_task(pulsecallevent_repo.outboundTerminationThree(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, database, request.wss, request.clientUniqueId))


async def inboundInit(request: dict, database: str):
    return await pulsecallevent_repo.inboundInit(request.phonenumber, request.callid, request.accountid, request.accountno, database)

async def inboundAnswer(request: dict, database: str):
    data = {
        "eventOriginate": "Freeswitch",
        "type": "AgentPresence",
        "l_memberExtention": request.memberextensionno,
        "l_memberCustomerNumber": "",
        "l_memberCliNumberId": "",
        "l_memberCallDirection": "",
        "l_memberServerIp": "",
        "l_memberStatus": "ONCALL",
        "expires": "",
        "l_memberuuid": request.callid
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)
    return await pulsecallevent_repo.inboundAnswer(request.phonenumber, request.memberextensionno, request.callid, request.clinumberid, request.accountid, request.accountno, database)

async def inboundTermination(request: dict, database: str):
    data = {
        "l_memberStatus": "COMPLETED",
        "l_memberExtention": request.memberextensionno,
        "l_memberCustomerNumber": "",
        "l_memberCliNumberId": "",
        "l_memberCallDirection": "",
        "l_memberuuid": request.callid,
        "l_memberServerIp": "",
        "eventOriginate": "Freeswitch",
        "l_accountid": request.accountid,
        "type":"AgentPresence"
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)

    # External Integration API Execution - Event - OUTBOUND_CALL_COMPLETED
    asyncio.create_task(executeExternalIntegrationAPI(request, "INBOUND_CALL_COMPLETED", database))

    if request.callmode.upper() == 'BROWSER':
        await pulsecallevent_repo.inboundTerminationOne(request.callid, request.clinumberid, request.starttime, request.endtime, request.answertime, request.accountid, request.accountno, database)
        if request.disposition == "NO ANSWER" and request.onetoone == 1:
            await pulsecallevent_repo.createNotification(request.customerphoneno, request.calldatetime, request.memberextensionno, request.accountid, request.accountno, database)
        asyncio.create_task(pulsecallevent_repo.inboundTerminationTwo(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno,request.callerName, request.clientip, request.recordingUrl, database))
    elif request.callmode.upper() == 'SOFTPHONE':
        asyncio.create_task(pulsecallevent_repo.inboundTerminationThree(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, request.recordingUrl, database))
    else:
        if request.disposition == "NO ANSWER" and request.onetoone == 1:
            await pulsecallevent_repo.createNotification(request.customerphoneno, request.calldatetime, request.memberextensionno, request.accountid, request.accountno, database)
        asyncio.create_task(pulsecallevent_repo.inboundTerminationThree(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, request.recordingUrl, database))

async def inboundAgentAffinity(request: dict, database: str):
    # External Integration API Execution - Event - INBOUND_CALL_RECEIVED
    asyncio.create_task(executeExternalIntegrationAPI(request, request.event, database))

async def Voicemailtoemail(request: dict, database: str):
    return  asyncio.create_task(pulsecallevent_repo.Voicemailtoemail(request,database))

async def OutboundConferenceMerge(request: dict, memberextensionno: int, accountid: int, accountno: str, database: str):
    return await pulsecallevent_repo.OutboundConferenceMerge(request.conversationids, request.conferenceparticipants, int(request.phonenumber), request.leadid, request.callid, int(request.campaignid), memberextensionno, accountid, accountno, database)

async def listNotifications(request: dict, accountid: int, accountno: str, database: str):
    return await pulsecallevent_repo.listNotifications(request.memberextensionno, accountid, accountno, database)

async def listNotificationsUpdate(request: dict, accountid: int, accountno: str, database: str):
    return await pulsecallevent_repo.listNotificationsUpdate(request.memberextensionno, accountid, accountno, database)

async def Predictiveoriginate(request: dict,  database: str):
    return await pulsecallevent_repo.Predictiveoriginate(request, database)

async def PredictiveinboundInit(request: dict, database: str):
    return await pulsecallevent_repo.PredictiveinboundInit(request.phonenumber, request.callid, request.accountid, request.accountno, database)

async def PredictiveinboundAnswer(request: dict, database: str):
    data = {
        "eventOriginate": "Freeswitch",
        "type": "AgentPresence",
        "l_memberExtention": request.memberextensionno,
        "l_memberCustomerNumber": "",
        "l_memberCliNumberId": "",
        "l_memberCallDirection": "",
        "l_memberServerIp": "",
        "l_memberStatus": "ONCALL",
        "expires": "",
        "l_memberuuid": request.callid
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)
    return await pulsecallevent_repo.PredictiveinboundAnswer(request.phonenumber, request.memberextensionno, request.callid, request.clinumberid, request.accountid, request.accountno, request.campaignid, request.predictiveID, database)

async def PredictiveinboundTermination(request: dict, database: str):
    data = {
        "l_memberStatus": "COMPLETED",
        "l_memberExtention": request.memberextensionno,
        "l_memberCustomerNumber": "",
        "l_memberCliNumberId": "",
        "l_memberCallDirection": "",
        "l_memberuuid": request.callid,
        "l_memberServerIp": "",
        "eventOriginate": "Freeswitch",
        "l_accountid": request.accountid,
        "type":"AgentPresence"
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)
    if request.callmode.upper() == 'BROWSER':
        await pulsecallevent_repo.PredictiveinboundTerminationOne(request.callid, request.clinumberid, request.starttime, request.endtime, request.answertime, request.accountid, request.accountno, request.campaignid, request.predictiveID, database)
        if request.disposition == "NO ANSWER" and request.onetoone == 1:
            await pulsecallevent_repo.createNotification(request.customerphoneno, request.calldatetime, request.memberextensionno, request.accountid, request.accountno, database)
        asyncio.create_task(pulsecallevent_repo.PredictiveinboundTerminationTwo(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno,request.callerName, request.clientip, request.recordingUrl, database))
    elif request.callmode.upper() == 'SOFTPHONE':
        asyncio.create_task(pulsecallevent_repo.PredictiveinboundTerminationThree(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, request.recordingUrl, database))
    else:
        if request.disposition == "NO ANSWER" and request.onetoone == 1:
            await pulsecallevent_repo.createNotification(request.customerphoneno, request.calldatetime, request.memberextensionno, request.accountid, request.accountno, database)
        asyncio.create_task(pulsecallevent_repo.PredictiveinboundTerminationThree(request.callmode, request.callid, request.memberextensionno, request.memberphoneno, request.customerphoneno, request.disposition, request.calldatetime, request.starttime, request.endtime, request.answertime, request.duration, request.talktime, request.terminationend, request.campaignid, request.clinumberid, request.clinumbername, request.accountid, request.accountno, request.callerName, request.clientip, request.recordingUrl, database))
