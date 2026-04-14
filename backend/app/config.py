import logging

from pydantic_settings import BaseSettings
from functools import lru_cache

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    openai_api_key: str

    caller_id: str = ""

    asterisk_ari_url: str = "http://localhost:8088/ari"
    asterisk_ari_user: str = "outcallsai"
    asterisk_ari_password: str = ""

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h

    max_concurrent_calls: int = 5

    frontend_url: str = "http://localhost:3000"

    daily_call_limit: int = 50
    monthly_call_limit: int = 500

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.jwt_secret == "change-me":
        raise RuntimeError(
            "FATAL: JWT_SECRET is still 'change-me'. "
            "Set a strong random secret in .env before running in production."
        )
    return settings
