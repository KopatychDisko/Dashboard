"""
Security Headers Middleware - добавляет защитные HTTP заголовки
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware для добавления security headers ко всем ответам
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Добавляем заголовки только если их еще нет (избегаем дублирования с nginx)
        # Защита от MIME type sniffing
        if "X-Content-Type-Options" not in response.headers:
            response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Защита от clickjacking (запрет встраивания в iframe)
        if "X-Frame-Options" not in response.headers:
            response.headers["X-Frame-Options"] = "DENY"
        
        # XSS защита (для старых браузеров)
        if "X-XSS-Protection" not in response.headers:
            response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Контроль referrer информации
        if "Referrer-Policy" not in response.headers:
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy (базовая, можно расширить)
        # if "Content-Security-Policy" not in response.headers:
        #     response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response

