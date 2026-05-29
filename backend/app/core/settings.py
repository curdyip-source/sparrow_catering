from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SP.ARROW Catering API"
    database_url: str = "sqlite:///./sparrow.db"
    redis_url: str = "redis://localhost:6379/0"
    first_admin_pass: str = ""
    admin_token_secret: str = "sparrow-admin-token-secret"
    admin_token_ttl_hours: int = 12
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
