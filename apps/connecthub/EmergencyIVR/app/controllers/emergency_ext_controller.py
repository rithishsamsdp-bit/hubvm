"""
Emergency External API Controller
3 POST endpoints for customer's external frontend — one phone number per request.
Prefix: /emergency/ext
"""

import jwt
import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from config import settings
from models.dto import IVRCallRequest, WhatsAppRequest, SMSRequest
from services.emergency_ext_service import EmergencyExtService

logger = logging.getLogger("emergency-ext-controller")

router = APIRouter(
    prefix="/emergency/ext",
    tags=["Emergency External APIs"],
)


def decode_token(request: Request):
    token = request.cookies.get("accessToken")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        return None, JSONResponse(
            status_code=401,
            content={"message": "Authentication token missing"},
        )

    try:
        data = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return data, None
    except jwt.PyJWTError:
        return None, JSONResponse(status_code=401, content={"message": "Invalid token"})


@router.post("/ivr")
async def trigger_ivr_call(request: IVRCallRequest, tokenRequest: Request):

    user_data, error = decode_token(tokenRequest)
    if error:
        return error

    service = EmergencyExtService()
    result = await service.trigger_ivr_call(
        phone_number=request.phone_number,
        account_id=user_data.get("m_accountId"),
        account_no=user_data.get("m_accountNo"),
        proxy_id=user_data.get("p_proxyId"),
        call_flow_id=request.call_flow_id,
        audio_url=request.audio_url,
        prompt=request.prompt,
        tts_language=request.tts_language,
        tts_voice=request.tts_voice,
        cli_number_id=request.cli_number_id,
        carrier_name=request.carrier_name,
    )

    if result.get("status") == "ERROR":
        return JSONResponse(status_code=400, content=result)

    return JSONResponse(status_code=200, content=result)


@router.post("/whatsapp")
async def send_whatsapp_message(request: WhatsAppRequest, tokenRequest: Request):

    user_data, error = decode_token(tokenRequest)
    if error:
        return error

    service = EmergencyExtService()
    result = await service.send_whatsapp(
        phone_number=request.phone_number,
        template_id=request.template_id,
        account_id=user_data.get("m_accountId"),
        account_no=user_data.get("m_accountNo"),
    )

    if result.get("status") == "ERROR":
        return JSONResponse(status_code=400, content=result)

    return JSONResponse(status_code=200, content=result)


@router.post("/sms")
async def send_sms_message(request: SMSRequest, tokenRequest: Request):

    user_data, error = decode_token(tokenRequest)
    if error:
        return error

    service = EmergencyExtService()
    result = await service.send_sms(
        phone_number=request.phone_number,
        message=request.message,
        account_id=user_data.get("m_accountId"),
        account_no=user_data.get("m_accountNo"),
        dlt_entity_id=request.dlt_entity_id,
        dlt_template_id=request.dlt_template_id,
    )

    if result.get("status") == "ERROR":
        return JSONResponse(status_code=400, content=result)

    return JSONResponse(status_code=200, content=result)


@router.post("/update_preference")
async def update_customer_preference(request: Request):
    """
    Public endpoint for FreeSWITCH Lua script to update language preference.
    Payload: {"phone_number": "...", "language": "..."}
    """
    try:
        data = await request.json()
        phone_number = data.get("phone_number")
        language = data.get("language")
        
        if not phone_number or not language:
            return JSONResponse(status_code=400, content={"status": "ERROR", "message": "Missing phone_number or language"})

        service = EmergencyExtService()
        result = await service.update_lead_preference(phone_number, language)
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "ERROR", "message": str(e)})


@router.get("/language_menu_url")
async def get_language_menu_url():
    """
    Returns the URL for the multilingual language selection menu.
    """
    try:
        service = EmergencyExtService()
        result = await service.get_language_menu_audio()
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "ERROR", "message": str(e)})


@router.get("/get_prompts")
async def get_prompts(phone_number: str):
    """
    Returns the full multilingual prompt JSON for a phone number.
    Used by Lua script to avoid ESL variable truncation.
    """
    try:
        from db.context import get_mongo_db
        db = get_mongo_db("onedb")
        
        # Handle 91 prefix mismatch
        search_number = phone_number
        if phone_number.startswith("91") and len(phone_number) == 12:
            search_number = phone_number[2:]
        elif not phone_number.startswith("91") and len(phone_number) == 10:
            # Also try with 91 just in case it was saved with it
            alt_number = "91" + phone_number
        else:
            alt_number = phone_number

        doc = db["emergency_active_prompts"].find_one({
            "$or": [
                {"phone_number": phone_number},
                {"phone_number": search_number},
                {"phone_number": locals().get("alt_number", phone_number)}
            ]
        })
        
        if doc:
            return JSONResponse(status_code=200, content={
                "prompts": doc.get("prompts", {}),
                "resolved_prompts": doc.get("resolved_prompts", {})
            })
        return JSONResponse(status_code=404, content={"message": f"No prompts found for {phone_number}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "ERROR", "message": str(e)})
