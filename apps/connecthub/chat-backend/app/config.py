# config.py — Pydantic settings (matches existing service pattern)
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # JWT — same across all services
    AUTH_TOKEN_SECRET_KEY: str
    AUTH_TOKEN_ALGORITHM: str = "HS256"
    AUTH_TOKEN_NAME: str = "accessToken"

    # MySQL connection strings
    SYNC_CODEX_TETHER_SPELL: str
    ASYNC_CODEX_TETHER_SPELL: str
    CHAT_DB_NAME: str = "connecthub_chat"

    # MongoDB connection
    MONGO_URI: str = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"
    MONGO_DB_NAME: str = "onedb"
    # AWS S3
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = "AKIAZNKPUTOKP22FGS7M"
    AWS_SECRET_ACCESS_KEY: str = "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"
    AWS_S3_BUCKET: str = "connecthub3m"
    AWS_S3_URL_EXPIRY: int = 3600

    # Upload limits
    MAX_FILE_SIZE_MB: int = 20

    # Redis — required for multi-pod Socket.IO
    ENABLE_REDIS: bool = False
    REDIS_URL: str = "redis://redis:6379/0"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
