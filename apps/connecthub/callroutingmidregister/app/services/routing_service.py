import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import routing_repo
import xml.etree.ElementTree as ET
from producer.kafkaproducer import send_message
import os
import json
import re

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
                   To: str, media_ipv4: str, X_uniqueId: str,sip_req_uri:str, caller_id_name: str,variable_sip_user_agent:str, variable_uuid: str,Auth_user: str,caller_id_no: str,whatsappcallcheck: str):
    if not Auth_user:
        return "<!-- No rows found -->"
    rows = await routing_repo.get_campaign_data(campaignid, database, Auth_user)

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

    
    caller_id_name, caller_id_no = caller_id_name, caller_id_name  
    print(first)
 

    if first.m_memberCallerIdMode =="NO" :
        value = first.c_clinumberCountryCode + first.c_clinumberName
        caller_id_name= first.c_clinumberCountryCode + first.c_clinumberName 
        caller_id_no= first.c_clinumberCountryCode + first.c_clinumberName 
    else:
        if first.m_memberCallerId != 0: 
            caller_id_name =  first.m_memberCallerId
            caller_id_no   =  first.m_memberCallerId


    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid
    #print(f"campaign={campaignid}, idx={idx}, total_rows={len(rows)}")
    
    # Determine the bridge destination based on whatsappcheck
    if whatsappcallcheck:
        bridge = f"sofia/gateway/919944447954/${{sip_to_user}}"
    else:
        bridge = f"sofia/gateway/{first.p_peerName}/{first.c_accountPrefix}${{sip_to_user}}"
    
    print(bridge)
    


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
        "CallerCallerIDName": "${Caller-Caller-ID-Name}",
    }

    # Static values
    static_params = {
        "sip_codec_prefs": "pcmu",
        # "bypass_media": "true",
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

    ET.SubElement(condition, "action", attrib={
        "application": "set", 
        "data": f"account_code={first.c_accountId}"
    })

    if variable_sip_user_agent =="ConnectHub SIP Client":
        ET.SubElement(condition, "action", attrib={
            "application": "export", 
            "data": "absolute_codec_string=PCMU,PCMA"
        })
    else:
        ET.SubElement(condition, "action", attrib={
            "application": "export", 
            "data": "absolute_codec_string=PCMU,PCMA"
        })
        
    ET.SubElement(condition, "action", attrib={
        "application": "set", 
        "data": "rtp_payload_space=20"
    })


    # ET.SubElement(condition, "action", attrib={
    #     "application": "set", 
    #     "data": "pulse=30"
    # })

    # ET.SubElement(condition, "action", attrib={
    #     "application": "set", 
    #     "data": "price_per_min=1"
    # })

    ET.SubElement(condition, "action", attrib={
        "application": "set", 
        "data": "nibble_increment=${pulse}"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "set", 
        "data": "nibble_rate=${price_per_min}"
    })
 

    ET.SubElement(condition, "action", attrib={
        "application": "set", 
        "data": "nibble_account=${account_code}"
    })


    ET.SubElement(condition, "action", attrib={
        "application": "set", 
        "data": "nibble_frequency=${pulse}"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "lua",
        "data": "/opt/freeswitch/storage/script/check_balance.lua"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "nibblebill", 
        "data": "start"
    })  
    

    # ET.SubElement(condition, "action", attrib={
    #     "application": "record_session",
    #     "data": f"$${{recordings_dir}}/{X_uniqueId}.mp3"
    # })
    ET.SubElement(condition, "action", attrib={
         "application": "set", 
         "data": f"execute_on_media=record_session ${{recordings_dir}}/{X_uniqueId}.mp3" 
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"sip_h_X-cid=${{sip_call_id}}"
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
        "data": bridge
    })


    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Using row index {idx}: {first.c_clinumberName}")
    print(xml_str)
    return xml_str


async def internal(campaignid: int, database: str, member_extension_no: str,
                   To: str, media_ipv4: str, X_uniqueId: str,sip_req_uri:str, caller_id_name: str,variable_sip_user_agent:str, variable_uuid: str,Auth_user: str,caller_id_no: str, proxyIP: str):
    
    try:
        rows = await routing_repo.internal(campaignid, database, Auth_user)
        print(f"Internal call query returned {len(rows) if rows else 0} rows")
    except Exception as e:
        # Return error XML response for database query failure
        error_msg = str(e)
        print(f"Error fetching internal call data: {error_msg}")
        print(f"Failed query parameters - campaignid: {campaignid}, database: {database}, Auth_user: {Auth_user}")
        
        error_xml = f"""<extension name="internal_db_error">
        <condition field="destination_number" expression=".*">
        <action application="log" data="ERR Internal Call DB Error: {error_msg}"/>
        <action application="hangup" data="NORMAL_TEMPORARY_FAILURE"/>
        </condition>
        </extension>"""
        
        return error_xml

    if not rows:
        print(f"No internal call data found for:")
        print(f"  - Campaign ID: {campaignid}")
        print(f"  - Database: {database}")
        print(f"  - Auth User: {Auth_user}")
        
        no_data_xml = f"""<extension name="internal_no_data">
        <condition field="destination_number" expression=".*">
        <action application="log" data="ERR Internal Call: No data found for user {Auth_user}, campaign {campaignid}"/>
        <action application="hangup" data="NO_ROUTE_DESTINATION"/>
        </condition>
        </extension>"""
        
        return no_data_xml

    # Reset cycle if new campaign or row count changed
    if (campaignid not in _round_robin_index or
        _round_robin_len.get(campaignid) != len(rows)):
        _round_robin_index[campaignid] = cycle(range(len(rows)))
        _round_robin_len[campaignid] = len(rows)

    idx = next(_round_robin_index[campaignid])
   
    first = rows[idx]
    print(first)

    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid
    #print(f"campaign={campaignid}, idx={idx}, total_rows={len(rows)}")
    
    # Determine the bridge destination based on whatsappcheck
    accountid = first.m_accountId
    ext = To[-4:]
    callext = str(accountid) + ext
    bridge = f"sofia/internal/sip:{callext}@{proxyIP}:5060"
    
    print(bridge)
    
    # Prepare Kafka message
    # data = {
    #     "type": "AgentPresence",
    #     "l_memberExtention": member_extension_no,
    #     "l_memberCustomerNumber": To,
    #     "l_memberCliNumberId": caller_id_name,
    #     "l_memberCallDirection": "Outbound",
    #     "l_memberServerIp": media_ipv4,
    #     "l_memberStatus": "INIT",
    #     "eventOriginate": "Freeswitch",
    #     "expires": "",
    #     "l_memberuuid":variable_uuid,        
    #     "l_accountid":first.m_accountId,
    #     "l_accountno":first.m_accountNo
    # }
    # await send_message(KAFKA_TOPIC, "Livemonitor", data)

    # Build XML
    root = ET.Element("extension", name=f"outbound_campaign_{campaignid}")
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseInternal)$"
    })

    # Dynamic values
    dynamic_params = {
        "callmode": callmode,
        "r_accountId": first.m_accountId,
        "r_accountNo": first.m_accountNo,
        "X-uniqueId": X_uniqueId,
        "effective_caller_id_number": caller_id_no,
        "effective_caller_id_name": caller_id_name,
        "c_campaignId": first.c_campaignId,
        "c_campaignName": first.c_campaignName,
        "customernumber": "${sip_to_user}",
        "CallerCallerIDName": "${Caller-Caller-ID-Name}",
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
    # ET.SubElement(condition, "action", attrib={
    #     "application": "limit",
    #     "data": f"hiredis default {first.c_accountId} {call_limit}"
    # })

    # Bridge action
    ET.SubElement(condition, "action", attrib={
        "application": "bridge",
        "data": bridge
    })


    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Using row index {idx}: {first.c_clinumberName}")

    return xml_str

async def Inbound(campaignid: int, database: str, From: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str):
    rows = await routing_repo.get_inbound_data(campaignid, database,To)
    first = rows[0]
    data = first.a_planDetails   # already   a dict
    call_limit = data["limits"]["features"]["CALLLIMIT"] 

    # Prepare Kafka message for in   bound call
    # data = {
    #     "type": "AgentPresence",
    #     "l_memberExtention": "",
    #     "l_memberCustomerNumber": From,
    #     "l_memberCliNumberId": To,  # No CLI number for inbound
    #     "l_memberCallDirection": "Inbound",  # Changed to Inbound
    #     "l_memberServerIp": media_ipv4,
    #     "l_memberStatus": "INIT",
    #     "eventOriginate": "Freeswitch",
    #     "expires": "",
    #     "l_memberuuid":variable_uuid,
    #     "l_accountid":first.c_accountId,
    #     "l_accountno":first.c_accountNo
    # }
    # await send_message(KAFKA_TOPIC, "Livemonitor", data)

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
        #("set", "bypass_media_after_bridge=true"),
        ("set", "sip_h_X-cliphonenumber=${sip_to_user}"),
        ("set", "sip_sticky_contact=true"),
        ("set", "RECORD_STEREO=true"),
        ("limit", f"hiredis default {first.c_accountId} {call_limit}"),
        ("export", f"nolocal:execute_on_answer=lua /opt/freeswitch/storage/script/inbound_answer.lua {variable_uuid} {first.c_accountId} {first.c_accountNo} {first.c_clinumberId}"),
        # ("record_session", f"$${{recordings_dir}}/{variable_uuid}.mp3"),
        ("set", "api_hangup_hook=lua /opt/freeswitch/storage/script/inbound_post_data.lua ${callmode}"),
        ("lua", "ivrFlowv3.lua")
    ] 

    ET.SubElement(condition, "action", attrib={
         "application": "set", 
         "data": f"execute_on_media=record_session ${{recordings_dir}}/{variable_uuid}.mp3" 
    })
    # ET.SubElement(condition, "action", attrib={
    #     "application": "hiredis_raw",
    #     "data": f"default HSET opensipsuniqueid:${{sip_h_X-opensipsuniqueid}} "
    #             f"account_no {first.c_accountNo}"
    # })
    
    # ET.SubElement(condition, "action", attrib={
    #     "application": "hiredis_raw",
    #     "data": f"default HSET opensipsuniqueid:${{sip_h_X-opensipsuniqueid}} "
    #             f"freeswitchUniqueID ${{call_uuid}}"
    # })
    # ET.SubElement(condition, "action", attrib={
    #     "application": "set", 
    #     "data": "bypass_media=true"
    # })
    for app, data_attr in inbound_actions:
        ET.SubElement(condition, "action", attrib={
            "application": app,
            "data": data_attr
        })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")
    print(xml_str)

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
    print(xml_str)

    return xml_str

async def Conference(campaignid: int, database: str, From: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str, target_uuid: str, roomId: str, referRoomId: str, Caller_Callee_ID_Number: str):
   
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

    # Record action
    # ET.SubElement(condition, "action", attrib={
    #     "application": "set",
    #     "data": "bypass_media=true"
    # })
    if roomId is None or roomId=="":
        if len(str(referRoomId)) > 8:
            roomId=Caller_Callee_ID_Number
        else:
            roomId = referRoomId

    # ET.SubElement(condition, "action", attrib={
    #     "application": "set",
    #     "data": "CONF_UNIQUE_ID=${create_uuid()}"
    # })

    # ET.SubElement(condition, "action", attrib={
    #     "application": "export",
    #     "data": "CONF_UNIQUE_ID=${CONF_UNIQUE_ID}"
    # })

    # ET.SubElement(condition, "action", attrib={
    #     "application": "set",
    #     "data": f"api_hangup_hook=lua /opt/freeswitch/storage/script/conference_post_data.lua"
    # })

    ET.SubElement(condition, "action", attrib={
        "application": "conference",
        "data": f"{roomId}@default"
    })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")
    print(xml_str)                 
    return xml_str


async def Transfer(campaignid: int, database: str, member_extension_no: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str, target_uuid: str, proxyIP: str, Caller_Callee_ID_Number: str, Caller_Destination_Number: str, refer_to: str = None, direction: str = None, Caller_Username: str = None):
   
    # Log query parameters for debugging
    print(f"Transfer Query - campaignid: {campaignid}, database: {database}, member_extension_no: {member_extension_no}")
    print(f"Transfer Query - Caller_Callee_ID_Number: {Caller_Callee_ID_Number}, Caller_Destination_Number: {Caller_Destination_Number}")
    print(f"Transfer Query - proxyIP: {proxyIP}")

    # Clean and validate input parameters by removing spaces
    direction_clean = direction.strip() if direction else ""
    Caller_Callee_ID_Number_clean = Caller_Callee_ID_Number.strip() if Caller_Callee_ID_Number else ""
    Caller_Username_clean = Caller_Username.strip() if Caller_Username else ""
    
    if direction_clean == "inbound":
        member_extension_no = Caller_Callee_ID_Number_clean
    else:
        member_extension_no = Caller_Username_clean

    try:
        rows = await routing_repo.get_transfer_data(campaignid, database, member_extension_no)
        print(f"Query returned {len(rows) if rows else 0} rows")
    except Exception as e:
        # Return error XML response for database query failure
        error_msg = str(e)
        print(f"Error fetching transfer data: {error_msg}")
        print(f"Failed query parameters - campaignid: {campaignid}, database: {database}, member_extension_no: {member_extension_no}")
        
        error_xml = f"""<extension name="transfer_db_error">
        <condition field="destination_number" expression=".*">
        <action application="log" data="ERR Transfer DB Error: {error_msg}"/>
        <action application="hangup" data="NORMAL_TEMPORARY_FAILURE"/>
        </condition>
        </extension>"""
        
        return error_xml

    if not rows:
        print(f"No transfer data found for:")
        print(f"  - Campaign ID: {campaignid}")
        print(f"  - Database: {database}")
        print(f"  - Member Extension: {member_extension_no}")
        print(f"  - Caller Callee ID: {Caller_Callee_ID_Number}")
        print(f"  - Destination: {Caller_Destination_Number}")
        
        no_data_xml = f"""<extension name="transfer_no_data">
        <condition field="destination_number" expression=".*">
        <action application="log" data="ERR Transfer: No data found for member {member_extension_no}, campaign {campaignid}"/>
        <action application="hangup" data="NO_ROUTE_DESTINATION"/>
        </condition>
        </extension>"""
        
        return no_data_xml

       # Extract domain from refer_to and map to IP
    if refer_to:
        print(f"Original refer_to: {refer_to}")
        # Extract domain from SIP URI format: <sip:361001@pulse-proxy-1.pulsework360.com>
        domain_match = re.search(r'@([^>]+)', refer_to)
        if domain_match:
            domain = domain_match.group(1)
            print(f"Extracted domain: {domain}")
            
            # Map domain to IP address
            domain_to_ip_map = {
                "pulse-proxy-3.pulsework360.com": "10.0.4.5"
                # Add more mappings as needed
            }
            
            if domain in domain_to_ip_map:
                proxyIP = domain_to_ip_map[domain]
                print(f"Mapped domain {domain} to IP: {proxyIP}")
            else:
                print(f"Domain {domain} not found in mapping, using original proxyIP: {proxyIP}")

    # Reset cycle if new campaign or row count changed
    if (campaignid not in _round_robin_index or
        _round_robin_len.get(campaignid) != len(rows)):
        _round_robin_index[campaignid] = cycle(range(len(rows)))
        _round_robin_len[campaignid] = len(rows)

    idx = next(_round_robin_index[campaignid])
   
    first = rows[idx]

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

    # Clean and validate proxyIP by removing all spaces
    proxyIP_clean = proxyIP.strip().replace(" ", "") if proxyIP else proxyIP

    if len(str(Caller_Destination_Number)) < 8:
        dialString = f"sofia/internal/sip:${{1}}@{proxyIP_clean}:5060"
        caller_id_name = "Call transfer from " + first.m_memberName
    else:
        dialString = f"sofia/gateway/{first.p_peerName}/{first.c_accountPrefix}${{1}}"
        caller_id_name = first.c_clinumberCountryCode + first.c_clinumberName
    
    # Inbound condition for blacklist check - accept 8-12 digit numbers
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(\\d{4,12})$"
    })
    
    # Record action
    # ET.SubElement(condition, "action", attrib={
    #     "application": "answer"
    # })

    # Record action
    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"sip_h_X-fscallerid={caller_id_name}"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": "sip_codec_prefs=pcmu"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"effective_caller_id_name={caller_id_name}"
    })

    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"effective_caller_id_number={caller_id_name}"
    })


    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": "sip_sticky_contact=true"
    })


    # Bridge action
    ET.SubElement(condition, "action", attrib={
        "application": "bridge",
        "data": f"{dialString}"
    })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")
                       
    return xml_str


async def Directory(domain: str, database: str, username: str, form_data: dict):
   
    action = form_data.get("action")
    appPlatform = form_data.get("X-App-Platform") or ""
    print(f"Processing SIP auth for user: {username} in domain: {domain}")
    records = await routing_repo.getPassword(username, "onedb")
    
    if not records:
        xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <document type="freeswitch/xml">
            <section name="directory">
                <result status="not found"/>
            </section>
        </document>"""
        return xml
    
    if action == "sip_auth":
        if appPlatform == "Android":
            session_timeout = 3600
        else:
            session_timeout = 90
        password = records[0]["m_memberPassword"]
        extension = records[0]["m_memberExtensionNo"]
        xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <document type="freeswitch/xml">
            <section name="directory">
                <domain name="{domain}">
                    <user id="{extension}" cacheable="true">
                    <params>
                        <param name="password" value="{password}"/>
                        <param name="vm-password" value="{extension}"/>
                        <param name="sip-force-expires" value="{session_timeout}"/>
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
                    </variables>
                    </user>
                </domain>
            </section>
        </document>'''
        return xml
    elif action == "voicemail-lookup":
        extension = records[0]["m_memberExtensionNo"]
        xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <document type="freeswitch/xml">
                <section name="directory">
                    <domain name="{domain}">
                        <user id="{extension}">
                        </user>
                    </domain>
                </section>
            </document>'''
        return xml
    else:
        error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                        <document type="freeswitch/xml">
                            <section name="result">
                                <result status="not found">
                                    <error>domain is required</error>
                                </result>
                            </section>
                        </document>"""               
        return error_xml

async def outboundSystem(database: str, peerName: str, accountPrefix: str, Extention: str, customerNumber: str, media_ipv4: str, X_uniqueId: str, callerid: str, variable_sip_user_agent: str, variable_uuid: str, accountid: int, accountno: str, calltype: str, clinumberId: int, call_limit: int):
    peerName = peerName.replace(" ", "")
    accountPrefix = accountPrefix.replace(" ", "")
    customerNumber = customerNumber.replace(" ", "")

    bridge = f"sofia/gateway/{peerName}/{accountPrefix}{customerNumber}"
    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid

    # data = {
    #     "type": "AgentPresence",
    #     "l_memberExtention": Extention,
    #     "l_memberCustomerNumber": customerNumber,
    #     "l_memberCliNumberId": callerid,
    #     "l_memberCallDirection": "Outbound",
    #     "l_memberServerIp": media_ipv4,
    #     "l_memberStatus": "INIT",
    #     "eventOriginate": "Freeswitch",
    #     "expires": "",
    #     "l_memberuuid":variable_uuid,        
    #     "l_accountid":accountid,
    #     "l_accountno":accountno
    # }
    # await send_message(KAFKA_TOPIC, "Livemonitor", data)
    
     # Build XML
    root = ET.Element("extension", name=f"outbound_{calltype}")
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseOutboundSystem)$"
    })
    
    # Dynamic values
    dynamic_params = {
        "sip_h_X-fscallerid": callerid,
        "callmode": callmode,
        "r_accountId": accountid,
        "r_accountNo": accountno,
        "c_clinumberId": clinumberId,
        "X-uniqueId": X_uniqueId,
        "effective_caller_id_number": callerid,
        "effective_caller_id_name": callerid,
        "customernumber": customerNumber,
        "CallerCallerIDName": customerNumber,
    }
    
    static_params = {
        "sip_codec_prefs": "pcmu",
        "ignore_early_media":"false",
        "session_in_hangup_hook":"true",
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
        
    ET.SubElement(condition, "action", attrib={
        "application": "export",
        "data": "absolute_codec_string=PCMU,PCMA"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "record_session",
        "data": f"$${{recordings_dir}}/{X_uniqueId}.mp3"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "export",
        "data": f"nolocal:execute_on_answer=lua /opt/freeswitch/storage/script/outbound_answer.lua {variable_uuid}"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "limit",
        "data": f"hiredis default {accountid} {call_limit}"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "bridge",
        "data": bridge
    })
    
    xml_str = ET.tostring(root, encoding="unicode")
    

    return xml_str

async def Voicemail():
    root = ET.Element("extension", name=f"voicemaillistener")
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseOutbound)$"
    })
    ET.SubElement(condition, "action", attrib={
        "application": "answer"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "sleep",
        "data": "1000"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "voicemail",
        "data": "check default $${domain} ${sip_from_user}"
    })
    
    xml_str = ET.tostring(root, encoding="unicode")
    
    return xml_str