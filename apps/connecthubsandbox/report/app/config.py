from pydantic_settings import BaseSettings
from datetime import timedelta
import os
from dotenv import load_dotenv
from pathlib import Path
class Settings(BaseSettings):
    AUTH_TOKEN_SECRET_KEY: str
    AUTH_TOKEN_ALGORITHM: str
    AUTH_TOKEN_NAME: str
    AUTH_TOKEN_EXPIRY_HOURS: int
    SYNC_CODEX_TETHER_SPELL: str
    ASYNC_CODEX_TETHER_SPELL: str


    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()



# one drive start
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

AWS_BUCKET = os.getenv("AWS_BUCKET")
AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

TENANT_ID = os.getenv("TENANT_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("REFRESH_TOKEN")
# one drive end