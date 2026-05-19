import re
import json
import aiohttp
import boto3
import random
import string
import pymongo
from pymongo import MongoClient, DESCENDING
from io import StringIO
import pandas as pd
import requests
from datetime import datetime, timezone, timedelta,date
from config import settings
import time
from urllib.parse import urlparse
from bson import ObjectId
from sqlalchemy import select,and_,insert
from db.context import asyncSessionFactory
from utils.sha256_hashing import alphanumericUniqueId
from models.db import WhatsappAccounts,Leads,Conversations,Members,CampaignWhatsApp,CampaignLeadsWhatsApp
from producer.kafkaproducer import send_message
import os
from fastapi.encoders import jsonable_encoder
from fastapi import  HTTPException
import asyncio








def json_default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError


KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "whatsupdlr")
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net")

# Global MongoDB Client with SSL/TLS options
try:
    mongo_client = pymongo.MongoClient(
        MONGO_URI,
        tls=True,
        tlsAllowInvalidCertificates=True, # Fallback for environment-specific SSL issues
        connectTimeoutMS=20000,
        retryWrites=True
    )
    print("✅ MongoDB Global Client Initialized")
except Exception as e:
    print(f"❌ Failed to initialize MongoDB Client: {e}")
    mongo_client = None


#--------------------------#
# Template creation starts #
#--------------------------#

async def createTemplate(
    tempName: str, tempCategory: str, selectLan: str, headerType: str, headerValue: str,
    mediaType: str, mediaExtType: str, bodyContent: str, footerContent: str,
    btnType: str, btnNameVm: str, wUrl: str, btnNameCpn: str, phoneNum: str,
    Phone_Code: str, btn1: str, btn2: str, btn3: str, btn4: str, btn5: str, s3_URL: str, database: str,
    accountId: str, accountNo: str
):
    """Creates a WhatsApp template and stores metadata in MongoDB.."""

    # ✅ Create async session
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        result = await session.execute(
            select(WhatsappAccounts).where(WhatsappAccounts.w_accountId == accountId).limit(1)
        )
        fetchWhatsappDetails = result.scalars().first()

        if not fetchWhatsappDetails:
            return {"error": "Account not found"}

        pn_Waba_Id = fetchWhatsappDetails.w_phNumberId
        pn_Apikey = fetchWhatsappDetails.w_apiKey
        w_wabaID = fetchWhatsappDetails.w_wabaID

    # ✅ Clean up and process body content
    bodyContent = bodyContent.replace("\\r", "").replace("\\n", "")
    matches = re.findall(r"\{\{(.*?)\}\}", bodyContent)
    variableCount = len(matches)

    print(f'bodyContent: {bodyContent}')
    print(f'variableCount: {variableCount}')
    print(f'btnType:{type(btnType)}')
    print(f'btnType:{btnType}')
    

    variableData = generate_example_structure(variableCount) if variableCount > 0 else {}

    # ✅ HEADER TYPE HANDLING
    if headerType == 'None':
        print("No header type selected.")

    elif headerType == 'Text':
        btnPayload = buttontype(btnType, btnNameVm, wUrl, btnNameCpn, phoneNum, Phone_Code, btn1, btn2, btn3, btn4, btn5)

        components = [
            {
                "type": "BODY",
                "text": bodyContent,
                **variableData
            },
            {
                "type": "FOOTER",
                "text": footerContent
            }
        ]

        # Add buttons only if btnType is valid
        if btnType not in [None, '', 'None'] and btnPayload:
            components.append({
                "type": "BUTTONS",
                "buttons": btnPayload
            })
            

        url = f"https://partnersv1.pinbot.ai/v3/{w_wabaID}/message_templates"
        payload = json.dumps({
            "name": tempName,
            "language": selectLan,
            "category": tempCategory,
            "components": components
        })
        
        headers = {
            'apikey': pn_Apikey,
            'Content-Type': 'application/json'
        }

        apiResponse = requests.post(url, headers=headers, data=payload)
        print(url)
        print(payload)
        print(headers)
        templateStatus = apiResponse.text

        print(f"Template Response: {templateStatus}")
        
        # Check if API returned an error
        try:
            response_data = json.loads(templateStatus)
            if "error" in response_data:
                return {"statusCode": apiResponse.status_code, "response": response_data, "body": templateStatus}
        except:
            pass
        
        # Only insert to DB if template creation was successful
        insertTextDatas(payload, tempName, selectLan, accountId, accountNo, templateStatus, variableCount)

        return {"statusCode": apiResponse.status_code, "response": json.loads(templateStatus)}

    elif headerType == 'Media':
        parsed = urlparse(s3_URL)
        bucket_name = parsed.netloc.split('.')[0]
        object_key = parsed.path.lstrip('/')
        s3_client = boto3.client('s3', region_name='ap-south-1')
        response = s3_client.head_object(Bucket=bucket_name, Key=object_key)
        fileSize = response['ContentLength']
        fileType = response['ContentType']
        
        print(f"fileSize:{fileSize}")
        print(f"fileType:{fileType}")

        headFormat = {
            'IMG': 'image',
            'VIDEO': 'video',
            'DOC': 'document'
        }.get(mediaType, 'image')

        sessionResponse = getMediaSession(fileSize, fileType, s3_URL, pn_Apikey)
        print(f"sessionResponse:{sessionResponse}")
        parsed_response = json.loads(sessionResponse['api_response'])
        h_value = parsed_response.get('h')

        btnPayload = buttontype(btnType, btnNameVm, wUrl, btnNameCpn, phoneNum, Phone_Code, btn1, btn2, btn3, btn4, btn5)

        components = [
            {
                "type": "HEADER",
                "format": headFormat,
                "example": {
                    "header_handle": [h_value]
                }
            },
            {
                "type": "BODY",
                "text": bodyContent,
                **variableData
            },
            {
                "type": "FOOTER",
                "text": footerContent
            }
        ]

        # Add buttons only if btnType is valid
        if btnType not in [None, '', 'None'] and btnPayload:
            components.append({
                "type": "BUTTONS",
                "buttons": btnPayload
            })

        payload = json.dumps({
            "name": tempName,
            "category": tempCategory,
            "components": components,
            "language": selectLan,
            "allow_category_change": True
        })

        headers = {
            'apikey': pn_Apikey,
            'Content-Type': 'application/json'
        }

        url = f"https://partnersv1.pinbot.ai/v3/{w_wabaID}/message_templates"
        apiResponse = requests.post(url, headers=headers, data=payload)
        templateStatus = apiResponse.text

        print(f"Template Media Response: {templateStatus}")
        
        # Check if API returned an error
        try:
            response_data = apiResponse.json()
            if "error" in response_data:
                return {
                    "statusCode": apiResponse.status_code,
                    "body": templateStatus,
                    "headers": {"Content-Type": "application/json"}
                }
        except:
            pass
        
        # Only insert to DB if template creation was successful
        insertMediaDatas(payload, tempName, selectLan, accountId, accountNo, headFormat, wUrl, templateStatus, variableCount, mediaType)

        return {
            "statusCode": apiResponse.status_code,
            "body": templateStatus,
            "headers": {"Content-Type": "application/json"}
        }


def get_buttons(btn1, btn2, btn3, btn4, btn5):
    return [{"type": "quick_reply", "text": btn} for btn in (btn1, btn2, btn3, btn4, btn5) if btn and btn != 'N/A']


def buttontype(btnType, btnNameVm, wUrl, btnNameCpn, phoneNum, Phone_Code, btn1, btn2, btn3, btn4, btn5):
    if btnType in ['cta', 'CTA']:
        payload = []
        if btnNameCpn and btnNameCpn != 'N/A':
            payload.append({
                "type": "phone_number",
                "text": btnNameCpn,
                "phone_number": f"+{Phone_Code}{phoneNum}"
            })
        if btnNameVm and btnNameVm != 'N/A':
            payload.append({
                "type": "url",
                "text": btnNameVm,
                "url": wUrl
            })
        return payload

    elif btnType in ['qr', 'QR']:
        return get_buttons(btn1, btn2, btn3, btn4, btn5)

    return []


def insertTextDatas(payload, tempName, selectLan, accountId, accountNo, templateStatus, variableCount):

    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
    
    client = mongo_client
    db = client['whatsappConnecthub']
    collection = db['templeteDetails']
    masterDB = client["whatsappConnecthubMaster"]
    master = masterDB['whatsAppMaster']

    data = json.loads(templateStatus)
    tempId = data.get('id')
    if not tempId:
        print(f"Skipping entry without 'id': {data}")
        return False

    variableDatas = [{"type": "text", "text": f"${{variable{i}}}"} for i in range(1, variableCount + 1)] if variableCount > 0 else []

    result1 = collection.insert_one({
        'template_structure': json.loads(payload),
        'template_payload': {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": "${MSISDN}",
            "type": "template",
            "template": {
                "name": tempName,
                "language": {"code": selectLan},
                "components": [{"type": "body", "parameters": variableDatas}]
            }
        },
        'templateStatus': data,
        'variableCount': variableCount,
        "accountId": accountId,
        "accountNo": accountNo,
        'createdOn': datetime.utcnow()
    })

    # Insert into whatsAppMaster
    result2 = master.insert_one({
        "action": "template_status",
        "id": tempId,
        "tmpname": tempName,
        "accountId": accountId,
        "accountNo": accountNo,
        'createdOn': datetime.utcnow()
    })

    # ✅ Check insertion
    if result1.inserted_id and result2.inserted_id:
        print(f"✅ Data inserted successfully into both collections.")
        print(f"templeteDetails ID: {result1.inserted_id}")
        print(f"whatsAppMaster ID: {result2.inserted_id}")
        return True
    else:
        print("❌ Insertion failed.")
        return False

def insertMediaDatas(payload, tempName, selectLan, accountId, accountNo, headFormat, s3_URL, templateStatus, variableCount,mediaType):
    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
    
    client = mongo_client
    db = client['whatsappConnecthub']
    collection = db['templeteDetails']
    masterDB = client["whatsappConnecthubMaster"]
    master = masterDB['whatsAppMaster']

    data = json.loads(templateStatus)
    tempId = data.get('id')
    if not tempId:
        print(f"Skipping entry without 'id': {data}")
        return

    variableDatas = [{"type": "text", "text": f"${{variable{i}}}"} for i in range(1, variableCount + 1)] if variableCount > 0 else []

    collection.insert_one({
        'template_structure': json.loads(payload),
        'template_payload': {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": "${MSISDN}",
            "type": "template",
            "template": {
                "name": tempName,
                "language": {"code": selectLan},
                "components": [
                    {
                        "type": "header",
                        "parameters": [{
                            "type": headFormat,
                            headFormat: {"link": s3_URL}
                        }]
                    },
                    {"type": "body", "parameters": variableDatas}
                ]
            }
        },
        'templateStatus': data,
        'variableCount': variableCount,
        "accountId": accountId,
        "accountNo": accountNo,
        'createdOn': datetime.utcnow()
    })

    master.insert_one({
        "action": "template_status",
        "id": tempId,
        "tmpname": tempName,
        "accountId": accountId,
        "accountNo": accountNo,
        'createdOn': datetime.utcnow()
    })


def getMediaSession(fileSize, fileType, s3_URL, pn_Apikey):
    url = f"https://partnersv1.pinbot.ai/v3/app/uploads?file_length={fileSize}&file_type={fileType}"
    print(f"url:{url},pn_Apikey:{pn_Apikey}")
    headers = {'apikey': pn_Apikey}
    sessionResponse = requests.post(url, headers=headers)
    print(f"sessionResponse:{sessionResponse}")
    if sessionResponse.status_code != 200:
        return {'statusCode': sessionResponse.status_code, 'error': sessionResponse.text}

    data = sessionResponse.json()
    sessionId = data.get('id')
    if not sessionId:
        return {'statusCode': 400, 'error': "Missing 'id' in upload session response"}

    parsed = urlparse(s3_URL)
    bucket_name = parsed.netloc.split('.')[0]
    object_key = parsed.path.lstrip('/')

    s3 = boto3.client('s3')
    s3_object = s3.get_object(Bucket=bucket_name, Key=object_key)
    file_bytes = s3_object['Body'].read()
    content_type = s3_object['ContentType']

    headers = {'apikey': pn_Apikey, 'Content-Type': content_type}
    upload_url = f"https://partnersv1.pinbot.ai/v3/{sessionId}"
    response = requests.post(upload_url, headers=headers, data=file_bytes)
    
    print(f"getMediaSessionresponse{response}")

    return {'statusCode': response.status_code, 'api_response': response.text}


def generate_example_structure(variableCount):
    body_text = [["".join(random.choices(string.ascii_letters, k=6)) for _ in range(variableCount)]]
    return {"example": {"body_text": body_text}}


#------------------------#
# Template creation ends #
#------------------------#


#----------------------------#
# Template deletion starts   #
#----------------------------#

async def deleteTemplate(templateName: str, database: str, accountId: str, accountNo: str):
    """Deletes a WhatsApp template from the API and MongoDB."""
    
    # Get WhatsApp account details
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        result = await session.execute(
            select(WhatsappAccounts).where(WhatsappAccounts.w_accountId == accountId).limit(1)
        )
        fetchWhatsappDetails = result.scalars().first()

        if not fetchWhatsappDetails:
            return {"error": "Account not found", "statusCode": 404}

        pn_Apikey = fetchWhatsappDetails.w_apiKey
        w_wabaID = fetchWhatsappDetails.w_wabaID

    # Call WhatsApp API to delete template
    url = f"https://partnersv1.pinbot.ai/v3/{w_wabaID}/message_templates?name={templateName}"
    headers = {
        'apikey': pn_Apikey
    }

    print(f"Deleting template: {templateName}")
    print(f"URL: {url}")

    apiResponse = requests.delete(url, headers=headers)
    responseText = apiResponse.text

    print(f"Delete Response: {responseText}")

    # Parse API response
    api_error = None
    try:
        response_data = json.loads(responseText)
        if "error" in response_data:
            api_error = response_data.get("error", {}).get("message", "Failed to delete from WhatsApp")
    except:
        pass

    # Always delete from MongoDB regardless of API response
    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
    
    client = mongo_client
    db = client['whatsappConnecthub']
    collection = db['templeteDetails']
    masterDB = client["whatsappConnecthubMaster"]
    master = masterDB['whatsAppMaster']

    # Convert accountId to int for matching (DB stores as integer)
    try:
        accountIdInt = int(accountId)
    except:
        accountIdInt = accountId

    # Delete from templeteDetails - handle both old (no accountId) and new documents
    # Also handle accountId as both string and integer
    deleteResult1 = collection.delete_many({
        "$or": [
            {
                "accountId": accountIdInt,
                "accountNo": accountNo,
                "template_structure.name": templateName
            },
            {
                "accountId": accountId,
                "accountNo": accountNo,
                "template_structure.name": templateName
            },
            {
                "accountId": {"$exists": False},
                "template_structure.name": templateName
            }
        ]
    })

    # Delete from whatsAppMaster
    deleteResult2 = master.delete_many({
        "$or": [
            {
                "accountId": accountIdInt,
                "accountNo": accountNo,
                "tmpname": templateName
            },
            {
                "accountId": accountId,
                "accountNo": accountNo,
                "tmpname": templateName
            },
            {
                "accountId": {"$exists": False},
                "tmpname": templateName
            }
        ]
    })


    print(f"Deleted {deleteResult1.deleted_count} from templeteDetails")
    print(f"Deleted {deleteResult2.deleted_count} from whatsAppMaster")

    return {
        "statusCode": 200,
        "message": f"Template '{templateName}' deleted successfully",
        "deletedFromDB": deleteResult1.deleted_count + deleteResult2.deleted_count,
        "apiStatus": apiResponse.status_code,
        "apiError": api_error
    }

#--------------------------#
# Template deletion ends   #
#--------------------------#




#------------------------------#
# Fetch single template starts #
#------------------------------#

async def fetch_whatsapp_template(templateId, accountId: str, accountNo: str):
    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
    
    client = mongo_client
    db = client["whatsappConnecthub"]
    collection = db["templeteDetails"]
    fetchData = list(collection.find({"accountId": accountId, "accountNo": accountNo,"templateStatus.id": templateId}))
    print(fetchData)
    

    # Convert ObjectId to string so it's JSON safe
    result = convert_objectid_to_str(fetchData)

    return {"templates": result}


def convert_objectid_to_str(document):
    """Convert Mongo ObjectId fields to string recursively"""
    if isinstance(document, list):
        return [convert_objectid_to_str(d) for d in document]
    elif isinstance(document, dict):
        return {
            k: (str(v) if isinstance(v, ObjectId) else convert_objectid_to_str(v))
            for k, v in document.items()
        }
    else:
        return document
    
#----------------------------#
# Fetch single template ends #
#----------------------------#




#----------------------------------#
# Fetch template for report starts #
#----------------------------------#

async def fetch_whatsapp_template_report(limit,offset,searchString,sortField,sortOrder, accountId, accountNo):
    
    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
    
    client = mongo_client
    db = client["whatsappConnecthub"]
    collection = db["templeteDetails"]
    
    # Base query for account
    query = {"accountId": accountId, "accountNo": accountNo}

    # Add text search if searchString provided
    if searchString:
        # Case-insensitive regex search on multiple fields
        regex_pattern = {"$regex": searchString, "$options": "i"}
        query["$or"] = [
            {"template_structure.name": regex_pattern},
            {"templateStatus.status": regex_pattern},
            {"templateStatus.category": regex_pattern},
            {"templateStatus.id": regex_pattern}
        ]

    # Add sorting
    sort_criteria = [("createdOn", DESCENDING)] # Default sort
    if sortField:
        # Map frontend sort fields to DB fields if needed, or use direct
        db_sort_field = sortField
        if sortField == "templateName": db_sort_field = "template_structure.name"
        elif sortField == "status": db_sort_field = "templateStatus.status"
        elif sortField == "category": db_sort_field = "templateStatus.category"
        
        direction = ASCENDING if sortOrder == "asc" else DESCENDING
        sort_criteria = [(db_sort_field, direction)]

    # Execute query with pagination
    total_count = collection.count_documents(query)
    
    # Ensure offset is non-negative
    if offset < 0:
        offset = 0
        
    fetchData = list(collection.find(query).sort(sort_criteria).skip(offset).limit(limit))
    

    # Convert ObjectId to string so it's JSON safe
    result = convert_objectid_to_str(fetchData)
    
    # Build clean payload
    payload = []
    for item in result:
        templateStatus = item.get("templateStatus", {})
        template_structure = item.get("template_structure", {})
        components = template_structure.get("components", [])
        
        # Extract BODY text
        body_text = next(
            (comp.get("text") for comp in components if comp.get("type") == "BODY"),
            ""
        )

        payload.append({
            "templateId": templateStatus.get("id", ""),
            "templateStatus": templateStatus.get("status", ""),
            "templateCategory": templateStatus.get("category", ""),
            "templateName": template_structure.get("name", ""),
            "templateLanguage": template_structure.get("language", ""),
            "templateStructure": template_structure,
            "createdOn": item.get("createdOn", "")
        })

    return {
        "statusCode": 200,
        "response": "Fetched Successfully",
        "data": {
            "totalRecordsCount": total_count,
            "totalRecords":payload
        }
    }
    
#--------------------------------#
# Fetch template for report ends #
#--------------------------------#






#------------------------------#
# Send outbound message starts #
#------------------------------#
async def send_outbound_messages(
    s3_URL: str,
    mediaType: str,
    message: str,
    dst: str,
    agent: str,
    database: str,
    accountId: str,
    accountNo: str
):
    """
    Sends outbound WhatsApp messages (text or media) using Pinbot API.
    Sends a template message first if the user hasn't received a message in the last 24 hours.
    """
    # ----------------------#
    # 🔹 MongoDB Connections
    # ----------------------#
    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
    
    client = mongo_client
    db = client["whatsappConnecthub"]
    Masterdb = client["onedb"]
    activities=Masterdb["activities"]
    messageLog = db["messageLogs"]
    templateLog = db["templeteDetails"]

    # ----------------------#
    # 🔹 Fetch Account Info #
    # ----------------------#
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        result = await session.execute(
            select(WhatsappAccounts).where(WhatsappAccounts.w_accountId == accountId).limit(1)
        )
        fetchWhatsappDetails = result.scalars().first()
        
        getagentName = await session.execute(
            select(Members).where(Members.m_accountId == accountId,Members.m_accountNo == accountNo,Members.m_memberExtensionNo == agent).limit(1)
        )
        getagentName = getagentName.scalars().first()
        agentName=getagentName.m_memberName

    if not fetchWhatsappDetails:
        return {"statusCode": 404, "body": f"No WhatsApp account found for accountId '{accountId}'"}

    pn_ph_number_Id = fetchWhatsappDetails.w_phNumberId
    pn_Apikey = fetchWhatsappDetails.w_apiKey

    if not pn_ph_number_Id or not pn_Apikey:
        return {"statusCode": 400, "body": "Missing WhatsApp account credentials"}

    # -----------------------#
    # 🔹 Check last 24 hours #
    # -----------------------#
    # last_24h = datetime.utcnow() - timedelta(hours=24)
    # last_24h_str = last_24h.isoformat()  # '2025-11-17T17:10:24.440954'

    # condition = {"dst": dst, "createdOn": {"$gte": last_24h_str}}
    # recent_msg_count = messageLog.count_documents(condition)

    # ---------------------------------------#
    # 🔹 If message within 24h → send direct #
    # ---------------------------------------#
    # if recent_msg_count >= 1:
    #     print(f"📩 Found {recent_msg_count} messages in last 24h → Sending direct message")
    return await send_outbound_message(
        pn_ph_number_Id, pn_Apikey, dst, message, s3_URL, agent, mediaType, messageLog,activities,accountId,accountNo,database,agentName
    )

    # ---------------------------------#
    # 🔹 Otherwise send template first #
    # ---------------------------------#
    # try:
    #     template = list(templateLog.find({"template_structure.name": "vjdasjlkflkj"}))

    #     if not template:
    #         print("❌ No templates found in database")
    #         return {"statusCode": 404, "body": "No templates found"}

    #     first_template = template[0]
    #     if "template_payload" not in first_template:
    #         return {"statusCode": 400, "body": "template_payload missing"}

    #     template_payload = first_template["template_payload"]

    #     # 🔹 Ensure it's valid JSON
    #     if isinstance(template_payload, str):
    #         try:
    #             template_payload = json.loads(template_payload)
    #         except json.JSONDecodeError:
    #             return {"statusCode": 400, "body": "Invalid JSON in template_payload"}

    #     # 🔹 Replace ${MSISDN} recursively
    #     def replace_msisdn(obj):
    #         if isinstance(obj, dict):
    #             return {k: replace_msisdn(v) for k, v in obj.items()}
    #         elif isinstance(obj, list):
    #             return [replace_msisdn(i) for i in obj]
    #         elif isinstance(obj, str):
    #             return obj.replace("${MSISDN}", str(dst))
    #         else:
    #             return obj

    #     payload_with_dst = replace_msisdn(template_payload)
    #     print("✅ Final Template Payload:", json.dumps(payload_with_dst, indent=2))

    #     # 🔹 Send template first
    #     url = f"https://partnersv1.pinbot.ai/v3/{pn_ph_number_Id}/messages"
    #     headers = {"Content-Type": "application/json", "apikey": pn_Apikey}

    #     async with aiohttp.ClientSession() as session:
    #         async with session.post(url, headers=headers, json=payload_with_dst) as resp:
    #             resp_text = await resp.text()
    #             if resp.status != 200:
    #                 print(f"❌ Template API Error {resp.status}: {resp_text}")
    #                 return {"statusCode": resp.status, "body": resp_text}

    #             print("✅ Template Message Sent:", resp_text)

    #     # 🔹 After template → send actual message
    #     return await send_outbound_message(
    #         pn_ph_number_Id, pn_Apikey, dst, message, s3_URL, agent, mediaType, messageLog,activities,accountId,accountNo,database,agentName
    #     )

    # except Exception as e:
    #     print("🔥 Exception in send_outbound_messages:", str(e))
    #     return {"statusCode": 500, "body": str(e)}


#-------------------------------#
# 🔹 Send Text or Media Message #
#-------------------------------#
async def send_outbound_message(
    pn_ph_number_Id, pn_Apikey, dst, message, s3_URL, agent,
    mediaType, messageLog, activities, accountId, accountNo, database,agentName
):
    """
    Sends outbound WhatsApp message and logs details in MongoDB + SQL.
    """

    if not pn_ph_number_Id or not pn_Apikey:
        return {"statusCode": 400, "body": "Missing API credentials"}

    url = f"https://partnersv1.pinbot.ai/v3/{pn_ph_number_Id}/messages"
    headers = {"Content-Type": "application/json", "apikey": pn_Apikey}

    # ------------------ BUILD WHATSAPP PAYLOAD ------------------
    if mediaType == "text":
        wa_payload = {
            "messaging_product": "whatsapp",
            "to": dst,
            "type": "text",
            "text": {"body": message},
        }
    else:
        if not s3_URL:
            return {"statusCode": 400, "body": "Missing s3_URL for media type"}

        wa_payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": dst,
            "type": "document",
            "document": {"link": s3_URL, "caption": message},
        }

    # ------------------ SEND MESSAGE ------------------
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, headers=headers, json=wa_payload) as response:
                resp_text = await response.text()

                if response.status != 200:
                    print(f"❌ Failed to send message {response.status}: {resp_text}")
                    return {"statusCode": response.status, "body": resp_text}

                data = await response.json()
                message_id = data.get("messages", [{}])[0].get("id", "N/A")
                wa_id = data.get("contacts", [{}])[0].get("wa_id", dst)

                print("WA ID:", wa_id)

                # ------------------ LOG IN MONGO ------------------


                

                # ------------------ SQL OPERATIONS ------------------
                sessionmaker = asyncSessionFactory(database)
                async with sessionmaker() as db:

                    # ===== CHECK LEAD =====
                    result = await db.execute(
                        select(Leads).where(
                            Leads.l_accountId == accountId,
                            Leads.l_accountNo == accountNo,
                            Leads.l_leadPhoneNo == wa_id
                        )
                    )
                    lead = result.scalars().first()

                    if lead:
                        whatsappLeadId = lead.l_leadId
                    else:
                        whatsappLeadId = "00L" + alphanumericUniqueId()
                        newLead = Leads(
                            l_accountId=accountId,
                            l_accountNo=accountNo,
                            l_leadId=whatsappLeadId,
                            l_leadPhoneNo=wa_id,
                            l_leadOwner=agent
                        )
                        db.add(newLead)
                        await db.flush()
                        await db.refresh(newLead)
                        whatsappLeadId = newLead.l_leadId

                    # ===== CHECK CONVERSATION =====
                    result = await db.execute(
                        select(Conversations).where(
                            Conversations.c_accountId == accountId,
                            Conversations.c_accountNo == accountNo,
                            Conversations.c_conversationPhoneNo == wa_id,
                            Conversations.c_conversationChannel == "Whatsapp",
                            Conversations.c_conversationOwner == agent,
                            Conversations.c_conversationType == "Message"
                        )
                    )
                    conversation = result.scalars().first()

                    if conversation:
                        conversationId = conversation.c_conversationId
                    else:
                        conversationId = "00C" + alphanumericUniqueId()
                        newConv = Conversations(
                            c_accountId=accountId,
                            c_accountNo=accountNo,
                            c_conversationId=conversationId,
                            c_conversationPhoneNo=wa_id,
                            c_conversationOwner=agent,
                            c_conversationChannel="Whatsapp",
                            c_conversationType="Message",
                            c_conversationDetails={},
                            c_conversationStatus="Active",
                            c_leadId=whatsappLeadId
                        )

                        db.add(newConv)
                        await db.flush()

                        # Refresh to load DB-generated fields
                        await db.refresh(newConv)

                        # Now you can access the conversation ID
                        conversationId = newConv.c_conversationId
                    await db.commit()
                    
                    ist_offset = timedelta(hours=5, minutes=30)
                    ist_timezone = timezone(ist_offset)
                    now = datetime.now(ist_timezone)
                    iso_string = now.isoformat()
                    
                    mongo_payload = {
                        "m_id": message_id,
                        "m_src": agent,
                        "m_dst": dst,
                        "m_timestamp": time.time(),
                        "m_type": mediaType,
                        "m_receiveMsg": message,
                        "m_msgType": "Outbound",
                        "m_mediaUrlRaw": s3_URL,
                        "m_createdOn": iso_string
                    }
                        
                    activitiesLog={                         
                        "accountId": accountId,
                        "accountNo": accountNo,
                        "leadId": whatsappLeadId,
                        "taskId": '',
                        "conversationId": conversationId,
                        "campaignId": 0,
                        "memberName": agentName,
                        "channel": 'Whatsapp',
                        "direction": 'Outbound',
                        "type": 'Message',
                        "activityTimestamp": iso_string,
                        "details": mongo_payload
                    }
                    
                    activities.insert_one(activitiesLog)
                    messageLog.insert_one(mongo_payload)

                print(f"✅ Outbound message logged successfully ID : {message_id}.")
              
                return {
                    "statusCode": 200,
                    "body": "Message sent successfully",
                    "response": jsonable_encoder(
                        activitiesLog,
                        custom_encoder={ObjectId: str}  # 👈 IMPORTANT
                    ),
                }

        except aiohttp.ClientError as e:
            return {"statusCode": 502, "body": f"Network error: {e}"}

        except Exception as e:
            print("🔥 Unexpected error:", e)
            return {"statusCode": 500, "body": str(e)}



#----------------------------#
# Send outbound message ends #
#----------------------------#


#-------------------------------#
# Call Back Api Responce Starts #
#-------------------------------#

async def callbackApi(data: dict):
    status = await send_message(KAFKA_TOPIC, "dlr-consumer", data)
    print("Kafka Send Status:", status)  # True or False
    print("Raw data:", data)

#-------------------------------------#
# Send Manual Template Message Starts #
#-------------------------------------#



async def sendManualTemplate(tempName: str,tempId : str,agent: str,dst: str,accountId: str,accountNo: str,variables:list=[]) -> dict:
    try:
        # 🔹 Fetch WhatsApp Account Details
        sessionmaker = asyncSessionFactory("onedb")
        async with sessionmaker() as session:
            result = await session.execute(
                select(WhatsappAccounts).where(WhatsappAccounts.w_accountId == accountId).limit(1)
            )
            fetchWhatsappDetails = result.scalars().first()

        if not fetchWhatsappDetails:
            return {"statusCode": 404, "body": f"No WhatsApp account found for accountId '{accountId}'"}

        pn_ph_number_Id = fetchWhatsappDetails.w_phNumberId
        pn_Apikey = fetchWhatsappDetails.w_apiKey

        if not pn_ph_number_Id or not pn_Apikey:
            return {"statusCode": 400, "body": "Missing WhatsApp account credentials"}

        # 🔹 Fetch template
        client = pymongo.MongoClient(
            "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"
        )
        db = client["whatsappConnecthub"]
        
        templateLog = db["templeteDetails"]
        template_doc = templateLog.find_one(
            { "templateStatus.id": tempId,"accountId":accountId,"accountNo":accountNo}
        )
        

        if not template_doc:
            
            return {"statusCode": 404, "body": "No template found"}

        template_payload = template_doc.get("template_payload")
        template_structure = template_doc.get("template_structure")
        if not template_payload:
            return {"statusCode": 400, "body": "template_payload missing"}

        # 🔹 Ensure valid JSON
        if isinstance(template_payload, str):
            try:
                template_payload = json.loads(template_payload)
            except json.JSONDecodeError:
                return {"statusCode": 400, "body": "Invalid JSON in template_payload"}

        # 🔹 Create a mapping of variables: ${variable1} -> variables[0], etc.
        variable_map = {}
        for i, val in enumerate(variables):
            variable_map[f"${{variable{i+1}}}"] = val
            variable_map[f"{{{{{i+1}}}}}"] = val

        # 🔹 Replace ${MSISDN} and ${variableN} recursively
        def replace_placeholders(data):
            if isinstance(data, dict):
                return {k: replace_placeholders(v) for k, v in data.items()}
            elif isinstance(data, list):
                return [replace_placeholders(i) for i in data]
            elif isinstance(data, str):
                # Replace MSISDN
                s = data.replace("${MSISDN}", dst)
                # Replace variables
                for key, val in variable_map.items():
                    s = s.replace(key, str(val))
                return s
            return data

        payload_with_dst = replace_placeholders(template_payload)
        filled_template_structure = replace_placeholders(template_structure)


        # 🔹 Send template
        url = f"https://partnersv1.pinbot.ai/v3/{pn_ph_number_Id}/messages"
        headers = {
            "Content-Type": "application/json",
            "apikey": pn_Apikey
        }


        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            async with session.post(url, headers=headers, json=payload_with_dst) as resp:
                resp_text = await resp.text()

                if resp.status != 200:
                    
                    return {
                        "statusCode": resp.status,
                        "body": resp_text
                    }

                message_id = None
                wa_id = None
                try:
                    resp_json = json.loads(resp_text)
                    messages = resp_json.get("messages", [])
                    if messages:
                        message_id = messages[0].get("id")
                    
                    contacts = resp_json.get("contacts", [])
                    if contacts:
                        wa_id = contacts[0].get("wa_id", "")

                except json.JSONDecodeError:
                    resp_json = resp_text

                activitiesLog = None # Initialize to avoid UnboundLocalError
                if message_id:
                    # ------------------ SQL OPERATIONS ------------------
                    # Connect to Mongo collections
                    global mongo_client
                    if mongo_client is None:
                        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
                    
                    client = mongo_client
                    db = client["whatsappConnecthub"]
                    Masterdb = client["onedb"]
                    activities = Masterdb["activities"]
                    messageLog = db["messageLogs"]
                    
                    # agent = src # Map src to agent - REMOVED because param is already 'agent'

                    sessionmaker = asyncSessionFactory("onedb")
                    async with sessionmaker() as db:
                        getagentName = await db.execute(
                            select(Members).where(Members.m_accountId == accountId,Members.m_accountNo == accountNo,Members.m_memberExtensionNo == agent).limit(1)
                        )
                        getagentName = getagentName.scalars().first()
                        agentName = getagentName.m_memberName if getagentName else "Unknown"

                        # ===== CHECK LEAD =====
                        result = await db.execute(
                            select(Leads).where(
                                Leads.l_accountId == accountId,
                                Leads.l_accountNo == accountNo,
                                Leads.l_leadPhoneNo == wa_id
                            )
                        )
                        lead = result.scalars().first()

                        if lead:
                            whatsappLeadId = lead.l_leadId
                        else:
                            whatsappLeadId = "00L" + alphanumericUniqueId()
                            newLead = Leads(
                                l_accountId=accountId,
                                l_accountNo=accountNo,
                                l_leadId=whatsappLeadId,
                                l_leadPhoneNo=wa_id,
                                l_leadOwner=agent
                            )
                            db.add(newLead)
                            await db.flush()
                            await db.refresh(newLead)
                            whatsappLeadId = newLead.l_leadId

                        # ===== CHECK CONVERSATION =====
                        result = await db.execute(
                            select(Conversations).where(
                                Conversations.c_accountId == accountId,
                                Conversations.c_accountNo == accountNo,
                                Conversations.c_conversationPhoneNo == wa_id, # Use wa_id or message_id? Usually phone no for conversation
                                Conversations.c_conversationChannel == "Whatsapp",
                                Conversations.c_conversationOwner == agent,
                                Conversations.c_conversationType == "Message"
                            )
                        )
                        conversation = result.scalars().first()

                        if conversation:
                            conversationId = conversation.c_conversationId
                        else:
                            conversationId = "00C" + alphanumericUniqueId()
                            newConv = Conversations(
                                c_accountId=accountId,
                                c_accountNo=accountNo,
                                c_conversationId=conversationId,
                                c_conversationPhoneNo=wa_id, # Use wa_id
                                c_conversationOwner=agent,
                                c_conversationChannel="Whatsapp",
                                c_conversationType="Message",
                                c_conversationDetails={},
                                c_conversationStatus="Active",
                                c_leadId=whatsappLeadId
                            )

                            db.add(newConv)
                            await db.flush()

                            # Refresh to load DB-generated fields
                            await db.refresh(newConv)

                            # Now you can access the conversation ID
                            conversationId = newConv.c_conversationId
                        await db.commit()
                        
                        ist_offset = timedelta(hours=5, minutes=30)
                        ist_timezone = timezone(ist_offset)
                        now = datetime.now(ist_timezone)
                        iso_string = now.isoformat()
                        
                        mongo_payload = {
                            "m_id": message_id,
                            "m_src": agent,
                            "m_dst": wa_id,
                            "m_timestamp": time.time(),
                            "m_type": 'Template',
                            "m_receiveMsg": filled_template_structure,
                            "m_msgType": "Outbound",
                            "m_mediaUrlRaw": '',
                            "m_createdOn": iso_string
                        }
                            
                        activitiesLog={                         
                            "accountId": accountId,
                            "accountNo": accountNo,
                            "leadId": whatsappLeadId,
                            "taskId": '',
                            "conversationId": conversationId,
                            "campaignId": 0,
                            "memberName": agentName,
                            "channel": 'Whatsapp',
                            "direction": 'Outbound',
                            "type": 'Message',
                            "activityTimestamp": iso_string,
                            "details": mongo_payload
                        }
                        
                        activities.insert_one(activitiesLog)
                        messageLog.insert_one(mongo_payload)

                    print(f"✅ Outbound message logged successfully ID : {message_id}.")                    

        
        return {
            "statusCode": 200,
            "body": "Template sent successfully",
            "response": jsonable_encoder(activitiesLog, custom_encoder={ObjectId: str}) if activitiesLog else resp_json

        }

    except Exception as e:
        
        return {
            "statusCode": 500,
            "body": str(e)
        }



#-----------------------------------#
# Send Manual Template Message Ends #
#-----------------------------------#   




async def fetchWhatsappTemplateList(accountId: str, accountNo: str):
    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
    
    client = mongo_client
    db = client["whatsappConnecthub"]
    collection = db["templeteDetails"]
    fetchData = list(collection.find({"accountId": accountId, "accountNo": accountNo}))
    print(fetchData)
    

    # Convert ObjectId to string so it's JSON safe
    result = convert_objectid_to_str(fetchData)

    # Extract template names and IDs from each document
    templates = []
    for item in result:
        template_structure = item.get("template_structure", {})
        template_status = item.get("templateStatus", {})
        
        components = template_structure.get("components", [])
        body_text = next((comp.get("text") for comp in components if comp.get("type") == "BODY"), "")

        templates.append({
            "templateName": template_structure.get("name"),
            "templateId": template_status.get("id"),
            "templateText": body_text
        })

    return {"templates": templates}





async def fetchLeadId(phoneNumber, agentExtension, database: str, accountId: str, accountNo: str):
    """
    Fetches the lead ID for a given phone number and account.
    
    Args:
        phoneNumber: The phone number to search for (can be str or int)
        agentExtension: The agent's extension number (can be str or int)
        database: The database name to connect to
        accountId: The account ID
        accountNo: The account number
    
    Returns:
        dict: Contains 'LeadId' if found, or 'LeadId': None with 'message' if not found
    """
    # Convert to string to handle both int and string inputs
    phoneNumber = str(phoneNumber).strip() if phoneNumber is not None else ""
    agentExtension = str(agentExtension).strip() if agentExtension is not None else ""
    accountId = str(accountId).strip() if accountId is not None else ""
    accountNo = str(accountNo).strip() if accountNo is not None else ""
    
    # Validate required parameters
    if not phoneNumber:
        return {"error": "Phone number is required", "LeadId": None}
    
    if not agentExtension:
        return {"error": "Agent extension is required", "LeadId": None}
    
    if not accountId:
        return {"error": "Account ID is required", "LeadId": None}
    
    if not accountNo:
        return {"error": "Account number is required", "LeadId": None}
    
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as db:
        try:
            # ===== CHECK LEAD =====
            result = await db.execute(
                select(Leads).where(
                    Leads.l_accountId == accountId,
                    Leads.l_accountNo == accountNo,
                    Leads.l_leadPhoneNo == phoneNumber
                )
            )
            lead = result.scalars().first()

            if lead:
                return {"LeadId": lead.l_leadId, "found": True}
            else:
                return {"LeadId": None, "found": False, "message": f"No lead found for phone number: {phoneNumber}"}
        
        except Exception as e:
            print(f"❌ Error in fetchLeadId: {e}")
            return {"error": str(e), "LeadId": None}   



#--------------------------#
# Campaign creation Starts #
#--------------------------#   
async def create_campaign(s3_URL,fileName,campaignName, campaignCategory, templateName, templateId, scheduleTime, duplicateRemovalStatus, accountId, accountNo,database):
    data = {
        "file": s3_URL,
        "fileName": fileName,
        "campaignName": campaignName,
        "campaignCategory": campaignCategory,
        "templateName": templateName,
        "templateId": templateId,
        "scheduleTime": scheduleTime,
        "duplicateRemovalStatus": duplicateRemovalStatus,
        "accountId": accountId,
        "accountNo": accountNo,
        "database": database
    }
    status = await send_message('whatsapp-campaign-Live', "dlr-consumer", data)
    print("Kafka Send Status:", status)  # True or False
    
    if status:
        return {
            "status": "success",
            "message": "Campaign creation initiated successfully",
            "data": data
        }
    else:
        return {
            "status": "error",
            "message": "Failed to initiate campaign (Kafka send failed)"
        }

#--------------------------#
# Campaign creation Ends #
#--------------------------#


#--------------------------#
# Campaign Report Starts   #
#--------------------------#

async def fetch_campaign_report(limit, offset, searchString, sortField, sortOrder, accountId, accountNo):
    print(f"Fetching campaign report for account {accountId}")
    database = "onedb"
    session_maker = asyncSessionFactory(database)
    
    async with session_maker() as session:
        # Base query
        stmt = select(CampaignWhatsApp).where(
            CampaignWhatsApp.cw_account_id == accountId,
            CampaignWhatsApp.cw_account_no == accountNo
        )
        
        # Search
        if searchString:
            stmt = stmt.where(CampaignWhatsApp.cw_campaign_name.ilike(f"%{searchString}%"))
            
        # Sort
        if sortField:
            if sortField == "campaignName":
                sort_col = CampaignWhatsApp.cw_campaign_name
            elif sortField == "campaignCategory":
                sort_col = CampaignWhatsApp.cw_campaign_category
            elif sortField == "status":
                sort_col = CampaignWhatsApp.cw_status
            elif sortField == "scheduleTime":
                sort_col = CampaignWhatsApp.cw_schedule_time
            elif sortField == "createdAt":
                 sort_col = CampaignWhatsApp.cw_created_on
            else:
                 sort_col = CampaignWhatsApp.cw_created_on

            if sortOrder == "asc":
                stmt = stmt.order_by(sort_col.asc())
            else:
                stmt = stmt.order_by(sort_col.desc())
        else:
             stmt = stmt.order_by(CampaignWhatsApp.cw_created_on.desc())

        # Count total
        # For simplicity in this async setup without specialized count query builder:
        # We can execute a separate count query or just fetch all logic (less efficient but works for now)
        # Better: use func.count
        from sqlalchemy import func
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await session.execute(count_stmt)
        total_count = total_result.scalar()

        # Pagination
        stmt = stmt.offset(offset).limit(limit)
        
        # Execute
        result = await session.execute(stmt)
        campaigns = result.scalars().all()
        
        # Serialize
        data = []
        for c in campaigns:
            data.append({
                "campaignId": c.cw_id,
                "campaignName": c.cw_campaign_name,
                "campaignCategory": c.cw_campaign_category,
                "templateName": c.cw_template_name,
                "templateId": c.cw_template_id,
                "scheduleTime": str(c.cw_schedule_time),
                "status": c.cw_status,
                "createdOn": str(c.cw_created_on),
                "fileName": "", # cw_filename not available in DB
                "duplicateRemovalStatus": c.cw_duplicate_removal_status
            })
            
        return {
            "statusCode": 200,
            "message": "Fetched Successfully",
            "data": {
                "totalRecordsCount": total_count,
                "totalRecords": data
            }
        }






async def execute_task(campId: int, accountId: str, accountNo: str):
    print("Executing WhatsApp Campaign")
    print(f"Campaign ID   : {campId}")
    print(f"Account ID    : {accountId}")
    print(f"Account No    : {accountNo}")
    
    database = "onedb"
    session_maker = asyncSessionFactory(database)
    
    try:
        async with session_maker() as session:
            # Fetch campaign details to get file info etc.
            stmt = select(CampaignWhatsApp).where(
                CampaignWhatsApp.cw_id == campId,
                CampaignWhatsApp.cw_account_id == accountId,
                CampaignWhatsApp.cw_account_no == accountNo
            )
            result = await session.execute(stmt)
            campaign = result.scalars().first()
            
            if not campaign:
                print(f"❌ Campaign {campId} not found.")
                return {"status": "error", "message": "Campaign not found"}
            
            # Check if already executed
            if campaign.cw_status == 'COMPLETED' or campaign.cw_status == 'RUNNING':
                print(f"⚠️ Campaign {campId} already executed. Skipping.")
                return {"status": "skipped", "message": "Campaign already executed"}

            current_time = datetime.now()
            # If current time is earlier than schedule time, we skip (Future)
            # if campaign.cw_schedule_time > current_time:
            #    print(f"⚠️ Campaign {campId} is scheduled for future: {campaign.cw_schedule_time}. Skipping execution.")
            #    return {"status": "skipped", "message": "Campaign scheduled for future"}
            
            # If current time is significantly later than schedule time, we skip (Stale/Missed)
            time_difference = current_time - campaign.cw_schedule_time
            if time_difference.total_seconds() > 600: # 600 seconds = 10 minutes
                print(f"⚠️ Campaign {campId} is too old (Scheduled: {campaign.cw_schedule_time}, Current: {current_time}). Skipping execution.")
                # We could mark it as 'MISSED' or 'EXPIRED' here?
                # campaign.cw_status = 'EXPIRED'
                # await session.commit()
                return {"status": "skipped", "message": "Campaign execution time passed"}

            print(f"✅ Validated Campaign {campId}. Scheduled: {campaign.cw_schedule_time} ~= Current: {current_time}")
            
            # Reconstruct the data payload for Kafka using campaign details
            data = {
                "campaignName": campaign.cw_campaign_name,
                "campaignId": campaign.cw_id,
                "campaignCategory": campaign.cw_campaign_category,
                "templateName": campaign.cw_template_name,
                "templateId": campaign.cw_template_id,
                "scheduleTime": str(campaign.cw_schedule_time),
                "duplicateRemovalStatus": campaign.cw_duplicate_removal_status,
                "status": campaign.cw_status,
                "accountId": campaign.cw_account_id,
                "accountNo": campaign.cw_account_no,
                "database": database
            }
            
            # Send to Kafka to initiate actual processing (consumer loop)
            status = await send_message('whatsapp-auto-execute-Live', "dlr-consumer", data)
            print(f"✅ Kafka Send Status for Campaign {campId}: {status}")
            
            # if status:
            #     # Update status to COMPLETED
            #     campaign.cw_status = 'COMPLETED'
            #     await session.commit()
            #     print(f"✅ Campaign {campId} marked as COMPLETED.")
            
            return {"status": "success", "message": f"Campaign {campId} executed successfully"}
            
    except Exception as e:
        print(f"❌ Error during campaign execution: {e}")
        return {"status": "error", "message": str(e)}          
