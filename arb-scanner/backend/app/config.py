from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    # Railway: set DB_PATH=/data/arb_scanner.db and attach a volume at /data
    DB_PATH: str = "/data/arb_scanner.db"
    POLL_INTERVAL_SECONDS: int = 60
    MATCH_INTERVAL_SECONDS: int = 300
    DISCOVERY_INTERVAL_SECONDS: int = 3600
    PRICE_REFRESH_INTERVAL_SECONDS: int = 15
    MATCH_EXPIRY_DAYS: int = 7
    MIN_MATCH_VOLUME: int = 20000
    CORS_ORIGINS: str = '["*"]'

    model_config = {"env_file": ".env"}


settings = Settings()
