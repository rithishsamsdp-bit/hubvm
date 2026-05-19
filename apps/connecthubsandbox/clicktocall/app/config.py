from pydantic_settings import BaseSettings
from datetime import timedelta
from typing import Optional

class Settings(BaseSettings):
    AUTH_TOKEN_SECRET_KEY: str
    AUTH_TOKEN_ALGORITHM: str
    AUTH_TOKEN_NAME: str
    AUTH_TOKEN_EXPIRY_HOURS: int
    SYNC_CODEX_TETHER_SPELL: str
    ASYNC_CODEX_TETHER_SPELL: str
    
    # FreeSWITCH Configuration
    FREESWITCH_HOST: str = "3.108.200.16"
    FREESWITCH_USERNAME: str = "admin"
    FREESWITCH_PASSWORD: str = "#Pulse#$2024"
    FREESWITCH_PORT: str = "8080"
    FREESWITCH_TIMEOUT: int = 5
    FREESWITCH_DATABASE: str = "onedb"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()