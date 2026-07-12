from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Eerie Expendable"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"
    cors_origins: str = (
        "http://localhost:7456,http://localhost:7457,"
        "http://127.0.0.1:7456,http://127.0.0.1:5173,http://localhost:5173"
    )
    database_url: str = "sqlite:///./data/eerie.db"
    jwt_secret: str = "dev-change-me-eerie-expendable"
    jwt_expire_minutes: int = 60 * 24 * 7
    cdn_base_url: str = "https://cdn.example.com/eerie-expendable"
    wechat_app_id: str = ""
    wechat_app_secret: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
