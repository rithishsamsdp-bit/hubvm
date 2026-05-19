import os
import logging
from dotenv import load_dotenv
from ESL import ESLconnection

# Load environment variables
load_dotenv()

FS_SERVER = os.getenv("FS_SERVER")
FS_PORT = os.getenv("FS_PORT")
FS_PASSWORD = os.getenv("FS_PASSWORD")

def execute_freeswitch_command(command: str, args: str = "") -> str:
    """Executes a FreeSWITCH API command and returns the response."""
    try:
        conn = ESLconnection(FS_SERVER, FS_PORT, FS_PASSWORD)
        if not conn.connected():
            logging.error("❌ Failed to connect to FreeSWITCH.")
            return None

        response = conn.api(command, args)

        if response is None:
            logging.error("❌ FreeSWITCH API call returned None.")
            return None
        
        result = response.getBody()
        if result is None:
            logging.error("❌ getBody() returned None.")
            return None

        return result.strip()

    except Exception as e:
        logging.error(f"⚠️ Error executing FreeSWITCH command: {e}")
        return None
