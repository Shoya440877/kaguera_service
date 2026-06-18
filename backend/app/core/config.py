"""Application settings loaded from environment variables / a local .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "Kaguera Layout API"
    database_url: str = "postgresql+psycopg://kaguera:kaguera@db:5432/kaguera"
    cors_origins: str = "http://localhost:3000"
    layout_id_length: int = 8

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS origins as a list (stored comma-separated in the env var)."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
