"""
Middleware для ограничения размера тела запроса
"""
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import status

from app.core.config import settings

logger = logging.getLogger(__name__)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware для ограничения размера тела запроса.
    Проверяет Content-Length заголовок и отклоняет запросы, превышающие лимит.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Проверяем Content-Length заголовок
        content_length = request.headers.get("Content-Length")
        
        if content_length:
            try:
                body_size = int(content_length)
                max_size_bytes = settings.get_max_request_body_size_bytes()
                max_size_mb = settings.MAX_REQUEST_BODY_SIZE_MB
                
                if body_size > max_size_bytes:
                    request_id = getattr(request.state, "request_id", "unknown")
                    logger.warning(
                        f"[{request_id}] Request body size {body_size} bytes ({body_size / 1024 / 1024:.2f} MB) exceeds limit {max_size_bytes} bytes ({max_size_mb} MB) | "
                        f"Path: {request.url.path} | Method: {request.method}"
                    )
                    
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "success": False,
                            "error": {
                                "message": f"Размер тела запроса ({body_size / 1024 / 1024:.2f} MB) превышает максимально допустимый ({max_size_mb} MB)",
                                "status_code": status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                "request_id": request_id
                            }
                        }
                    )
            except (ValueError, TypeError):
                # Если Content-Length не является числом, пропускаем проверку
                # (может быть некорректный заголовок, но это не наша проблема)
                pass
        
        # Продолжаем обработку запроса
        response = await call_next(request)
        return response

