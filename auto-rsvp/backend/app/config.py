from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/auto_rsvp"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    ANTHROPIC_API_KEY: str = ""
    EVENTBRITE_API_KEY: str = ""
    LUMA_API_KEY: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
