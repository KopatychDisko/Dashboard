"""
Request ID Middleware - добавляет уникальный ID к каждому запросу
"""
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware для добавления уникального Request ID к каждому запросу
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Проверяем, есть ли уже Request ID в заголовках (например, от прокси)
        request_id = request.headers.get("X-Request-ID")
        
        if not request_id:
            # Генерируем новый UUID
            request_id = str(uuid.uuid4())
        
        # Добавляем Request ID в state для доступа в других местах
        request.state.request_id = request_id
        
        # Выполняем следующий middleware/endpoint
        response = await call_next(request)
        
        # Добавляем Request ID в заголовки ответа
        response.headers["X-Request-ID"] = request_id
        
        return response


