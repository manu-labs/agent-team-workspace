from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    DB_PATH: str = "/data/arb_scanner.db"
    POLL_INTERVAL_SECONDS: int = 60
    MATCH_INTERVAL_SECONDS: int = 300
    CORS_ORIGINS: str = '["*"]'

    model_config = {"env_file": ".env"}


settings = Settings()