import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import clicktocall_repo
import xml.etree.ElementTree as ET
from producer.kafkaproducer import send_message
import os
import json
from fastapi import Request
from typing import Any

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

import xml.etree.ElementTree as ET
from itertools import cycle
import os
import xml.etree.ElementTree as ET
from itertools import cycle

KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "livemonitor-topic")

# Global state for round-robin
_round_robin_index = {}
_round_robin_len = {}


async def outbound(campaignid: int, database: str, member_extension_no: str,
                   To: str, media_ipv4: str, X_uniqueId: str,sip_req_uri:str, caller_id_name: str,variable_sip_user_agent:str, variable_uuid: str,Auth_user: str,caller_id_no: str):
    rows = await clicktocall_repo.get_campaign_data(campaignid, database, Auth_user)

    if not rows:
        return "<!-- No rows found -->"

    # Reset cycle if new campaign or row count changed
    if (campaignid not in _round_robin_index or
        _round_robin_len.get(campaignid) != len(rows)):
        _round_robin_index[campaignid] = cycle(range(len(rows)))
        _round_robin_len[campaignid] = len(rows)

    idx = next(_round_robin_index[campaignid])
   
    first = rows[idx]
    data = first.a_planDetails   # already a dict
    call_limit = data["limits"]["features"]["CALLLIMIT"]


    caller_id_name, caller_id_no = caller_id_name, caller_id_no  
    print(first)
    if first.m_memberCallerIdMode == "NO" or first.m_memberCallerId != 0:
        value = first.c_clinumberCountryCode + first.c_clinumberName
        caller_id_name = value
        caller_id_no   = value

    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid
    #print(f"campaign={campaignid}, idx={idx}, total_rows={len(rows)}")

    # Prepare Kafka message
    data = {
        "type": "AgentPresence",
        "l_memberExtention": member_extension_no,
        "l_memberCustomerNumber": To,
        "l_memberCliNumberId": caller_id_name,
        "l_memberCallDirection": "Outbound",
        "l_memberServerIp": media_ipv4,
        "l_memberStatus": "INIT",
        "eventOriginate": "Freeswitch",
        "expires": "",
        "l_memberuuid":variable_uuid,        
        "l_accountid":first.c_accountId,
        "l_accountno":first.c_accountNo
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)

    # Build XML
    root = ET.Element("extension", name=f"outbound_campaign_{campaignid}")
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseOutbound)$"
    })

    # Dynamic values
    dynamic_params = {
        "sip_h_X-fscallerid": first.c_clinumberCountryCode + first.c_clinumberName,
        "callmode": callmode,
        "r_accountId": first.c_accountId,
        "r_accountNo": first.c_accountNo,
        "c_clinumberId": first.c_clinumberId,
        "X-uniqueId": X_uniqueId,
        "effective_caller_id_number": caller_id_no,
        "effective_caller_id_name": caller_id_name,
        "c_campaignId": first.c_campaignId,
        "c_campaignName": first.c_campaignName,
        "customernumber": "${sip_to_user}",
    }

    # Static values
    static_params = {
        "sip_codec_prefs": "pcmu",
        #"bypass_media": "true",
        "sip_sticky_contact": "true",
        "ignore_display_updates": "true",
        "RECORD_STEREO": "true",
        "api_hangup_hook": f"lua /opt/freeswitch/storage/script/{callmode}_out_post_data.lua",
    }

    # Add <action> tags
    for key, val in {**dynamic_params, **static_params}.items():
        ET.SubElement(condition, "action", attrib={
            "application": "set",
            "data": f"{key}={val}"
        })
    
    # Record action
    ET.SubElement(condition, "action", attrib={
        "application": "record_session",
        "data": f"$${{recordings_dir}}/{X_uniqueId}.mp3"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "export",
        "data": f"nolocal:execute_on_answer=lua /opt/freeswitch/storage/script/outbound_answer.lua {variable_uuid}"
    })

    # Record action
    ET.SubElement(condition, "action", attrib={
        "application": "limit",
        "data": f"hiredis default {first.c_accountId} {call_limit}"
    })

    # Bridge action
    ET.SubElement(condition, "action", attrib={
        "application": "bridge",
        "data": f"sofia/gateway/{first.p_peerName}/{first.c_accountPrefix}${{sip_to_user}}"
    })


    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Using row index {idx}: {first.c_clinumberName}")

    return xml_str
async def Inbound(campaignid: int, database: str, From: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str):
    rows = await clicktocall_repo.get_inbound_data(campaignid, database,To)
    first = rows[0]
    data = first.a_planDetails   # already   a dict
    call_limit = data["limits"]["features"]["CALLLIMIT"] 

    # Prepare Kafka message for in   bound call
    data = {
        "type": "AgentPresence",
        "l_memberExtention": "",
        "l_memberCustomerNumber": From,
        "l_memberCliNumberId": To,  # No CLI number for inbound
        "l_memberCallDirection": "Inbound",  # Changed to Inbound
        "l_memberServerIp": media_ipv4,
        "l_memberStatus": "INIT",
        "eventOriginate": "Freeswitch",
        "expires": "",
        "l_memberuuid":variable_uuid,
        "l_accountid":first.c_accountId,
        "l_accountno":first.c_accountNo
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)

    # Build XML for inbound call handling
    root = ET.Element("extension", name=f"inbound_campaign_{campaignid}")
    
    # Inbound condition for blacklist check
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseInbound|pulse_proxy_1)$"
    })
    
    # Add actions for inbound call processing
    inbound_actions = [
        ("set", "session_in_hangup_hook=true"),
        ("set", f"r_accountId={first.c_accountId}"),
        ("set", f"r_accountNo={first.c_accountNo}"),
        ("lua", "/opt/freeswitch/storage/script/inbound_pre_post.lua"),
        ("set", "bypass_media=false"),
        ("set", "ringback=$${us-ring}"),
        ("set", "bypass_media_after_bridge=true"),
        ("set", "sip_h_X-cliphonenumber=${sip_to_user}"),
        ("set", "sip_sticky_contact=true"),
        ("set", "RECORD_STEREO=true"),
        ("limit", f"hiredis default {first.c_accountId} {call_limit}"),
        ("export", f"nolocal:execute_on_answer=lua /opt/freeswitch/storage/script/inbound_answer.lua {variable_uuid} {first.c_accountId} {first.c_accountNo} {first.c_clinumberId}"),
        ("record_session", f"$${{recordings_dir}}/{variable_uuid}.mp3"),
        ("set", "api_hangup_hook=lua /opt/freeswitch/storage/script/inbound_post_data.lua ${callmode}"),
        ("lua", "ivrFlowv3.lua")
    ] 
    
    for app, data_attr in inbound_actions:
        ET.SubElement(condition, "action", attrib={
            "application": app,
            "data": data_attr
        })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")


    return xml_str
async def Barge(campaignid: int, database: str, From: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str, target_uuid: str):
   
    # Build XML for inbound call handling
    root = ET.Element("extension", name=f"eavesdrop")
    
    # Inbound condition for blacklist check
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseBargeIn)$"
    })
    
    # Record action
    ET.SubElement(condition, "action", attrib={
        "application": "answer"
    })
    spy_type = To[2]
    # Add actions for inbound call processing
    barge_actions = [
        ("set", "eavesdrop_enable_dtmf=true"),
        ("set", f"digit={spy_type}"),
        ("queue_dtmf", "w${digit}@500"),
        ("eavesdrop", f"{target_uuid}")
    ]
    
    for app, data_attr in barge_actions:
        ET.SubElement(condition, "action", attrib={
            "application": app,
            "data": data_attr
        })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")


    return xml_str

async def Conference(campaignid: int, database: str, From: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str, target_uuid: str, roomId: str, referRoomId: str):
   
    # Build XML for inbound call handling
    root = ET.Element("extension", name=f"pulseConference")
    
    # Inbound condition for blacklist check
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseConference)$"
    })
    
    # Record action
    # ET.SubElement(condition, "action", attrib={
    #     "application": "answer"
    # })


    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": "conference_flags=json-events"
    })
    if roomId is None or roomId=="":
        roomId=referRoomId

    ET.SubElement(condition, "action", attrib={
        "application": "conference",
        "data": f"{roomId}@default"
    })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")
                       
    return xml_str


async def Transfer(campaignid: int, database: str, member_extension_no: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str, target_uuid: str):
   
    rows = await clicktocall_repo.get_transfer_data(campaignid, database, member_extension_no)

    if not rows:
        return "<!-- No rows found -->"

    # Reset cycle if new campaign or row count changed
    if (campaignid not in _round_robin_index or
        _round_robin_len.get(campaignid) != len(rows)):
        _round_robin_index[campaignid] = cycle(range(len(rows)))
        _round_robin_len[campaignid] = len(rows)

    idx = next(_round_robin_index[campaignid])
   
    first = rows[idx]
    data = first.a_planDetails   # already a dict
    call_limit = data["limits"]["features"]["CallLimit"]


    if first.m_memberCallerIdMode =="NO" :
        callerId= first.c_clinumberCountryCode + first.c_clinumberName 
    else:
        if first.m_memberCallerId != 0: 
            callerId =  first.m_memberCallerId
        else:
             callerId =  caller_id_from
    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid
    # Build XML for inbound call handling
    root = ET.Element("extension", name=f"pulseTransfer")
    
    # Inbound condition for blacklist check
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(\d{12})$"
    })
    
    # Record action
    # ET.SubElement(condition, "action", attrib={
    #     "application": "answer"
    # })

    # Record action
    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"sip_h_X-fscallerid={first.c_clinumberCountryCode}{first.c_clinumberName}"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": "sip_codec_prefs=pcmu"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"effective_caller_id_name={first.c_clinumberCountryCode}{first.c_clinumberName}"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"effective_caller_id_number={first.c_clinumberCountryCode}{first.c_clinumberName}"
    })


    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": "sip_sticky_contact=true"
    })


    # Bridge action
    ET.SubElement(condition, "action", attrib={
        "application": "bridge",
        "data": f"sofia/gateway/{first.p_peerName}/{first.c_accountPrefix}${{1}}"
    })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")
                       
    return xml_str


async def Voicemail(domain: str, database: str, username: str):
   
    xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
    <section name="directory">
        <domain name="{domain}">
            <user id="{username}">
            </user>
        </domain>
    </section>
</document>'''
   # print(f"Inbound call processing for campaign {campaignid}")
                       
    return xml

async def logrequest(request: Request, request_model: Any, uuid: str, database: str):
    await clicktocall_repo.logrequest(request, uuid, request_model, database)

 
async def logresponse(uniqueid: str, responsebody: dict | str, responsecode: int, responsetimems: int = None,servernode: str = None,extrameta: dict = None,database: str = "onedb"):
    await clicktocall_repo.logresponse(uniqueid, responsebody, responsecode, responsetimems, servernode, extrameta, database)
    
async def getmediaip(accountid:int, database: str):
    return await clicktocall_repo.getmediaip(accountid, database)