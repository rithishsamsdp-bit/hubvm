import asyncio
import boto3
import sys
import os

# Add app directory to path so we can import services
sys.path.append(os.path.join(os.getcwd(), 'app'))

from services.emergency_ext_service import EmergencyExtService
from config import settings

async def main():
    print("🚀 Starting Language IVR Generation...")
    
    # The multilingual text for the menu
    menu_text = (
        "Welcome to Pulse Work 360. "
        "For English, press 1. "
        "Hindi ke liye do dabaye. "
        "Bengali jonno teen tipun. "
        "Marathi sathi chaar daban."
    )
    
    service = EmergencyExtService()
    
    # We use our existing trigger_ivr_call logic with only_generate=True
    print("🎙️ Generating TTS audio...")
    result = await service.trigger_ivr_call(
        phone_number="SYSTEM_MENU",
        prompt={"English": menu_text},
        tts_language="en-IN",
        tts_voice="Kajal",
        account_id=0,
        account_no="SYSTEM",
        only_generate=True
    )
    
    if result.get("status") == "SUCCESS":
        temp_url = result.get("audio_url")
        print(f"✅ TTS Generated: {temp_url}")
        
        # Now we COPY it to your fixed path: EmergencyAudio/language_ivr.mp3
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        
        # Extract the source key from the temp URL
        # Example URL: https://connecthub3m.s3.ap-south-1.amazonaws.com/EmergencyAudio/ext_tts_abc.mp3
        source_key = temp_url.split(".com/")[1]
        target_key = "EmergencyAudio/language_ivr.mp3"
        
        print(f"📦 Copying to {target_key}...")
        s3.copy_object(
            Bucket="connecthub3m",
            CopySource={'Bucket': "connecthub3m", 'Key': source_key},
            Key=target_key,
            ACL='public-read',
            ContentType='audio/mpeg'
        )
        
        print(f"✨ DONE! File is now live at:")
        print(f"https://connecthub3m.s3.ap-south-1.amazonaws.com/{target_key}")
    else:
        print(f"❌ Error: {result.get('message')}")

if __name__ == "__main__":
    asyncio.run(main())
