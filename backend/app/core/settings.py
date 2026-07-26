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
    frontend_port: int = 5173
    # Пусто = разрешаем localhost на FRONTEND_PORT. Явный список из env переопределяет.
    cors_origins: list[str] = []

    @property
    def allowed_origins(self) -> list[str]:
        if self.cors_origins:
            return self.cors_origins
        return [
            f"http://localhost:{self.frontend_port}",
            f"http://127.0.0.1:{self.frontend_port}",
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
