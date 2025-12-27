import os
import uvicorn
import signal
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
from datetime import datetime, timezone

from .api import auth, analytics, bots
from .core.config import settings
from .core.exceptions import (
    http_exception_handler,
    starlette_http_exception_handler,
    validation_exception_handler,
    global_exception_handler
)
from .middleware.security_headers import SecurityHeadersMiddleware
from .middleware.request_id import RequestIDMiddleware
from .middleware.request_logging import RequestLoggingMiddleware
from .middleware.request_size_limit import RequestSizeLimitMiddleware
from .middleware.request_timeout import RequestTimeoutMiddleware
from .middleware.etag import ETagMiddleware
from .middleware.cache_headers import CacheHeadersMiddleware
from .database.supabase_client import get_supabase_client, clear_connection_pool
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Загрузка переменных окружения
load_dotenv()

# Настройка логирования (должна быть после load_dotenv, чтобы загрузить настройки)
from .core.logging_config import setup_logging
setup_logging()

# Настройка логирования
logger = logging.getLogger(__name__)

# Создание приложения FastAPI
app = FastAPI(
    title="Telegram Bot Dashboard API",
    description="API для дашборда управления телеграм ботами",
    version="1.0.0"
)

# Настройка CORS (origins берутся из конфигурации)
cors_origins = settings.get_cors_origins()
logger.info(f"CORS origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip Compression Middleware (сжимает ответы для экономии трафика)
if settings.ENABLE_GZIP_COMPRESSION:
    app.add_middleware(
        GZipMiddleware,
        minimum_size=settings.GZIP_MINIMUM_SIZE
    )
    logger.info(f"Gzip compression enabled (minimum size: {settings.GZIP_MINIMUM_SIZE} bytes)")

# Cache Headers Middleware (добавляет Cache-Control заголовки)
app.add_middleware(CacheHeadersMiddleware)

# ETag Middleware (для условных запросов - временно отключен для диагностики)
# app.add_middleware(ETagMiddleware)

# Security Headers Middleware (последний добавленный = первый в стеке)
app.add_middleware(SecurityHeadersMiddleware)

# Request Timeout Middleware (устанавливает таймаут на выполнение запросов)
app.add_middleware(RequestTimeoutMiddleware)
logger.info(f"Request timeout: {settings.REQUEST_TIMEOUT_SECONDS} seconds")

# Request Size Limit Middleware (проверяет размер тела запроса)
app.add_middleware(RequestSizeLimitMiddleware)

# Request Logging Middleware (использует Request ID)
app.add_middleware(RequestLoggingMiddleware)

# Request ID Middleware (должен быть добавлен последним, чтобы выполниться первым)
app.add_middleware(RequestIDMiddleware)

# Регистрация обработчиков исключений (должны быть до подключения роутеров)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Подключение роутеров
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(bots.router, prefix="/api/bots", tags=["Bots"])

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "Telegram Bot Dashboard API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """
    Проверка здоровья сервиса с проверкой подключения к БД
    """
    try:
        # Проверяем подключение к базе данных
        db_client = get_supabase_client()
        await db_client.initialize()
        
        # Простой запрос для проверки работоспособности БД
        await db_client.client.table('sales_users').select('telegram_id').limit(1).execute()
        
        # Получаем статистику пула соединений
        from .database.supabase_client import get_connection_pool_stats
        pool_stats = get_connection_pool_stats()
        
        health_data = {
            "status": "healthy",
            "database": "connected",
            "connection_pool": pool_stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Добавляем статистику кеша, если включен
        if settings.ENABLE_RESPONSE_CACHE:
            from .core.cache import get_cache_stats
            health_data["cache"] = get_cache_stats()
        
        return health_data
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Обработка graceful shutdown
def shutdown_handler(signum, frame):
    """Обработчик сигналов завершения"""
    logger.info(f"Получен сигнал {signum}, начинаем graceful shutdown...")
    # FastAPI/uvicorn автоматически обработают graceful shutdown

# Регистрируем обработчики сигналов (uvicorn сам обрабатывает SIGTERM/SIGINT)
# Это нужно только если нужно дополнительное логирование
if os.name != 'nt':  # На Windows сигналы работают по-другому
    signal.signal(signal.SIGTERM, shutdown_handler)
    signal.signal(signal.SIGINT, shutdown_handler)

@app.on_event("shutdown")
async def shutdown_event_handler():
    """Выполняется при завершении приложения"""
    logger.info("Приложение завершает работу...")
    # Очищаем пул соединений с БД
    try:
        await clear_connection_pool()
        logger.info("Пул соединений Supabase очищен")
    except Exception as e:
        logger.error(f"Ошибка при очистке пула соединений: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        reload=True,
        log_level="info"
    )