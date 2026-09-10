from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    csharp_api_url: str = "http://localhost:5000"
    ai_api_key: str = "savebite-ai-development-key"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()