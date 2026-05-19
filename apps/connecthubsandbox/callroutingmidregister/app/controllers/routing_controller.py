from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import CDRLoggingRequest, outBoundRequest
from fastapi.responses import PlainTextResponse
from urllib.parse import parse_qs

from services import log_service
from services import routing_service

import re
import logging

logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/callroutingmidregister",
    tags=["dynamic"]
)


def validate_campaign_id(campaign_id_str: str) -> int:
    """Validate and convert campaign_id to integer."""
    if not campaign_id_str:
        raise ValueError("campaign_id is required")
    try:
        campaign_id = int(campaign_id_str)
        if campaign_id < 0:
            raise ValueError("campaign_id must be a positive integer")
        return campaign_id
    except ValueError as e:
        logger.error(f"Invalid campaign_id: {campaign_id_str}, error: {e}")
        raise ValueError(f"Invalid campaign_id format: {campaign_id_str}")


def validate_required_fields(**kwargs) -> None:
    """Validate that required fields are present and not empty."""
    missing_fields = []
    for field_name, field_value in kwargs.items():
        if not field_value or (isinstance(field_value, str) and not field_value.strip()):
            missing_fields.append(field_name)
    
    if missing_fields:
        error_msg = f"Missing required fields: {', '.join(missing_fields)}"
        logger.error(error_msg)
        raise ValueError(error_msg)


@router.post("/voice2")
async def freeswitch_dialplan(request: Request):
    raw_body = await request.body()

    # Parse form-encoded body into dict
    form_data = {k: v[0] for k, v in parse_qs(raw_body.decode("utf-8")).items()}

    username                        = form_data.get("Caller-Username")
    Auth_user                       = form_data.get("variable_sip_h_X-Auth_user")
    campaign_id_str                 = form_data.get("variable_sip_h_X-campaignId")
    To                              = form_data.get("variable_sip_to_user")
    media_ipv4                      = form_data.get("FreeSWITCH-IPv4")
    X_uniqueId                      = form_data.get("variable_sip_h_X-uniqueId")
    sip_req_uri                     = form_data.get("variable_sip_req_user")
    sip_req_uri_refer               = form_data.get("Caller-Destination-Number")
    caller_id_name                  = form_data.get("Caller-Caller-ID-Name")
    caller_id_no                    = form_data.get("Caller-Caller-ID-Number")
    variable_sip_user_agent         = form_data.get("variable_sip_user_agent")
    variable_uuid                   = form_data.get("variable_uuid")
    target_uuid                     = form_data.get("variable_sip_h_X-Target-uuid")
    refer_to                        = form_data.get("variable_sip_refer_to")
    roomId                          = form_data.get("variable_sip_h_X-roomId")
    referRoomId                     = form_data.get("Caller-Orig-Caller-ID-Number")
    whatsappcallcheck               = form_data.get("variable_sip_h_X-whatsapp")
    proxyIP                         = form_data.get("variable_sip_network_ip")
    Caller_Username                 = form_data.get("Caller-Username")
    Caller_Callee_ID_Number         = form_data.get("Caller-Callee-ID-Number")
    Caller_Destination_Number       = form_data.get("Caller-Destination-Number")
    direction                       = form_data.get("Caller-Direction")
    
    logger.info(f"Received request data: {form_data}")
    print(form_data)
    
    try:
        # Validate campaign_id
        if campaign_id_str:
            logger.info(f"Validating campaign_id: {campaign_id_str}")
        campaign_id = validate_campaign_id(campaign_id_str) if campaign_id_str else 0
        logger.info(f"Campaign ID after validation: {campaign_id}")
        
        print("sip_req_uri:", sip_req_uri)
        print("sip_req_uri_refer:", sip_req_uri_refer)
        print("refer_to:", refer_to)
        print("roomId:", roomId)
        print("referRoomId:", referRoomId)
        print("Caller_Callee_ID_Number:", Caller_Callee_ID_Number)
        
        # # Validate critical fields
        # if not variable_uuid:
        #     raise ValueError("variable_uuid is required for call routing")
        # if not To:
        #     raise ValueError("To (destination number) is required for call routing")
        
        logger.info(f"Variable UUID: {variable_uuid}, Destination (To): {To}")
        
        # Generate the XML dynamically from campaign_id
        # normalize values for reliable comparisons (strip whitespace and handle None)
        sip_req_uri_norm = (sip_req_uri or "").strip()
        sip_req_uri_refer_norm = (sip_req_uri_refer or "").strip()
        refer_to_norm = (refer_to or "").strip()

        logger.info(f"Routing decision - sip_req_uri: '{sip_req_uri_norm}', sip_req_uri_refer: '{sip_req_uri_refer_norm}', refer_to: '{refer_to_norm}'")

        if sip_req_uri_refer_norm == "pulseConference":
            # Conference via refer - validate conference-specific fields
            logger.info("Routing: Conference via refer")
            logger.info(f"Conference parameters - roomId: {roomId}, referRoomId: {referRoomId}, target_uuid: {target_uuid}")
            if not target_uuid:
                logger.warning(f"Conference via refer missing target_uuid")
            print("Conference via refer")
            xml_content = await routing_service.Conference(campaign_id, "onedb", username, To, media_ipv4, X_uniqueId, sip_req_uri_refer, caller_id_name, variable_sip_user_agent, variable_uuid, target_uuid, roomId, referRoomId, Caller_Callee_ID_Number)
            logger.info("Conference call routing completed successfully")
        
        elif refer_to_norm:
            # Transfer via refer - validate transfer-specific fields
            logger.info(f"Routing: Transfer via refer to {To}")
            logger.info(f"Transfer parameters - Caller_Callee_ID_Number: {Caller_Callee_ID_Number}, Caller_Destination_Number: {Caller_Destination_Number}, target_uuid: {target_uuid}, refer_to: {refer_to}")
            # if not target_uuid:
            #     raise ValueError("target_uuid is required for call transfer")
            if not Caller_Callee_ID_Number or not Caller_Destination_Number:
                raise ValueError("Caller_Callee_ID_Number is required for call transfer")
            print("Transfer via refer")
            xml_content = await routing_service.Transfer(campaign_id, "onedb", Caller_Callee_ID_Number, To, media_ipv4, X_uniqueId, sip_req_uri_refer, caller_id_name, variable_sip_user_agent, variable_uuid, target_uuid, proxyIP, Caller_Callee_ID_Number, Caller_Destination_Number, refer_to, direction, Caller_Username)
            logger.info("Transfer call routing completed successfully")
        
        elif sip_req_uri_norm == "pulseInbound":
            # Inbound call
            logger.info(f"Routing: Inbound call to {To}")
            logger.info(f"Inbound parameters - username: {username}, From: {username}")
            if not username:
                logger.warning(f"Inbound call missing username")
            print("Inbound Call")
            xml_content = await routing_service.Inbound(campaign_id, "onedb", username, To, media_ipv4, X_uniqueId, sip_req_uri, caller_id_name, variable_sip_user_agent, variable_uuid)
            logger.info("Inbound call routing completed successfully")
        elif sip_req_uri_norm == "pulseOutboundSystem":
            # Outbound system call
            peerName = form_data.get("variable_peerName")
            accountPrefix = form_data.get("variable_accountPrefix")
            Extention = form_data.get("variable_originator")
            customerNumber = form_data.get("variable_customerNumber")
            callerid = form_data.get("variable_callerid")
            accountid = form_data.get("variable_accountid")
            accountno = form_data.get("variable_accountno")
            calltype = form_data.get("variable_calltype")
            clinumberId = form_data.get("variable_clinumberId")
            call_limit = form_data.get("variable_call_limit")
            uuid = "out-" + form_data.get("variable_sip_h_X-uniqueId")
            
            xml_content = await routing_service.outboundSystem("onedb", peerName, accountPrefix, Extention, customerNumber, media_ipv4, uuid, callerid, variable_sip_user_agent, variable_uuid, accountid, accountno, calltype, clinumberId, call_limit)
        elif sip_req_uri_norm == "pulseBargeIn":
            # Barge in call - validate barge-specific fields
            logger.info(f"Routing: Barge In call to {To}")
            logger.info(f"Barge In parameters - target_uuid: {target_uuid}")
            if not target_uuid:
                raise ValueError("target_uuid is required for barge in call")
            print("Barge In Call")
            xml_content = await routing_service.Barge(campaign_id, "onedb", username, To, media_ipv4, X_uniqueId, sip_req_uri, caller_id_name, variable_sip_user_agent, variable_uuid, target_uuid)
            logger.info("Barge In call routing completed successfully")
        
        elif sip_req_uri_norm == "pulseInternal":
            # Internal call - validate internal-specific fields
            logger.info(f"Routing: Internal call from {username} to {To}")
            logger.info(f"Internal call parameters - Auth_user: {Auth_user}, proxyIP: {proxyIP}, caller_id_no: {caller_id_no}")
            # if not Auth_user:
            #     raise ValueError("Auth_user is required for internal calls")
            # if not caller_id_no:
            #     raise ValueError("caller_id_no is required for internal calls")
            # if not proxyIP:
            #     raise ValueError("proxyIP is required for internal calls")
            print("Internal Call")
            xml_content = await routing_service.internal(campaign_id, "onedb", username, To, media_ipv4, X_uniqueId, sip_req_uri, caller_id_name, variable_sip_user_agent, variable_uuid, Auth_user, caller_id_no, proxyIP)
            logger.info("Internal call routing completed successfully")
        
        elif sip_req_uri_norm == "pulseConference":
            # Conference via direct
            logger.info(f"Routing: Conference via direct to room {roomId}")
            logger.info(f"Conference parameters - roomId: {roomId}, referRoomId: {referRoomId}, target_uuid: {target_uuid}")
            print("Conference via direct")
            xml_content = await routing_service.Conference(campaign_id, "onedb", username, To, media_ipv4, X_uniqueId, sip_req_uri, caller_id_name, variable_sip_user_agent, variable_uuid, target_uuid, roomId, referRoomId)
            logger.info("Conference (direct) routing completed successfully")
        elif To == "*98":
            xml_content = await routing_service.Voicemail()
            logger.info("Voicemail access routing completed successfully")
        else:
            # Outbound call - validate outbound-specific fields
            logger.info(f"Routing: Outbound call from {username} ({Auth_user}) to {To}")
            logger.info(f"Outbound parameters - campaign_id: {campaign_id}, caller_id_no: {caller_id_no}, whatsapp: {whatsappcallcheck}")
            # if not Auth_user:
            #     raise ValueError("Auth_user is required for outbound calls")
            # if not caller_id_no:
            #     raise ValueError("caller_id_no is required for outbound calls")
            print("Outbound Call")
            xml_content = await routing_service.outbound(campaign_id, "onedb", username, To, media_ipv4, X_uniqueId, sip_req_uri, caller_id_name, variable_sip_user_agent, variable_uuid, Auth_user, caller_id_no, whatsappcallcheck)
            logger.info("Outbound call routing completed successfully")
        
        # Wrap in proper FreeSwitch XML structure
        full_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
    <section name="dialplan" description="RE Dialplan For FreeSwitch">
        <context name="webrtc">
            {xml_content}
        </context>
    </section>
</document>"""
        logger.info(f"Generated XML for call UUID: {variable_uuid}")
        #print(full_xml)
        return Response(content=full_xml, media_type="application/xml")

    except ValueError as e:
        # Validation error - log and return error response
        error_msg = str(e)
        logger.error(f"Validation error: {error_msg}")
        
        error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
    <section name="result">
        <result status="not found">
            <error>{}</error>
        </result>
    </section>
</document>""".format(error_msg)
        
        return Response(content=error_xml, media_type="application/xml", status_code=400)
    
    except HTTPException as e:
        error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
    <section name="result">
        <result status="not found" />
    </section>
</document>"""
        logger.error(f"HTTP error: {e}")
        return Response(content=error_xml, media_type="application/xml", status_code=e.status_code)
    
    except Exception as e:
        # Unexpected error - log and return error response
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
    <section name="result">
        <result status="not found">
            <error>Internal server error</error>
        </result>
    </section>
</document>"""
        
        return Response(content=error_xml, media_type="application/xml", status_code=500) 


@router.post("/directory")
async def freeswitch_directory(request: Request):
    raw_body = await request.body()
    form_data = {k: v[0] for k, v in parse_qs(raw_body.decode("utf-8")).items()}
    print(f"Directory request received: {form_data}")
    username = form_data.get("user")
    domain = form_data.get("domain")
    
    # Validate required fields for directory
    if not username:
        logger.error("Directory request missing username")
        error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                        <document type="freeswitch/xml">
                            <section name="result">
                                <result status="not found">
                                    <error>username is required</error>
                                </result>
                            </section>
                        </document>"""
        return Response(content=error_xml, media_type="application/xml", status_code=400)
    
    if not domain:
        logger.error("Directory request missing domain")
        error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                        <document type="freeswitch/xml">
                            <section name="result">
                                <result status="not found">
                                    <error>domain is required</error>
                                </result>
                            </section>
                        </document>"""
        return Response(content=error_xml, media_type="application/xml", status_code=400)
    
    try:
        xml_content = await routing_service.Directory(domain, "onedb", username, form_data)
        print(xml_content)
        return Response(content=xml_content, media_type="application/xml")
    
    except Exception as e:
        error_xml = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                        <document type="freeswitch/xml">
                            <section name="result">
                                <result status="not found">
                                    <error>Internal server error</error>
                                </result>
                            </section>
                        </document>"""
        return Response(content=error_xml, media_type="application/xml", status_code=500)

