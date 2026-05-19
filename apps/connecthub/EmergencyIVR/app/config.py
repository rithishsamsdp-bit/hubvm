from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    KAFKA_HOST: str
    KAFKA_PORT: str
    FS_SERVER: str = "13.232.198.50"
    FS_PORT: str = "8021"
    FS_PASSWORD: str = "Pulse#$2024"

    # Database (for WhatsApp account lookup, CLI numbers)
    ASYNC_CODEX_TETHER_SPELL: str = ""

    # MongoDB (for activity logging)
    MONGO_URI: str = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"

    # JWT Auth
    JWT_SECRET: str = "SomeRandomSalt"
    JWT_ALGORITHM: str = "HS256"

    # AWS (for TTS via Polly)
    POLLY_ACCESS_KEY_ID: str = "AKIAZNKPUTOKP22FGS7M"
    POLLY_SECRET_ACCESS_KEY: str = "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"
    AWS_REGION: str = "ap-south-1"

    # AWS (for S3 uploads)
    AWS_ACCESS_KEY_ID: str = "AKIAZNKPUTOKP22FGS7M"
    AWS_SECRET_ACCESS_KEY: str = "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"

    # Google Cloud TTS
    GOOGLE_TTS_API_KEY: str = "AQ.Ab8RN6L16ZLJt9L9fIlavE1Mha79DhxITobttQCiMAVaNxlmKQ"

    # Sarvam AI
    SARVAM_API_KEY: str = "sk_xld64lhy_3I10oDhnOtsR7mzcptNhiNaU"

    # SMS (Pinnacle)
    SMS_API_KEY: str = "741cc1-1cbdab-cede18-32a8b7-c451a1"
    SMS_SENDER: str = "SRVM"
    SMS_DLT_ENTITY_ID: str = "1701174616518506137"
    SMS_DLT_TEMPLATE_ID: str = "1707174713552746138"

    # API Server
    API_PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
