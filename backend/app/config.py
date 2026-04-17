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
    asterisk_ari_user: str = "recovia"
    asterisk_ari_password: str = ""

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h

    max_concurrent_calls: int = 5

    frontend_url: str = "https://recovia.amplify-belgium.com"

    daily_call_limit: int = 50
    monthly_call_limit: int = 500

    # DIDWW SMS
    didww_sms_username: str = ""
    didww_sms_password: str = ""
    didww_sms_source: str = ""
    didww_sms_endpoint: str = "https://eu.sms-out.didww.com/outbound_messages"

    # Email (Resend)
    resend_api_key: str = ""
    email_from: str = "Recovia <noreply@amplify-belgium.com>"

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
