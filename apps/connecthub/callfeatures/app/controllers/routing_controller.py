from xmlrpc.client import ServerProxy, Error, Transport
from fastapi import APIRouter, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from models.dto import CDRLoggingRequest, outBoundRequest, AccountRequest, ConferenceHangupRequest, ConferenceHangupAllRequest, ConferenceListRequest
from fastapi.responses import PlainTextResponse
from urllib.parse import parse_qs
import urllib.request
import urllib.error
import json
from urllib.parse import quote
from services import log_service
from services import routing_service
from repos import routing_repo
from typing import Optional, List

import re

async def resolve_target_hosts(p_proxyId: Optional[int], fsDestination: Optional[str] = None) -> List[str]:
    """Resolve target hosts from p_proxyId by looking up p_mediainstances table.
    Falls back to fsDestination or default IP."""
    if p_proxyId is not None:
        ips = await routing_repo.get_media_instances_by_proxy_id(p_proxyId)
        if ips:
            return ips
    if fsDestination:
        return [fsDestination]
    return ['10.0.4.201']

router = APIRouter(
    prefix="/callfeatures",
    tags=["dynamic"]
)


FREESWITCH_HOST = '10.0.4.201'
FREESWITCH_USERNAME = quote('admin', safe='')
FREESWITCH_PASSWORD = quote('#Pulse#$2024', safe='')
FREESWITCH_PORT = '8080'

class TimeoutTransport(Transport):
    def __init__(self, timeout=5, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.timeout = timeout
    
    def make_connection(self, host):
        conn = super().make_connection(host)
        conn.timeout = self.timeout
        return conn

@router.get("/conference/list")
async def get_all_conferences(conference_name: str = None, fsDestination: str = None, p_proxyId: int = None):
    """
    Get list of all active conferences with participants
    If conference_name is provided, return only that conference's participants
    """
    try:
        target_hosts = await resolve_target_hosts(p_proxyId, fsDestination)
        
        result = None
        used_host = None
        for host in target_hosts:
            try:
                server = ServerProxy(
                    f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{host}:{FREESWITCH_PORT}/RPC2"
                )
                if conference_name:
                    host_result = server.freeswitch.api("conference", f"{conference_name} list")
                    if "-ERR Conference" in host_result and "not found" in host_result:
                        if "-" in conference_name:
                            fallback_name = conference_name.split('-')[0]
                            host_result = server.freeswitch.api("conference", f"{fallback_name} list")
                            if not ("-ERR Conference" in host_result and "not found" in host_result):
                                conference_name = fallback_name
                                result = host_result
                                used_host = host
                                break
                        continue
                    else:
                        result = host_result
                        used_host = host
                        break
                else:
                    host_result = server.freeswitch.api("conference", "list")
                    if host_result and "no active conferences" not in host_result.lower():
                        result = host_result
                        used_host = host
                        break
            except Exception as host_err:
                print(f"Host {host} failed: {host_err}")
                continue
        
        if not result or result.strip() == "" or "no active conferences" in result.lower() or "not found" in result.lower():
            return JSONResponse(
                content={
                    "conferences": [],
                    "total_conferences": 0,
                    "conference_name": conference_name
                },
                status_code=200
            )
        
        conferences = []
        current_conference_name = conference_name
        lines = result.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            
            if not line:
                continue
            
            # Extract conference name from header if not provided
            if line.startswith('+OK Conference') and not conference_name:
                parts = line.split()
                if len(parts) >= 3:
                    current_conference_name = parts[2]
                continue
            
            if line.startswith('Conference') or line.startswith('+OK'):
                continue
            
            parts = line.split(';')
            
            if len(parts) >= 5:
                conference_id = parts[0].strip()
                profile = parts[1].strip()
                caller_id_number = parts[4].strip()
                
                participant_no = caller_id_number
                
                if 'sofia/external/' in profile:
                    profile_parts = profile.split('/')
                    if len(profile_parts) >= 3:
                        endpoint = profile_parts[2].split('@')[0]
                        
                        digit_only = re.sub(r'\D', '', endpoint)  
                        if len(digit_only) > 12:
                            participant_no = digit_only[-12:]
                        else:
                            participant_no = digit_only if digit_only else endpoint
                elif len(caller_id_number) > 12 and caller_id_number.isdigit():
                    participant_no = caller_id_number[-12:]
                
                conferences.append({
                    "participant_no": participant_no,
                    "conference_id": conference_id,
                    "conference_name": current_conference_name
                })
        
        return JSONResponse(
            content={
                "conferences": conferences,
                "total_conferences": len(conferences),
                "conference_name": current_conference_name
            },
            status_code=200
        )
        
    except Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"XML-RPC error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching conferences: {str(e)}"
        )

@router.post("/conference/{conference_name}/kick/{participant_id}/{AccountRequest}")
async def kick_participant(conference_name: str, participant_id: str, AccountRequest: str, fsDestination: str = None, p_proxyId: int = None):
    try:
        target_hosts = await resolve_target_hosts(p_proxyId, fsDestination)

        result = None
        used_host = None
        for host in target_hosts:
            try:
                transport = TimeoutTransport(timeout=5)
                server = ServerProxy(
                    f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{host}:{FREESWITCH_PORT}/RPC2",
                    transport=transport
                )
                target_conference = f"{conference_name}-{AccountRequest}"
                host_result = server.freeswitch.api("conference", f"{target_conference} hup {participant_id}")
                
                if "-ERR Conference" in host_result and "not found" in host_result:
                    target_conference = conference_name
                    host_result = server.freeswitch.api("conference", f"{target_conference} hup {participant_id}")
                
                print(f"Kick Participant Result (Host: {host}):{target_conference} hup {participant_id}", host_result)
                
                if not ("-ERR Conference" in host_result and "not found" in host_result):
                    result = host_result
                    used_host = host
                    break
                result = host_result
                used_host = host
            except Exception as host_err:
                print(f"Host {host} failed: {host_err}")
                continue

        return JSONResponse(
            content={
                "status": "success",
                "message": f"Participant {participant_id} kicked from conference {conference_name}",
                "result": result
            },
            status_code=200
        )
        
    except Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"XML-RPC error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error kicking participant: {str(e)}"
        )

@router.post("/conference/{conference_name}/kick-all/{AccountRequest}")
async def kick_all_participants_from_conference(conference_name: str,  AccountRequest: str, fsDestination: str = None, p_proxyId: int = None):
    try:
        target_hosts = await resolve_target_hosts(p_proxyId, fsDestination)

        result = None
        used_host = None
        for host in target_hosts:
            try:
                transport = TimeoutTransport(timeout=5)
                server = ServerProxy(
                    f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{host}:{FREESWITCH_PORT}/RPC2",
                    transport=transport
                )
                target_conference = f"{conference_name}-{AccountRequest}"
                host_result = server.freeswitch.api("conference", f"{target_conference} hup all")
                
                if "-ERR Conference" in host_result and "not found" in host_result:
                    target_conference = conference_name
                    host_result = server.freeswitch.api("conference", f"{target_conference} hup all")

                print(f"Kick All Result (Host: {host}):{target_conference} hup all", host_result)
                
                if not ("-ERR Conference" in host_result and "not found" in host_result):
                    result = host_result
                    used_host = host
                    break
                result = host_result
                used_host = host
            except Exception as host_err:
                print(f"Host {host} failed: {host_err}")
                continue
        
        return JSONResponse(
            content={
                "status": "success",
                "message": f"All participants kicked from conference {conference_name}",
                "result": result
            },
            status_code=200
        )
        
    except Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"XML-RPC error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error kicking all participants from conference: {str(e)}"
        )

@router.post("/app/conference/list")
async def get_all_conferences_app(request: ConferenceListRequest):
    """
    Get list of all active conferences with participants for App
    If conference_name is provided, return only that conference's participants
    """
    try:
        print(f"Conference List App Request: {request}")
        conference_name = request.conference_name
        target_hosts = await resolve_target_hosts(request.p_proxyId)
        
        result = None
        for host in target_hosts:
            try:
                server = ServerProxy(
                    f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{host}:{FREESWITCH_PORT}/RPC2"
                )
                if conference_name:
                    host_result = server.freeswitch.api("conference", f"{conference_name} list")
                    if "-ERR Conference" in host_result and "not found" in host_result:
                        if "-" in conference_name:
                            fallback_name = conference_name.split('-')[0]
                            host_result = server.freeswitch.api("conference", f"{fallback_name} list")
                            if not ("-ERR Conference" in host_result and "not found" in host_result):
                                conference_name = fallback_name
                                result = host_result
                                break
                        continue
                    else:
                        result = host_result
                        break
                else:
                    host_result = server.freeswitch.api("conference", "list")
                    if host_result and "no active conferences" not in host_result.lower():
                        result = host_result
                        break
            except Exception as host_err:
                print(f"Host {host} failed: {host_err}")
                continue
        
        if not result or result.strip() == "" or "no active conferences" in result.lower() or "not found" in result.lower():
            return JSONResponse(
                content={
                    "conferences": [],
                    "total_conferences": 0,
                    "conference_name": conference_name
                },
                status_code=200
            )
        
        conferences = []
        current_conference_name = conference_name 
        lines = result.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            
            if not line:
                continue
            
            if line.startswith('+OK Conference') and not conference_name:
                parts = line.split()
                if len(parts) >= 3:
                    current_conference_name = parts[2]
                continue
            
            if line.startswith('Conference') or line.startswith('+OK'):
                continue
            
            parts = line.split(';')
            
            if len(parts) >= 5:
                conference_id = parts[0].strip()
                profile = parts[1].strip()
                caller_id_number = parts[4].strip()
                
                participant_no = caller_id_number
                
                if 'sofia/external/' in profile:
                    profile_parts = profile.split('/')
                    if len(profile_parts) >= 3:
                        endpoint = profile_parts[2].split('@')[0]
                        
                        digit_only = re.sub(r'\D', '', endpoint)  
                        if len(digit_only) > 12:
                            participant_no = digit_only[-12:]
                        else:
                            participant_no = digit_only if digit_only else endpoint
                elif len(caller_id_number) > 12 and caller_id_number.isdigit():
                    participant_no = caller_id_number[-12:]
                
                conferences.append({
                    "participant_no": participant_no,
                    "conference_id": conference_id,
                    "conference_name": current_conference_name
                })
        
        conference_base_name = current_conference_name
        account_request = ""
        
        if current_conference_name and '-' in current_conference_name:
             parts = current_conference_name.split('-', 1)
             if len(parts) == 2:
                 conference_base_name = parts[0]
                 account_request = parts[1]

        return JSONResponse(
            content={
                "conferences": conferences,
                "total_conferences": len(conferences),
                "conference_name": current_conference_name,
                "account_request": account_request
            },
            status_code=200
        )
        
    except Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"XML-RPC error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching conferences: {str(e)}"
        )

@router.post("/app/conference/hangup-all")
async def kick_all_participants_from_conference_app(request: ConferenceHangupAllRequest):
    try:
        print(f"Hangup All App Request: {request}")
        target_hosts = await resolve_target_hosts(request.p_proxyId)

        target_conference = request.conference_name

        result = None
        for host in target_hosts:
            try:
                transport = TimeoutTransport(timeout=5)
                server = ServerProxy(
                    f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{host}:{FREESWITCH_PORT}/RPC2",
                    transport=transport
                )
                host_result = server.freeswitch.api("conference", f"{target_conference} hup all")
                print(f"Kick All Result (Host: {host}):{target_conference} hup all", host_result)
                
                if not ("-ERR Conference" in host_result and "not found" in host_result):
                    result = host_result
                    break
                result = host_result
            except Exception as host_err:
                print(f"Host {host} failed: {host_err}")
                continue
        
        return JSONResponse(
            content={
                "status": "success",
                "message": f"All participants kicked from conference {target_conference}",
                "result": result
            },
            status_code=200
        )
        
    except Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"XML-RPC error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error kicking all participants from conference: {str(e)}"
        )

@router.post("/app/conference/hangup")
async def kick_participant_app(request: ConferenceHangupRequest):
    try:
        print(f"Hangup Participant App Request: {request}")
        target_hosts = await resolve_target_hosts(request.p_proxyId)

        target_conference = request.conference_name

        result = None
        for host in target_hosts:
            try:
                transport = TimeoutTransport(timeout=5)
                server = ServerProxy(
                    f"http://{FREESWITCH_USERNAME}:{FREESWITCH_PASSWORD}@{host}:{FREESWITCH_PORT}/RPC2",
                    transport=transport
                )
                host_result = server.freeswitch.api("conference", f"{target_conference} hup {request.participant_id}")
                print(f"Kick Participant Result (Host: {host}):{target_conference} hup {request.participant_id}", host_result)
                
                if not ("-ERR Conference" in host_result and "not found" in host_result):
                    result = host_result
                    break
                result = host_result
            except Exception as host_err:
                print(f"Host {host} failed: {host_err}")
                continue

        return JSONResponse(
            content={
                "status": "success",
                "message": f"Participant {request.participant_id} kicked from conference {target_conference}",
                "result": result
            },
            status_code=200
        )
        
    except Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"XML-RPC error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error kicking participant: {str(e)}"
        )

@router.post("/whatsapp/initial-template")
async def send_whatsapp_template(request: Request):
    """
    Send WhatsApp template message to initiate contact
    Expects JSON body with: { "whatsappNumber": "phone_number" }
    """
    try:
        body = await request.json()
        whatsapp_number = body.get("whatsappNumber")
        
        if not whatsapp_number:
            raise HTTPException(
                status_code=400,
                detail="whatsappNumber is required"
            )
        
        WHATSAPP_API_URL = "https://graph.facebook.com/v21.0/673415019179739/messages"
        WHATSAPP_TOKEN = "EAAVwl6c0M5cBO77YScFukPSdV6mQkOi5WrcxgNDarxRa5RUUf7b9ZAfAhfH5VLKwwEDJHAQ8DchrQbIGboLZA3Xil9ZCfhZAWSZBaToWE9DLJaRfc5VFuVr31rx9ZCOSZA8DjL2ycUT8DBQHf7ZCGm9Eedk4iZCrHMSY6xZA8jBq3k1nNxZBxzKcengjlFylZCgZCkfOAphEXdUCCgtatxRyyHlSal8qKzXzbh1VQmSbPYExzVynNSIAuTiVuZASZCU8rAQ"
        
        whatsapp_payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": whatsapp_number,
            "type": "template",
            "template": {
                "name": "open",
                "language": {
                    "code": "en_US"
                },
                "components": []
            }
        }
        
        # Convert payload to JSON bytes
        data = json.dumps(whatsapp_payload).encode('utf-8')
        
        # Create request
        req = urllib.request.Request(
            WHATSAPP_API_URL,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {WHATSAPP_TOKEN}"
            },
            method='POST'
        )
        
        # Make request to WhatsApp API
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                
                return JSONResponse(
                    content={
                        "status": "success",
                        "message": f"WhatsApp template sent to {whatsapp_number}",
                        "data": response_data
                    },
                    status_code=200
                )
        except urllib.error.HTTPError as e:
            error_data = json.loads(e.read().decode('utf-8'))
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Failed to send WhatsApp template",
                    "error": error_data
                },
                status_code=e.code
            )
                
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error sending WhatsApp template: {str(e)}"
        )
