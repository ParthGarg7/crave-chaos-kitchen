"""
Application Configuration Settings
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App Info
    APP_NAME: str = "Food Delivery API Failure Simulator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database - PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "food_delivery"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Database - Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # External APIs (for dependency failure simulation)
    STRIPE_API_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    
    # Failure Simulator Settings
    FAILURE_SIMULATOR_ENABLED: bool = True
    FAILURE_LOG_RETENTION_HOURS: int = 24

    # RabbitMQ — log transport to Niramay
    # Leave RABBITMQ_HOST empty to disable publishing
    RABBITMQ_HOST: str = ""
    RABBITMQ_PORT: int = 5672
    RABBITMQ_USER: str = "guest"
    RABBITMQ_PASSWORD: str = "guest"
    RABBITMQ_QUEUE: str = "component-c-logs"

    # Component A integration
    COMPONENT_A_HEAL_ENDPOINT: str = ""

    # Log shipping — leave empty to disable. When set, JSON log batches are POSTed here.
    LOG_SHIP_ENDPOINT: str = ""

    # ── K3s Cluster Settings ─────────────────────────────
    # K3s mode flag — false keeps all Docker Compose behaviour unchanged
    K3S_ENABLED: bool = False
    K3S_NAMESPACE: str = "selfhealing"
    # Niramay URL for optional recovery signal
    NIRAMAY_URL: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
