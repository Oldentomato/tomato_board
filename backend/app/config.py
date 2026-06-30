from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    secret_key: str = "dev-secret-change-in-production"
    google_client_id: str = ""
    google_client_secret: str = ""
    frontend_url: str = "http://localhost:3000"
    oauth_callback_url: str = "http://localhost:3000/api/auth/google/callback"
    cors_origins: str = "http://localhost:3000,http://localhost"
    session_cookie_name: str = "tomato_session"
    database_url: str = "sqlite:///./tomato.db"
    neo4j_uri: str = ""
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    openai_api_key: str = ""
    openai_model: str = "o4-mini"
    openai_reasoning_enabled: bool = True
    openai_reasoning_effort: str = "low"
    openai_reasoning_summary: str = ""
    tavily_api_key: str = ""
    tavily_max_results: int = 5
    minio_endpoint: str = ""
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "documents"
    minio_secure: bool = False
    minio_use_local_storage: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def tavily_configured(self) -> bool:
        return bool(self.tavily_api_key.strip())

    @property
    def minio_configured(self) -> bool:
        return bool(
            self.minio_endpoint.strip()
            and self.minio_access_key.strip()
            and self.minio_secret_key.strip()
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
