"""
Middleware для установки таймаута на запросы
"""
import asyncio
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import status

from app.core.config import settings

logger = logging.getLogger(__name__)


class RequestTimeoutMiddleware(BaseHTTPMiddleware):
    """
    Middleware для установки таймаута на выполнение запросов.
    Прерывает запросы, которые выполняются дольше установленного времени.
    """
    
    async def dispatch(self, request: Request, call_next):
        request_id = getattr(request.state, "request_id", "unknown")
        timeout_seconds = settings.REQUEST_TIMEOUT_SECONDS
        
        try:
            # Устанавливаем таймаут на выполнение запроса
            response = await asyncio.wait_for(
                call_next(request),
                timeout=timeout_seconds
            )
            return response
            
        except asyncio.TimeoutError:
            # Запрос превысил таймаут
            logger.error(
                f"[{request_id}] Request timeout after {timeout_seconds}s | "
                f"Path: {request.url.path} | Method: {request.method}"
            )
            
            return JSONResponse(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                content={
                    "success": False,
                    "error": {
                        "message": f"Запрос превысил максимальное время выполнения ({timeout_seconds} секунд)",
                        "status_code": status.HTTP_504_GATEWAY_TIMEOUT,
                        "request_id": request_id
                    }
                }
            )
        
        except Exception as e:
            # Пробрасываем другие исключения дальше
            raise

