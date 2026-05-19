from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    FREESWITCH_HOST: str
    FREESWITCH_PORT: str
    FREESWITCH_PASSWORD: str

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()