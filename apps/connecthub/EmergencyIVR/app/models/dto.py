"""
Request/Response models for Emergency External APIs.
"""

from pydantic import BaseModel
from typing import Optional


class IVRPrompt(BaseModel):
    English: Optional[str] = ""
    Hindi: Optional[str] = ""
    Bengali: Optional[str] = ""
    Marathi: Optional[str] = ""
    Gujarati: Optional[str] = ""
    Default: Optional[str] = ""


class IVRCallRequest(BaseModel):
    phone_number: str
    prompt: Optional[IVRPrompt] = None
    audio_url: Optional[str] = None
    call_flow_id: Optional[int] = None
    cli_number_id: Optional[int] = None
    carrier_name: Optional[str] = "Tata-UL-CHN"
    tts_language: str = "en-US"
    tts_voice: str = "Joanna"


class WhatsAppRequest(BaseModel):
    phone_number: str
    template_id: str


class SMSRequest(BaseModel):
    phone_number: str
    message: str
    dlt_entity_id: Optional[str] = None
    dlt_template_id: Optional[str] = None
