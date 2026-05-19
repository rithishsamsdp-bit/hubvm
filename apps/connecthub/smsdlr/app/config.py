from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    KAFKA_HOST: str
    KAFKA_PORT: str
    MYSQL_HOST: str
    MYSQL_USERNAME: str
    MYSQL_PASSWORD: str
    AUTH_TOKEN_EXPIRY_HOURS: int
    MAIL_PASSWORD: str
    MAIL_USER_NAME: str
    MAIL_SMTP_SERVER: str
    MAIL_PORT: int = 587
    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()