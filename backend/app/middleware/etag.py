"""
ETag Middleware - добавляет поддержку ETag для условных запросов
"""
import hashlib
import json
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger(__name__)


class ETagMiddleware(BaseHTTPMiddleware):
    """
    Middleware для добавления ETag заголовков к ответам API
    Позволяет браузеру использовать условные запросы (304 Not Modified)
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Генерируем ETag только для успешных GET запросов к API
        if request.method == "GET" and response.status_code == 200:
            # Пропускаем статические файлы и health check
            if request.url.path.startswith("/api/") and not request.url.path.endswith("/health"):
                try:
                    # Для JSONResponse FastAPI - используем встроенный body
                    if isinstance(response, JSONResponse):
                        body = response.body
                        # Генерируем ETag из содержимого ответа
                        etag = hashlib.md5(body).hexdigest()
                        etag_header = f'"{etag}"'
                        
                        # Проверяем If-None-Match заголовок от клиента
                        if_none_match = request.headers.get("If-None-Match")
                        if if_none_match and if_none_match.strip('"') == etag:
                            # Данные не изменились, возвращаем 304
                            logger.debug(f"ETag match for {request.url.path}, returning 304")
                            return Response(
                                status_code=304,
                                headers={
                                    "ETag": etag_header,
                                    "Cache-Control": response.headers.get("Cache-Control", ""),
                                }
                            )
                        
                        # Добавляем ETag в заголовки
                        response.headers["ETag"] = etag_header
                    else:
                        # Для других типов ответов - упрощенная версия без чтения body
                        # Генерируем ETag на основе пути и времени (упрощенная версия)
                        etag_content = f"{request.url.path}:{response.status_code}"
                        etag = hashlib.md5(etag_content.encode()).hexdigest()
                        etag_header = f'"{etag}"'
                        response.headers["ETag"] = etag_header
                    
                except Exception as e:
                    logger.warning(f"Error generating ETag for {request.url.path}: {e}", exc_info=True)
                    # В случае ошибки возвращаем оригинальный ответ
        
        return response

