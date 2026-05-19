import logging
from typing import Optional
from urllib.parse import parse_qs, quote
from xmlrpc.client import ServerProxy, Error, Transport
from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from services import clicktocall_service, log_service
from models.dto import CDRLoggingRequest, outBoundRequest, AccountRequest
from repos import clicktocall_repo
from itertools import cycle
import uuid
import json
import time
import base64

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Router configuration
router = APIRouter(
    prefix="/clicktocall",
    tags=["clicktocall"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

# Global state for round-robin
_round_robin_index = {}
_round_robin_len = {}

class TimeoutTransport(Transport):
    """Custom XML-RPC transport with configurable timeout"""
    
    def __init__(self, timeout: int = None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.timeout = timeout
    
    def make_connection(self, host):
        """Create connection with timeout"""
        conn = super().make_connection(host)
        conn.timeout = self.timeout
        return conn


async def get_freeswitch_client(accountid: int) -> ServerProxy:
    try:

        print(f"Account ID: {accountid}")
        if not accountid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="accountId is required"
            )
        media_data = await clicktocall_service.getmediaip(accountid, database="onedb")
        if not media_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No media instance mapped to this account"
            )

        media_private_ip = media_data["media_private_ip"]
        media_public_ip = media_data["media_public_ip"]
        proxy_private_ip = media_data["proxy_private_ip"]
        proxy_id = media_data["proxy_id"]
        username = quote("admin", safe='')
        password = quote("#Pulse#$2024", safe='')
        url = f"http://{username}:{password}@{media_private_ip}:8080/RPC2"

        transport = TimeoutTransport(timeout=30)
        return ServerProxy(url, transport=transport), proxy_private_ip
    except Exception as e:
        logger.error(f"Failed to create FreeSWITCH client: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FreeSWITCH service unavailable"
        )

def create_error_xml(error_message: str, status_code: int = 400) -> str:

    return f"""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
    <section name="result">
        <result status="not found">
            <error>{error_message}</error>
        </result>
    </section>
</document>"""


def extract_bearer_token(request: Request) -> str:
    authorization = request.headers.get("Authorization")
    
    if not authorization:
        logger.error("Missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if it starts with "Bearer "
    if not authorization.startswith("Bearer "):
        logger.error(f"Invalid Authorization header format: {authorization[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must start with 'Bearer '",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token (remove "Bearer " prefix)
    token = authorization[7:].strip()
    
    if not token:
        logger.error("Empty Bearer token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token

@router.post("/call/originate")
async def initiate_clicktocall(request: outBoundRequest, tokenRequest: Request):
    try:
        starttime = time.time()
        # Extract Bearer token from Authorization header
        token = extract_bearer_token(tokenRequest)
        call_uuid = str(uuid.uuid4())
        response_time = lambda: int((time.time() - starttime) * 1000)
        data = clicktocall_service.decode(token)
        if isinstance(data, JSONResponse):
            return data
        
        # Validate that at least recipient is provided
        if not request.To.replace(' ', ''):
            log_data = {
                "status": "error",
                "message": "Recipient is required",

            }
            await clicktocall_service.logresponse(call_uuid, log_data, 400, response_time(), database="onedb")
            return JSONResponse(status_code=400, content=log_data)
        
        logger.info(f"Click-to-call initiation request: recipient={request.To.replace(' ', '')}, originator={request.From.replace(' ', '')}")
        logger.info(f"request={request}, token={token}")
        # Get FreeSWITCH client
        custaccountID = data.m_accountId
        client, proxyprivateip  = await get_freeswitch_client(custaccountID)
        
        # Generate unique call UUID for tracking
        
        
        
        requestlog = await clicktocall_service.logrequest(tokenRequest, request, call_uuid, "onedb")
        # Use recipient as the recipient
        recipient = request.To.replace(' ', '')
        originator = request.From.replace(' ', '')
        campaignId = 0

        if not originator:
            log_data = {
                "status": "error",
                "message": "No originator found",
            }
            await clicktocall_service.logresponse(call_uuid, log_data, 400, response_time(), database="onedb")
            return JSONResponse(status_code=400, content=log_data)
        
        rows = await clicktocall_repo.get_campaign_data(campaignId, "onedb", originator)
        
        if not rows:
            log_data = {
                "status": "error",
                "message": "No Number mapped to the agent",
            }
            await clicktocall_service.logresponse(call_uuid, log_data, 404, response_time(), database="onedb")
            return JSONResponse(status_code=404, content=log_data)

        # Reset cycle if new campaign or row count changed
        if (campaignId not in _round_robin_index or
            _round_robin_len.get(campaignId) != len(rows)):
            _round_robin_index[campaignId] = cycle(range(len(rows)))
            _round_robin_len[campaignId] = len(rows)

        idx = next(_round_robin_index[campaignId])
    
        first = rows[idx]
        data = first.a_planDetails   # already a dict
        call_limit = data["limits"]["features"]["CALLLIMIT"]
        # Build variables string

        calltype = first.m_clicktocallType
        apiIntegration = first.c_apiIntegration


        if first.m_memberCallerIdMode =="NO" :
            value = first.c_clinumberCountryCode + first.c_clinumberName
            caller_id_name= first.c_clinumberCountryCode + first.c_clinumberName 
            caller_id_no= first.c_clinumberCountryCode + first.c_clinumberName 
        else:
            if first.m_memberCallerId != 0: 
                caller_id_name =  first.m_memberCallerId
                caller_id_no   =  first.m_memberCallerId
        
        data = first.a_planDetails
        call_limit = data["limits"]["features"]["CALLLIMIT"]

        if len(recipient) == 10:
            customerNumberlastten = str(recipient)[-10:]
            customerNumber = str(first.c_clinumberCountryCode) + customerNumberlastten
        else:
            customerNumber = str(recipient).lstrip("+")

        variables = [
            f"sip_h_X-uniqueId={call_uuid}",
            f"sip_req_user=pulseOutboundSystem",
            f"sip_to_user=pulseOutboundSystem",
            f"accountPrefix={first.c_accountPrefix}",
            f"peerName={first.p_peerName}",
            f"originator={originator}",
            f"customerNumber={customerNumber}",
            f"callerid={caller_id_no}",
            f"accountid={first.c_accountId}",
            f"accountno={first.c_accountNo}",
            f"calltype={calltype}",
            f"clinumberId={first.c_clinumberId}",
            f"call_limit={call_limit}",
            f"Caller-Username={originator}",
            f"origination_caller_id_name={customerNumber}",
            f"sip_h_X-clicktocall=true",
            f"origination_caller_id_number={caller_id_no}",
            f"sip_h_X-fscallerid={caller_id_name}",
            f"sip_sticky_contact=true",
            f"progress_timeout=20",
            f"hangup_after_bridge=true",
            f"ignore_early_media=ring_ready",
            "export_vars=bridge_hangup_cause,bridge_answer_time,originate_disposition,hangup_cause_q850",
            "api_hangup_hook='lua /opt/freeswitch/storage/script/C2C_outbound_hangup.lua'"
        ]
        
        # Add custom parameters if provided
        if request.Custom:
            custom_json = json.dumps(request.Custom, separators=(',', ':'))
            custom_b64 = base64.b64encode(custom_json.encode()).decode()

            variables.append(f"sip_h_X-Custom={custom_b64}")
        print(",".join(variables))
        # if request.Custom:
            
        #     for key, value in request.Custom.items():
        #         # Convert value to string if it's not already
        #         value_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        #         variables.append(f"variable_sip_h_X-Custom-{key}={value_str}")

        if calltype == "SYSTEM":

            dialString = f"sofia/internal/sip:{originator}@{proxyprivateip} pulseOutboundSystem XML public {originator})"

        elif calltype == "MOBILE":

            dialString = f"sofia/gateway/{first.p_peerName}/{first.c_accountPrefix}{str(first.c_clinumberCountryCode)}{first.m_memberMobileNo} pulseOutboundSystem XML public {originator})"

        else:
            log_data = {
                "status": "error",
                "message": "Unsupported call type",
            }
            await clicktocall_service.logresponse(call_uuid, log_data, 400, response_time(), database="onedb")
            return JSONResponse(status_code=400, content=log_data)
            
        variables_str = ",".join(variables)
        originate_cmd = (
            f"originate {{{variables_str}}}"
            f"{dialString}"
        )

        print(originate_cmd)
        
        logger.info(f"Originating clicktocall: UUID={call_uuid}, command=originate {originate_cmd}")
        
        result = client.freeswitch.api("bgapi", originate_cmd)
        result_str = str(result).strip() if result else ""
        if result_str.startswith("-ERR"):
            error_message = result_str.replace("-ERR", "").lstrip("-").strip()
            logger.error(f"FreeSWITCH error UUID={call_uuid}: {error_message}")
            log_data = {
                "status": "error",
                "message": f"Call initiation failed: {error_message}",
            }
            await clicktocall_service.logresponse(call_uuid, log_data, 400, response_time(), database="onedb")
            return JSONResponse(status_code=400, content=log_data)
            
        logger.info(f"Clicktocall originated successfully: UUID={call_uuid}, result={result}")
        
        # Success response
        log_data = {
            "status": "success",
            "message": "Click-to-call initiated successfully",
        }
        await clicktocall_service.logresponse(call_uuid, log_data, 200, response_time(), database="onedb")
        return JSONResponse(status_code=200, content=log_data)
        
    except ValueError as e:
        logger.error(f"Validation error in clicktocall: {str(e)}")
        if call_uuid:
            response_time_ms = int((time.time() - starttime) * 1000)
            log_data = {
                "status": "error",
                "message": f"Validation error: {str(e)}",
            }
            await clicktocall_service.logresponse(call_uuid, log_data, 400, response_time_ms, database="onedb")
            return JSONResponse(status_code=400, content=log_data)

    except Error as e:  # FreeSWITCH XML-RPC errors
        logger.error(f"FreeSWITCH XML-RPC error: {str(e)}", exc_info=True)
        if call_uuid:
            response_time_ms = int((time.time() - starttime) * 1000)
            log_data = {
                "status": "error",
                "message": f"FreeSWITCH XML-RPC error: {str(e)}",
            }
            await clicktocall_service.logresponse(call_uuid, log_data, 503, response_time_ms, database="onedb")
            return JSONResponse(status_code=503, content=log_data)

    except Exception as e:
        logger.exception(f"Error initiating clicktocall UUID={call_uuid}")
        if call_uuid:
            response_time_ms = int((time.time() - starttime) * 1000)
            log_data = {
                "status": "error",
                "message": str(e),
            }
            await clicktocall_service.logresponse(call_uuid, log_data, 500, response_time_ms, database="onedb")
        return JSONResponse(status_code=500, content=log_data)
