"""
Application configuration loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Smart EV Charging Network"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://evcharge:evcharge@db:5432/evcharge"

    # Auth
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_super_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:80"]

    # ML
    ML_MODELS_DIR: str = "app/ml/saved_models"

    # Open Charge Map
    OPENCHARGE_MAP_API_KEY: str = "6d277e59-9903-401e-b8ae-0e326e102759"

    # Rate limiting
    RATE_LIMIT: str = "100/minute"

    class Config:
        env_file = ".env"


settings = Settings()
