from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = "erp-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DEFAULT_CLIENT_ID: str = "Prahitha Edu"
    CORS_ORIGINS: str = "*"
    DATABASE_URL: str | None = None
    SYMMETRIC_KEY: str = "xJSJGB6vtXCjeljCNQ5hD0GeQXDMRtQ/ZjMFifrYBb8="

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"

settings = Settings()
