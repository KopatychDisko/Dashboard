"""
Request Logging Middleware - логирование всех HTTP запросов
"""
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging_config import get_logger

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware для логирования всех HTTP запросов с временем выполнения
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Получаем Request ID из state (если был добавлен предыдущим middleware)
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Получаем информацию о запросе
        method = request.method
        path = request.url.path
        query_params = str(request.query_params) if request.query_params else ""
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Получаем user_id из cookies, если есть
        user_id = request.cookies.get('telegram_id')
        
        # Создаем структурированный логгер с контекстом
        structured_logger = get_logger(
            __name__,
            request_id=request_id,
            ip_address=client_ip,
            user_agent=user_agent[:100] if len(user_agent) > 100 else user_agent,
            user_id=user_id
        )
        
        # Логируем начало запроса
        structured_logger.info(
            f"{method} {path}" + (f"?{query_params}" if query_params else ""),
            extra={
                "method": method,
                "path": path,
                "query_params": query_params,
                "request_id": request_id,
                "ip_address": client_ip,
                "user_agent": user_agent,
                "user_id": user_id
            }
        )
        
        # Засекаем время начала обработки
        start_time = time.time()
        
        try:
            # Выполняем следующий middleware/endpoint
            response = await call_next(request)
            
            # Вычисляем время выполнения
            process_time = time.time() - start_time
            
            # Получаем статус код
            status_code = response.status_code
            
            # Логируем результат
            structured_logger.info(
                f"{method} {path} - Status: {status_code}",
                extra={
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "process_time": round(process_time, 3),
                    "request_id": request_id,
                    "ip_address": client_ip,
                    "user_id": user_id
                }
            )
            
            # Добавляем время обработки в заголовок ответа
            response.headers["X-Process-Time"] = f"{process_time:.3f}"
            
            return response
            
        except Exception as e:
            # Вычисляем время до ошибки
            process_time = time.time() - start_time
            
            # Логируем ошибку
            structured_logger.error(
                f"{method} {path} - Error: {str(e)}",
                extra={
                    "method": method,
                    "path": path,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "process_time": round(process_time, 3),
                    "request_id": request_id,
                    "ip_address": client_ip,
                    "user_id": user_id
                },
                exc_info=True
            )
            
            # Пробрасываем исключение дальше
            raise


