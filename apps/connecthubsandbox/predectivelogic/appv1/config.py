from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    KAFKA_HOST: str
    KAFKA_PORT: str
    MYSQL_HOST: str
    MYSQL_USERNAME: str
    MYSQL_PASSWORD: str
    MONGODB_URI: str
    REDIS_URL: str
    AUTH_TOKEN_EXPIRY_HOURS: int
    FS_HOST_1: str
    FS_HOST_2: str
    FS_PASSWORD_1: str
    FS_PASSWORD_2: str
    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()