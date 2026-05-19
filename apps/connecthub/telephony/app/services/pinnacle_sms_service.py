import logging
import httpx
from typing import List

logger = logging.getLogger("pinnacle-sms-service")

class PinnacleSMSService:
    def __init__(self):
        self.base_url = "https://api.pinnacle.in/index.php/sms/urlsms"
        self.api_key = "741cc1-1cbdab-cede18-32a8b7-c451a1"
        self.sender = "SRVM"

    async def send_bulk_sms(self, numbers: List[str], message: str, dlt_entity_id: str, dlt_template_id: str):
        """Sends bulk SMS using Pinnacle API"""
        if not numbers:
            return None

        # Standardize numbers (comma separated)
        # Pinnacle often expects 10 digits or with 91, let's keep it as provided by lead
        num_str = ",".join(numbers)

        params = {
            "apikey": self.api_key,
            "sender": self.sender,
            "numbers": num_str,
            "message": message,
            "messagetype": "TXT",
            "dltentityid": dlt_entity_id,
            "dlttempid": dlt_template_id,
            "response": "Y"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                logger.info(f"📤 Sending bulk SMS to {len(numbers)} numbers via Pinnacle")
                response = await client.get(self.base_url, params=params)
                
                if response.status_code == 200:
                    res_data = response.json()
                    logger.info(f"✅ Pinnacle Response: {res_data}")
                    return res_data
                else:
                    logger.error(f"❌ Pinnacle API Error: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            logger.error(f"❌ Exception in Pinnacle SMS sending: {e}")
            return None
