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

    @property
    def sqlalchemy_url(self) -> str:
        """Database URL pinned to the psycopg (v3) driver.

        Managed Postgres providers (Render, Heroku, ...) inject a bare
        ``postgres://`` / ``postgresql://`` URL, which SQLAlchemy resolves to
        psycopg2 -- a driver we deliberately don't ship. Rewrite the scheme so
        the connection uses psycopg v3 instead. A URL that already names a
        driver (e.g. ``postgresql+psycopg://``) is returned unchanged.
        """
        url = self.database_url
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


settings = Settings()
