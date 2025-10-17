import os
from pydantic_settings import BaseSettings  # ✅ Правильно для Pydantic v2
from typing import Optional

class Settings(BaseSettings):
    """Настройки приложения"""
    
    # Database
    SUPABASE_URL: str 
    SUPABASE_KEY: str 
    
    # Telegram
    TELEGRAM_BOT_TOKEN: str = "8470982948:AAHrDkCYnDOqcdZb8GIt-1L50zsF_9UVPLc"
    TELEGRAM_BOT_USERNAME: str = "DashBoardMetricksBot"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    FRONTEND_URL: str = "http://127.0.0.1"
    
    # Environment
    ENVIRONMENT: str = "production"
    
    model_config = {  # ✅ Новый способ в Pydantic v2
        "env_file": ".env",
        "case_sensitive": True
    }

# Глобальный экземпляр настроек
settings = Settings()
