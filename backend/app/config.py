from pydantic_settings import BaseSettings
from functools import lru_cache


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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
