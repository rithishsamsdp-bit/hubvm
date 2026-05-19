from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    AUTH_TOKEN_SECRET_KEY: str
    AUTH_TOKEN_ALGORITHM: str
    AUTH_TOKEN_NAME: str
    AUTH_TOKEN_EXPIRY_HOURS: int

    SYNC_CODEX_TETHER_SPELL: str
    ASYNC_CODEX_TETHER_SPELL: str
    ASYNC_CODEX_NAME: str

    ENABLE_REDIS: bool = True

    FS_EFS_BASE_DIR: str
    FS_XML_RPC_USERNAME: str
    FS_XML_RPC_PASSWORD: str
    FS_XML_RPC_PORT: int

    AWS_ACCESS_KEY_ID : str
    AWS_SECRET_ACCESS_KEY : str
    AWS_DEFAULT_REGION : str
    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()