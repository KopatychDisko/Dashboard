"""
Cache Headers Middleware - добавляет HTTP Cache-Control заголовки для API ответов
"""
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class CacheHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware для добавления Cache-Control заголовков к ответам API
    Позволяет браузеру кешировать ответы на определенное время
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Добавляем Cache-Control только для успешных GET запросов к API
        if request.method == "GET" and response.status_code == 200:
            path = request.url.path
            
            # Для аналитики - короткий кеш (30 секунд)
            if path.startswith("/api/analytics/"):
                response.headers["Cache-Control"] = "public, max-age=30, must-revalidate"
                response.headers["Vary"] = "Accept-Encoding"
                logger.debug(f"Added Cache-Control for analytics: {path}")
            
            # Для информации о боте - длинный кеш (1 час)
            elif path.startswith("/api/bots/") and path.endswith("/info"):
                response.headers["Cache-Control"] = "public, max-age=3600, must-revalidate"
                response.headers["Vary"] = "Accept-Encoding"
                logger.debug(f"Added Cache-Control for bot info: {path}")
            
            # Для списка ботов и других endpoints ботов - средний кеш (5 минут)
            elif path.startswith("/api/bots/"):
                response.headers["Cache-Control"] = "public, max-age=300, must-revalidate"
                response.headers["Vary"] = "Accept-Encoding"
                logger.debug(f"Added Cache-Control for bots: {path}")
        
        return response

