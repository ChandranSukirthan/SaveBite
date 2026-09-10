from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    csharp_api_url: str = "http://localhost:5000"

    ai_service_key: str = "savebite-internal-ai-development-key"
    ai_api_key: str = "savebite-internal-ai-development-key"

    gemini_api_key: str = ""

    gemini_model: str = "gemini-3.8-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()