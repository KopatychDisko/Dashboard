"""
Rate Limiting Middleware - оптимизированная версия с минимальным потреблением памяти
"""
import time
import logging
from collections import OrderedDict
from typing import Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import status

from app.core.config import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware для ограничения количества запросов от одного IP
    Использует Fixed Window алгоритм для минимального потребления памяти
    """
    
    def __init__(self, app, requests_per_minute: int = None, requests_per_hour: int = None, max_tracked_ips: int = None):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute or settings.RATE_LIMIT_PER_MINUTE
        self.requests_per_hour = requests_per_hour or settings.RATE_LIMIT_PER_HOUR
        self.max_tracked_ips = max_tracked_ips or settings.RATE_LIMIT_MAX_TRACKED_IPS
        
        # Хранилище: IP -> (minute_count, minute_window, hour_count, hour_window)
        # Используем OrderedDict для LRU cache
        self._rate_limits: OrderedDict[str, Tuple[int, int, int, int]] = OrderedDict()
        
        # Время последней очистки
        self._last_cleanup = time.time()
        self._cleanup_interval = 60  # Очистка каждую минуту
        
        logger.info(
            f"Rate limiting enabled: {self.requests_per_minute} req/min, "
            f"{self.requests_per_hour} req/hour, max {self.max_tracked_ips} tracked IPs"
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Получает IP адрес клиента с учетом прокси"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _cleanup_old_ips(self):
        """Очищает неактивные IP для экономии памяти"""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        self._last_cleanup = current_time
        current_minute = int(current_time // 60)
        current_hour = int(current_time // 3600)
        
        # Удаляем IP с истекшими окнами
        ips_to_remove = []
        for ip, (min_count, min_window, hour_count, hour_window) in self._rate_limits.items():
            # Если окна истекли, удаляем IP
            if min_window < current_minute - 1 and hour_window < current_hour - 1:
                ips_to_remove.append(ip)
        
        for ip in ips_to_remove:
            del self._rate_limits[ip]
        
        # Если превышен лимит отслеживаемых IP, удаляем самые старые (LRU)
        while len(self._rate_limits) > self.max_tracked_ips:
            self._rate_limits.popitem(last=False)  # Удаляем первый (самый старый)
        
        logger.debug(f"Rate limit cleanup: {len(self._rate_limits)} tracked IPs")
    
    def _check_rate_limit(self, ip: str) -> Tuple[bool, str, int]:
        """
        Проверяет лимит запросов для IP (Fixed Window)
        
        Returns:
            (allowed, message, retry_after)
        """
        current_time = time.time()
        current_minute = int(current_time // 60)
        current_hour = int(current_time // 3600)
        
        # Получаем или создаем запись для IP
        if ip in self._rate_limits:
            # Перемещаем в конец (LRU)
            data = self._rate_limits.pop(ip)
            self._rate_limits[ip] = data
            min_count, min_window, hour_count, hour_window = data
        else:
            min_count, min_window, hour_count, hour_window = 0, current_minute, 0, current_hour
        
        # Проверяем и сбрасываем окна если истекли
        if min_window < current_minute:
            min_count = 0
            min_window = current_minute
        
        if hour_window < current_hour:
            hour_count = 0
            hour_window = current_hour
        
        # Проверяем лимит за час
        if hour_count >= self.requests_per_hour:
            retry_after = 3600 - (int(current_time) % 3600)
            return False, "Превышен лимит запросов за час", retry_after
        
        # Проверяем лимит за минуту
        if min_count >= self.requests_per_minute:
            retry_after = 60 - (int(current_time) % 60)
            return False, "Превышен лимит запросов за минуту", retry_after
        
        # Увеличиваем счетчики
        min_count += 1
        hour_count += 1
        
        # Обновляем запись
        self._rate_limits[ip] = (min_count, min_window, hour_count, hour_window)
        
        return True, "", 0
    
    async def dispatch(self, request: Request, call_next):
        # Пропускаем health check и статические файлы
        if request.url.path in ["/health", "/"] or request.url.path.startswith("/static"):
            return await call_next(request)
        
        # Получаем IP клиента
        client_ip = self._get_client_ip(request)
        
        # Периодическая очистка
        self._cleanup_old_ips()
        
        # Проверяем rate limit
        allowed, message, retry_after = self._check_rate_limit(client_ip)
        
        if not allowed:
            request_id = getattr(request.state, "request_id", "unknown")
            logger.warning(
                f"[{request_id}] Rate limit exceeded for IP {client_ip} | "
                f"Path: {request.url.path} | Method: {request.method}"
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error": {
                        "message": message,
                        "status_code": status.HTTP_429_TOO_MANY_REQUESTS,
                        "retry_after": retry_after,
                        "request_id": request_id
                    }
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0"
                }
            )
        
        # Выполняем запрос
        response = await call_next(request)
        
        # Добавляем заголовки rate limit
        if client_ip in self._rate_limits:
            min_count, _, _, _ = self._rate_limits[client_ip]
            remaining = max(0, self.requests_per_minute - min_count)
        else:
            remaining = self.requests_per_minute
        
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + 60))
        
        return response

