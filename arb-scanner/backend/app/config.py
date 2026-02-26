from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    KALSHI_API_KEY_ID: str = ""   # Key ID (UUID) for RSA-PSS auth
    KALSHI_API_KEY: str = ""      # RSA private key (PEM format)
    # Railway: set DB_PATH=/data/arb_scanner.db and attach a volume at /data
    DB_PATH: str = "/data/arb_scanner.db"
    DISCOVERY_INTERVAL_SECONDS: int = 3600
    PRICE_REFRESH_INTERVAL_SECONDS: int = 15
    MATCH_EXPIRY_DAYS: int = 7
    MIN_MATCH_VOLUME: int = 20000
    # Sports markets have far lower volume than general markets (Kalshi NBA games
    # range from $69-$18K vs $20K+ for other markets). Use a separate floor so
    # sports markets aren't filtered out before deterministic slug matching.
    MIN_SPORTS_VOLUME: int = 0
    CORS_ORIGINS: str = '["*"]'
    WS_RECONNECT_MAX_SECONDS: int = 60
    # Cleanup settings — used by the discovery cycle's Step 1.7
    # Buffer after a match's end_date before it is pruned (hours).
    # Provides a 2h window after game resolution to capture final prices.
    EXPIRED_MATCH_BUFFER_HOURS: int = 2
    # How many days of price history to retain per match.
    # Older rows are pruned each cycle to bound Railway volume usage.
    PRICE_HISTORY_RETENTION_DAYS: int = 7

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
