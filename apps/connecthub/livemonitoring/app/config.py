from pydantic_settings import BaseSettings
from datetime import timedelta

class Settings(BaseSettings):
    # Kafka
    KAFKA_HOST: str
    KAFKA_PORT: str
    KAFKA_TOPIC: str = "livemonitoring"
    KAFKA_GROUP_ID: str = "esllivemonitoring"
    
    # MySQL
    MYSQL_HOST: str
    MYSQL_USERNAME: str
    MYSQL_PASSWORD: str
    MYSQL_DATABASE: str = "onedb"
    MYSQL_POOL_SIZE: int = 5
    
    # Socket.IO
    SOCKET_URL: str = "https://connecthub.pulsework360.com"
    SOCKET_NAMESPACE: str = "/socketadmin/monitoring"
    SOCKET_PATH: str = "/socketadmin"
    
    # Authentication
    SOCKET_LOGIN_URL: str = "https://connecthub.pulsework360.com/auth/login"
    SOCKET_ACCOUNT_CODE: str = "PUTPL"
    SOCKET_MEMBER_NAME: str = "ssadmin"
    SOCKET_MEMBER_PASSWORD: str = "Pulse@123"
    
    REDIS_HOST: str = "testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    REDIS_POOL_SIZE: int = 10
    REDIS_DEDUP_TTL_SECONDS: int = 3600
    
    # Kafka Tunables
    KAFKA_MAX_POLL_RECORDS: int = 100
    KAFKA_AUTO_OFFSET_RESET: str = "latest"
    KAFKA_SESSION_TIMEOUT_MS: int = 30000
    KAFKA_HEARTBEAT_INTERVAL_MS: int = 10000
    KAFKA_MAX_POLL_INTERVAL_MS: int = 300000
    
    # Processing & Retry
    BATCH_SIZE: int = 50
    BATCH_TIMEOUT_SECONDS: float = 5.0
    MAX_RETRIES: int = 5
    RETRY_BACKOFF_SECONDS: int = 5

    # Application
    AUTH_TOKEN_EXPIRY_HOURS: int = 12
    HEALTH_CHECK_PORT: int = 8080
    STATS_REPORT_INTERVAL: int = 300

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def AUTH_TOKEN_EXPIRY(self) -> timedelta:
        return timedelta(hours=self.AUTH_TOKEN_EXPIRY_HOURS)

settings = Settings()