from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    AUTH_TOKEN_SECRET_KEY: str
    AUTH_TOKEN_ALGORITHM: str
    AUTH_TOKEN_NAME: str
    AUTH_TOKEN_EXPIRY_HOURS: int
    SYNC_CODEX_TETHER_SPELL: str
    ASYNC_CODEX_TETHER_SPELL: str
    ENABLE_REDIS: bool = True
    
    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()