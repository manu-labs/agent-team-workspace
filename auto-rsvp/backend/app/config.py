from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/auto_rsvp"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    GROQ_API_KEY: str = ""
    EVENTBRITE_API_KEY: str = ""
    LUMA_API_KEY: str = ""

    # Job runner settings
    JOB_INTERVAL_HOURS: int = 6
    RSVP_DELAY_SECONDS: float = 5.0
    RSVP_MAX_RETRIES: int = 3

    model_config = {"env_file": ".env"}


settings = Settings()
