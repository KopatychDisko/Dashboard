import os
from pydantic_settings import BaseSettings  # ✅ Правильно для Pydantic v2
from typing import Optional, List

class Settings(BaseSettings):
    """Настройки приложения"""
    
    # Database
    SUPABASE_URL: str 
    SUPABASE_KEY: str 
    
    # Telegram
    TELEGRAM_BOT_TOKEN: str = '8470982948:AAHrDkCYnDOqcdZb8GIt-1L50zsF_9UVPLc'  # Должен быть в .env
    TELEGRAM_BOT_USERNAME: str = "DashBoardMetricksBot"
    
    # Security (если не используется JWT, можно сделать опциональным)
    SECRET_KEY: str = "change-this-in-production"  # Опционально, но лучше указать в .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    FRONTEND_URL: str = "http://127.0.0.1"
    # CORS_ORIGINS: список разрешенных origins через запятую
    # Пример: "http://127.0.0.1,http://localhost:3000,https://dshb.lemifar.ru"
    CORS_ORIGINS: str = "http://127.0.0.1,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000,https://dshb.lemifar.ru"
    
    # Request Limits
    # MAX_REQUEST_BODY_SIZE_MB: максимальный размер тела запроса в мегабайтах (по умолчанию 1 MB)
    MAX_REQUEST_BODY_SIZE_MB: int = 1  # 1 MB
    
    def get_max_request_body_size_bytes(self) -> int:
        """Возвращает максимальный размер тела запроса в байтах"""
        return self.MAX_REQUEST_BODY_SIZE_MB * 1024 * 1024
    
    # Compression
    # ENABLE_GZIP_COMPRESSION: включить сжатие ответов Gzip (по умолчанию True)
    ENABLE_GZIP_COMPRESSION: bool = True
    # GZIP_MINIMUM_SIZE: минимальный размер ответа в байтах для сжатия (по умолчанию 500 байт)
    GZIP_MINIMUM_SIZE: int = 500
    
    # Request Timeout
    # REQUEST_TIMEOUT_SECONDS: максимальное время выполнения запроса в секундах (по умолчанию 30)
    REQUEST_TIMEOUT_SECONDS: int = 30
    
    # Database Connection Pooling
    # DB_POOL_MAX_CONNECTIONS: максимальное количество соединений в пуле (по умолчанию 50)
    DB_POOL_MAX_CONNECTIONS: int = 50
    
    # Response Caching
    # ENABLE_RESPONSE_CACHE: включить in-memory кеширование ответов (по умолчанию True)
    ENABLE_RESPONSE_CACHE: bool = True
    # RESPONSE_CACHE_TTL: время жизни кеша в секундах (по умолчанию 30)
    RESPONSE_CACHE_TTL: int = 30
    
    # Rate Limiting
    # ENABLE_RATE_LIMIT: включить rate limiting (по умолчанию True)
    ENABLE_RATE_LIMIT: bool = True
    # RATE_LIMIT_PER_MINUTE: максимальное количество запросов в минуту (по умолчанию 60)
    RATE_LIMIT_PER_MINUTE: int = 60
    # RATE_LIMIT_PER_HOUR: максимальное количество запросов в час (по умолчанию 1000)
    RATE_LIMIT_PER_HOUR: int = 1000
    # RATE_LIMIT_MAX_TRACKED_IPS: максимальное количество отслеживаемых IP (по умолчанию 10000)
    RATE_LIMIT_MAX_TRACKED_IPS: int = 10000
    
    # Logging
    # LOG_LEVEL: уровень логирования (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    # Если не указан, определяется автоматически по ENVIRONMENT
    LOG_LEVEL: Optional[str] = None
    # LOG_DIR: директория для файлов логов (по умолчанию "logs")
    LOG_DIR: str = "logs"
    # LOG_FILE_MAX_BYTES: максимальный размер файла лога в байтах (по умолчанию 10 MB)
    LOG_FILE_MAX_BYTES: int = 10 * 1024 * 1024
    # LOG_FILE_BACKUP_COUNT: количество резервных копий файлов логов (по умолчанию 5)
    LOG_FILE_BACKUP_COUNT: int = 5
    
    # Environment
    ENVIRONMENT: str = "production"
    
    def get_cors_origins(self) -> List[str]:
        """Возвращает список CORS origins с добавлением FRONTEND_URL"""
        # Парсим строку с origins (разделитель - запятая)
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]
        
        # Добавляем FRONTEND_URL если его нет в списке
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.insert(0, self.FRONTEND_URL)
        
        return origins
    
    model_config = {  # ✅ Новый способ в Pydantic v2
        "env_file": ".env",
        "case_sensitive": True
    }

# Глобальный экземпляр настроек
settings = Settings()
