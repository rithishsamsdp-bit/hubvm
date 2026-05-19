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
    account_id = first.c_accountId   # already a dict
    call_limit = data["limits"]["features"]["CALLLIMIT"]


    caller_id_name, caller_id_no = caller_id_name, caller_id_no  
    print(first)
    # if first.m_memberCallerIdMode == "NO" or first.m_memberCallerId != 0:
    #     value = first.c_clinumberCountryCode + first.c_clinumberName
    #     caller_id_name = value
    #     caller_id_no   = value
    peer_name = first.p_peerName
    if first.m_memberCallerIdMode =="NO" :
        value = first.c_clinumberCountryCode + first.c_clinumberName
        caller_id_name= first.c_clinumberCountryCode + first.c_clinumberName 
        caller_id_no= first.c_clinumberCountryCode + first.c_clinumberName 
    elif first.m_memberCallerIdMode == "YES":
        if first.m_memberCallerId != 0: 
            caller_id_name =  first.m_memberCallerId
            caller_id_no   =  first.m_memberCallerId
        else:
            cli_rows = await routing_repo.customer_cli(campaignid, database, caller_id_no, account_id, Auth_user)
            cli_data = cli_rows[0]
            # first.p_peerName = cli_data.p_peerName
            peer_name = cli_data.p_peerName
            caller_id_no = caller_id_no.replace(" ", "")
            caller_id_name = caller_id_no.replace(" ", "")

    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid
    #print(f"campaign={campaignid}, idx={idx}, total_rows={len(rows)}")
    
    # Determine the bridge destination based on whatsappcheck
    if whatsappcallcheck:
        bridge = f"sofia/gateway/919003543519/${{sip_to_user}}"
    else:
        # bridge = f"sofia/gateway/{peer_name}/{first.c_accountPrefix}${{regex(${{sip_to_user}}|^(?:91)?(\\\\d{{10}})$|91%1)}}"
        bridge = f"sofia/gateway/{peer_name}/{first.c_accountPrefix}${{regex(${{sip_to_user}}|^\\+?(?:91)?(\\d{{10}})$|91%1)}}"

    
    print(bridge)
    
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
        "application": "export",
        "data": "absolute_codec_string=PCMU,PCMA,G729"
    })
    # ET.SubElement(condition, "action", attrib={
    #     "application": "set", 
    #     "data": "bypass_media=true"
    # })
    # Record action
    # ET.SubElement(condition, "action", attrib={
    #     "application": "export",
    #     "data": f"nolocal:execute_on_answer=record_session $${{recordings_dir}}/{X_uniqueId}.mp3"
    # })

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

    # Bridge action
    ET.SubElement(condition, "action", attrib={
        "application": "bridge",
        "data": bridge
    })


    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Using row index {idx}: {first.c_clinumberName}")

    return xml_str


async def internal(campaignid: int, database: str, member_extension_no: str,
                   To: str, media_ipv4: str, X_uniqueId: str,sip_req_uri:str, caller_id_name: str,variable_sip_user_agent:str, variable_uuid: str,Auth_user: str,caller_id_no: str, proxyIP: str):
    
    try:
        rows = await routing_repo.internal(0, database, Auth_user)
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
    accountid = first.m_accountId
    ext = To[-4:]
    callext = str(accountid) + ext
    bridge = f"sofia/external/sip:{callext}@{proxyIP}:5182"
    
    print(bridge)
    
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
        "l_accountid":first.m_accountId,
        "l_accountno":first.m_accountNo
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)

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
        ("set", "ignore_display_updates=true"),
        #("set", "bypass_media_after_bridge=true"),
        ("set", "sip_h_X-cliphonenumber=${sip_to_user}"),
        ("set", "sip_sticky_contact=true"),
        ("set", "RECORD_STEREO=true"),
        #("limit", f"hiredis default {first.c_accountId} {call_limit}"),
        ("export", f"nolocal:execute_on_answer=lua /opt/freeswitch/storage/script/inbound_answer.lua {variable_uuid} {first.c_accountId} {first.c_accountNo} {first.c_clinumberId}"),
        ("record_session", f"$${{recordings_dir}}/{variable_uuid}.mp3"),
        ("set", "api_hangup_hook=lua /opt/freeswitch/storage/script/inbound_post_data.lua ${callmode}"),
        ("lua", "ivrFlowv3.lua")
    ] 
    
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
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str, target_uuid: str, roomId: str, referRoomId: str, Caller_Callee_ID_Number: str):
   
    root = ET.Element("extension", name=f"pulseConference")

    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseConference)$"
    })
    accountid = "default"
    rowaccount = None
    
    if roomId is None or roomId=="":
        if len(str(referRoomId)) > 8:
            roomId=Caller_Callee_ID_Number
        else:
            roomId = referRoomId
    print(f"[DEBUG] Fetching account for roomId={roomId} using database={database}")
    rowaccount = await routing_repo.getAgentDetails(roomId, database)
         
    if rowaccount and "m_accountNo" in rowaccount:
        accountid = rowaccount["m_accountNo"]
        print(f"[DEBUG] Found accountid={accountid} for roomId={roomId}")
    else:
        print(f"[DEBUG] No account found for roomId={roomId} → rowaccount={rowaccount}")
        accountid = "default"
        
    ET.SubElement(condition, "action", attrib={
        "application": "conference",
        "data": f"{roomId}-{accountid}@default"
    })

    xml_str = ET.tostring(root, encoding="unicode")
   # print(f"Inbound call processing for campaign {campaignid}")
    print(xml_str)                 
    return xml_str


async def Transfer(campaignid: int, database: str, member_extension_no: str,
                   To: str, media_ipv4: str, X_uniqueId: str, sip_req_uri: str, caller_id_from: str, variable_sip_user_agent: str, variable_uuid: str, target_uuid: str, proxyIP: str, Caller_Callee_ID_Number: str, Caller_Destination_Number: str, refer_to: str = None, direction: str = None, Caller_Username: str = None, fscallerid: str = None):
   
    # Log query parameters for debugging
    print(f"Transfer Query - campaignid: {campaignid}, database: {database}, member_extension_no: {member_extension_no}")
    print(f"Transfer Query - Caller_Callee_ID_Number: {Caller_Callee_ID_Number}, Caller_Destination_Number: {Caller_Destination_Number}")
    print(f"Transfer Query - proxyIP: {proxyIP}")
    
    # Clean and validate input parameters by removing spaces
    direction_clean = direction.strip() if direction else ""
    Caller_Callee_ID_Number_clean = Caller_Callee_ID_Number.strip() if Caller_Callee_ID_Number else ""
    Caller_Username_clean = Caller_Username.strip() if Caller_Username else ""

    # To get the refed user campainid
    
    
    campaignidref = await routing_repo.get_campaignidbyextension(database, sip_req_uri)
    
    # To Get the cliid for storing logs
    rowclinum = await routing_repo.get_inbound_data(campaignidref, database,fscallerid)
    if not rowclinum:
        cliid = None
    else:
        firstcli = rowclinum[0]
        cliid = firstcli["c_clinumberId"]
    
    # To determine member extension and customer number based on direction
    if direction_clean == "inbound":
        member_extension_no = Caller_Callee_ID_Number_clean
        account_id = member_extension_no[:-4]
        custnumber = Caller_Username[-10:]
    else:
        member_extension_no = Caller_Username_clean
        account_id = member_extension_no[:-4]
        custnumber = Caller_Callee_ID_Number[-10:]
    
    if len(sip_req_uri) > 4:
        prefix = "" 
    else:
        prefix = account_id 
    print(member_extension_no)

        
    try:
        rows = await routing_repo.get_campaign_data(campaignid, database, member_extension_no)
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
                "pulse-proxy-1.pulsework360.com": "10.0.4.114",
                "pulse-proxy-2.pulsework360.com": "10.0.4.180",
                "pulse-proxy-1.pulsework360.com:5182": "10.0.4.114",
                "pulse-proxy-2.pulsework360.com:5182": "10.0.4.180"
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
    
    # Build XML for inbound call handling
    root = ET.Element("extension", name=f"pulseTransfer")

    # Clean and validate proxyIP by removing all spaces
    proxyIP_clean = proxyIP.strip().replace(" ", "") if proxyIP else proxyIP
    print(proxyIP_clean)
    if len(str(Caller_Destination_Number)) < 8:
        dialString = f"sofia/external/sip:{prefix}${{1}}@{proxyIP_clean}:5182"
        caller_id_name = "Call transfer from " + first.m_memberName
        agentext = member_extension_no + "->" + sip_req_uri
    else:
        dialString = f"sofia/gateway/{first.p_peerName}/{first.c_accountPrefix}${{1}}"
        caller_id_name = first.c_clinumberCountryCode + first.c_clinumberName
        agentext = member_extension_no + "->" + sip_req_uri
    # Inbound condition for blacklist check - accept 8-12 digit numbers
    # condition = ET.SubElement(root, "condition", attrib={
    #     "field": "destination_number",
    #     "expression": "^(\\d{4,12})$"
    # })
    
    condition = ET.SubElement(root, "condition", attrib={
    "field": "destination_number",
    "expression": f"^(\\d{{4,12}})$"
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
        "data": f"accountid={first.c_accountId}"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"accountNo={first.c_accountNo}"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"campaignId={campaignidref}"
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
    
    ET.SubElement(condition, "action", attrib={
        "application": "lua",
        "data": f"/opt/freeswitch/storage/script/transfer_pre_post.lua {custnumber} ${{uuid}} {first.c_accountId} {first.c_accountNo}"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "export",
        "data": f"nolocal:execute_on_answer=lua /opt/freeswitch/storage/script/transfer_answer.lua ${{uuid}} {first.c_accountId} {first.c_accountNo} {first.c_clinumberId} {custnumber} {sip_req_uri}"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "set",
        "data": f"api_hangup_hook=lua /opt/freeswitch/storage/script/test.lua {direction_clean} {agentext} {custnumber} {fscallerid} {cliid}"
    })


    # Bridge action
    ET.SubElement(condition, "action", attrib={
        "application": "bridge",
        "data": f"{dialString}"
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

async def outboundSystem(database: str, peerName: str, accountPrefix: str, Extention: str, customerNumber: str, media_ipv4: str, X_uniqueId: str, callerid: str, variable_sip_user_agent: str, variable_uuid: str, accountid: int, accountno: str, calltype: str, clinumberId: int, call_limit: int):
    peerName = peerName.replace(" ", "")
    accountPrefix = accountPrefix.replace(" ", "")
    customerNumber = customerNumber.replace(" ", "")

    bridge = f"sofia/gateway/{peerName}/{accountPrefix}{customerNumber}"
    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid

    data = {
        "type": "AgentPresence",
        "l_memberExtention": Extention,
        "l_memberCustomerNumber": customerNumber,
        "l_memberCliNumberId": callerid,
        "l_memberCallDirection": "Outbound",
        "l_memberServerIp": media_ipv4,
        "l_memberStatus": "INIT",
        "eventOriginate": "Freeswitch",
        "expires": "",
        "l_memberuuid":variable_uuid,        
        "l_accountid":accountid,
        "l_accountno":accountno
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)
    
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
        "RECORD_STEREO": "true"
    }
    
    # Add <action> tags
    for key, val in {**dynamic_params, **static_params}.items():
        ET.SubElement(condition, "action", attrib={
            "application": "set",
            "data": f"{key}={val}"
        })
        
    ET.SubElement(condition, "action", attrib={
        "application": "export",
        "data": "absolute_codec_string=PCMU,PCMA,G729"
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

async def outboundPredicitve(database: str, peerName: str, accountPrefix: str, customerNumber: str, media_ipv4: str, X_uniqueId: str, callerid: str, variable_sip_user_agent: str, variable_uuid: str, accountid: int, accountno: str, clinumberId: int, call_limit: int, c_queuegroupId: str, leadId: str):
    peerName = peerName.replace(" ", "")
    accountPrefix = accountPrefix.replace(" ", "")
    customerNumber = customerNumber.replace(" ", "")

    bridge = f"sofia/gateway/{peerName}/{accountPrefix}{customerNumber}"
    callmode = "BROWSER"
    if variable_sip_user_agent !="SIP.js/0.21.1":
        callmode = "SOFTPHONE"
        X_uniqueId=variable_uuid

    data = {
        "type": "AgentPresence",
        "l_memberCustomerNumber": customerNumber,
        "l_memberCliNumberId": callerid,
        "l_memberCallDirection": "Outbound",
        "l_memberServerIp": media_ipv4,
        "l_memberStatus": "INIT",
        "eventOriginate": "Freeswitch",
        "expires": "",
        "l_memberuuid":variable_uuid,        
        "l_accountid":accountid,
        "l_accountno":accountno
    }
    await send_message(KAFKA_TOPIC, "Livemonitor", data)
    
     # Build XML
    root = ET.Element("extension", name=f"outbound_predicitive")
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseOutboundPredictive)$"
    })
    
    # Dynamic values
    dynamic_params = {
        "sip_h_X-fscallerid": callerid,
        "callmode": callmode,
        "r_accountId": accountid,
        "r_accountNo": accountno,
        "c_clinumberId": clinumberId,
        "X-uniqueId": X_uniqueId,
        "effective_caller_id_number": customerNumber,
        "effective_caller_id_name": customerNumber,
        "customernumber": customerNumber,
        "CallerCallerIDName": customerNumber,
        "predictiveleadId": leadId,
        "cc_export_vars": "predictiveleadId,customernumber"
    }
    
    static_params = {
        "sip_codec_prefs": "pcmu",
        "ignore_early_media":"false",
        "session_in_hangup_hook":"true",
        "sip_sticky_contact": "true",
        "ignore_display_updates": "true",
        "RECORD_STEREO": "true"
    }
    
    # Add <action> tags
    for key, val in {**dynamic_params, **static_params}.items():
        ET.SubElement(condition, "action", attrib={
            "application": "set",
            "data": f"{key}={val}"
        })
        
    ET.SubElement(condition, "action", attrib={
        "application": "export",
        "data": "absolute_codec_string=PCMU,PCMA,G729"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "record_session",
        "data": f"$${{recordings_dir}}/{X_uniqueId}.mp3"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "lua",
        "data": "/opt/freeswitch/storage/script/Predicitive_inbound_pre_post.lua"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "limit",
        "data": f"hiredis default {accountid} {call_limit}"
    })
    
    ET.SubElement(condition, "action", attrib={
        "application": "callcenter",
        "data": f"{c_queuegroupId}@{accountno}"
    })
    
    xml_str = ET.tostring(root, encoding="unicode")
    

    return xml_str

async def Emergency(campaignid: int, database: str, To: str, ivr_type: str, ivr_audio_url: str, ivr_flow_id: str = None, account_id: str = None, account_no: str = None, caller_id_no: str = None):
    """
    Generates dialplan XML for Emergency IVR calls.
    Handles direct playback for TTS/AUDIO or transfers to ivrFlow for FLOW.
    """
    root = ET.Element("extension", name=f"emergency_ivr_{campaignid}")
    condition = ET.SubElement(root, "condition", attrib={
        "field": "destination_number",
        "expression": "^(pulseEmergency)$"
    })

    # Set context variables for ivrFlowv3.lua
    if account_id:
        ET.SubElement(condition, "action", attrib={"application": "set", "data": f"r_accountId={account_id}"})
    if account_no:
        ET.SubElement(condition, "action", attrib={"application": "set", "data": f"r_accountNo={account_no}"})
    if caller_id_no:
        # Crucial for ivrFlowv3.lua to find the correct CLI/Account context
        ET.SubElement(condition, "action", attrib={"application": "set", "data": f"sip_h_X-cliphonenumber={caller_id_no}"})
        ET.SubElement(condition, "action", attrib={"application": "set", "data": f"destination_number={caller_id_no}"})

    if ivr_type in ["TTS", "AUDIO"] and ivr_audio_url:
        # Directly play the audio and hangup
        ET.SubElement(condition, "action", attrib={"application": "answer"})
        # We use playback with the full URL.
        ET.SubElement(condition, "action", attrib={"application": "playback", "data": ivr_audio_url})
        ET.SubElement(condition, "action", attrib={"application": "hangup"})
    elif ivr_type == "FLOW" and ivr_flow_id:
        # For FLOW, set the flow ID and run the IVR script
        ET.SubElement(condition, "action", attrib={"application": "set", "data": f"cf_callflowId={ivr_flow_id}"})
        ET.SubElement(condition, "action", attrib={"application": "answer"})
        ET.SubElement(condition, "action", attrib={"application": "lua", "data": "/opt/freeswitch/storage/script/emergencyFlow.lua"})
    else:
        # Fallback or default behavior
        ET.SubElement(condition, "action", attrib={"application": "answer"})
        ET.SubElement(condition, "action", attrib={"application": "lua", "data": "/opt/freeswitch/storage/script/emergencyFlow.lua"})

    xml_str = ET.tostring(root, encoding="unicode")
    return xml_str








