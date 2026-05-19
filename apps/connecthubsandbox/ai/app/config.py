from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str = "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"
    GEMINI_API_KEY: str = "AIzaSyAKTBeXGWi2Or9rZ7P_HAx0TAhhY0_eb8U"
    DATABASE_URL: str = "mysql+asyncmy://admin:%23Pulse%23%242024@pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com:3306/onedb"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
