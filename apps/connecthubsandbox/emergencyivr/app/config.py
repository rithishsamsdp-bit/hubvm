from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    KAFKA_HOST: str
    KAFKA_PORT: str
    FS_SERVER: str = "13.232.198.50"
    FS_PORT: str = "8021"
    FS_PASSWORD: str = "Pulse#$2024"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
