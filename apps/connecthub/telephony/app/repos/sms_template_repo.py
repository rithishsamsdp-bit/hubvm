import re
import json
import aiohttp
import boto3
import random
import string
import pymongo
from pymongo import MongoClient, DESCENDING
import requests
from datetime import datetime, timezone, timedelta,date
from config import settings
import time
from urllib.parse import urlparse,quote
from bson import ObjectId
from sqlalchemy import select, and_, text
from db.context import asyncSessionFactory
from utils.sha256_hashing import alphanumericUniqueId
from models.db import Leads, Conversations, Members, Accounts
from producer.kafkaproducer import send_message
import os
from fastapi.encoders import jsonable_encoder


def json_default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError


KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "smsdlrlive")

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


#-------------------------------#
# Call Back Api Responce Starts #
#-------------------------------#

async def callbackApi(data: dict):
    status = await send_message(KAFKA_TOPIC, "sms-consumerlive", data)
    print("Kafka Send Status:", status)  # True or False

    print("data:", data)  # True or False
    return("data:", data)  # True or False
    
#--------------------------#
# Send Outbound SMS Starts #
#--------------------------#

async def send_outbound_sms(
    message: str,
    dst: str,
    agent: str,
    database: str,
    accountId: str,
    accountNo: str
):

                global mongo_client
                if mongo_client is None:
                    mongo_client = pymongo.MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True, connectTimeoutMS=20000)
                
                client = mongo_client
                db = client["smsConnecthub"]
                Masterdb = client["onedb"]
                activities=Masterdb["activities"]
                messageLog = db["messageLogs"]

                sessionmaker = asyncSessionFactory(database)
                async with sessionmaker() as db:
                    # ===== VALIDATE ACCOUNT =====
                    accountResult = await db.execute(
                        select(Accounts).where(Accounts.a_accountId == accountId).limit(1)
                    )
                    fetchAccountDetails = accountResult.scalars().first()
                    if not fetchAccountDetails:
                        return {"statusCode": 404, "body": f"No account found for accountId '{accountId}'"}

                    # ===== VALIDATE AGENT =====
                    getagentResult = await db.execute(
                        select(Members).where(Members.m_accountId == accountId, Members.m_accountNo == accountNo, Members.m_memberExtensionNo == agent).limit(1)
                    )
                    getagentName = getagentResult.scalars().first()
                    if not getagentName:
                        return {"statusCode": 404, "body": f"No agent found with extension '{agent}'"}
                    agentName = getagentName.m_memberName

                    # ===== FETCH SRC DYNAMICALLY =====
                    query = text("""
                        SELECT p_smsFlow.s_smsclinumberId, p_clinumbers.c_clinumberName 
                        FROM p_smsFlow 
                        LEFT JOIN p_clinumbers ON p_clinumbers.c_clinumberId = p_smsFlow.s_smsclinumberId 
                        WHERE p_smsFlow.s_accountId = :accountId 
                          AND p_smsFlow.s_accountNo = :accountNo 
                          AND JSON_UNQUOTE(JSON_EXTRACT(p_smsFlow.s_smsFlowJson, '$.smsmembers[0].memberextensionno')) = :agent
                    """)
                    src_result = await db.execute(query, {"accountId": accountId, "accountNo": accountNo, "agent": agent})
                    src_row = src_result.first()
                    src_number = src_row[1] if src_row and src_row[1] else ""

                    # ===== SEND SMS HTTP REQUEST =====
                    encoded_text = quote(message)
                    url = f"https://smsc.isptelecom.net/api.php?token=v84a3dU3p1nl5zTFtrI0AklU2AhkXSIIjDKBTMfaKxSGIOtku0cOgnLZbKYbmIi&cmd=sendsms&src={src_number}&dst={dst}&concat=0&msg={encoded_text}"
                    
                    payload = {}
                    headers = {}
                    response = requests.request("GET", url, headers=headers, data=payload)
                    print(response.text)
                
                    message_id = "00M" + alphanumericUniqueId()

                    # ===== CHECK LEAD =====
                    result = await db.execute(
                        select(Leads).where(
                            Leads.l_accountId == accountId,
                            Leads.l_accountNo == accountNo,
                            Leads.l_leadPhoneNo == dst
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
                            l_leadPhoneNo=dst,
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
                            Conversations.c_conversationPhoneNo == dst,
                            Conversations.c_conversationChannel == "SMS",
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
                            c_conversationPhoneNo=dst,
                            c_conversationOwner=agent,
                            c_conversationChannel="SMS",
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
                        "m_receiveMsg": message,
                        "m_msgType": "Outbound",
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
                        "channel": 'SMS',
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

#------------------------#
# Send Outbound SMS Ends #
#------------------------#                