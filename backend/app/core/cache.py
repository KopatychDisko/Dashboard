"""
In-memory кеширование ответов API для ускорения работы
"""
import time
import hashlib
import json
import logging
from typing import Any, Dict, Optional
from functools import wraps

logger = logging.getLogger(__name__)


class ResponseCache:
    """In-memory кеш для ответов API"""
    
    def __init__(self, default_ttl: int = 30):
        """
        Инициализация кеша
        
        Args:
            default_ttl: Время жизни кеша в секундах (по умолчанию 30)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
        self._hits = 0
        self._misses = 0
    
    def _generate_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """Генерирует ключ кеша из endpoint и параметров"""
        # Сортируем параметры для консистентности
        sorted_params = json.dumps(params, sort_keys=True, default=str)
        key_string = f"{endpoint}:{sorted_params}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, endpoint: str, params: Dict[str, Any]) -> Optional[Any]:
        """
        Получает значение из кеша
        
        Args:
            endpoint: Путь endpoint
            params: Параметры запроса
            
        Returns:
            Закешированное значение или None
        """
        key = self._generate_key(endpoint, params)
        
        if key in self._cache:
            cached_item = self._cache[key]
            current_time = time.time()
            
            # Проверяем, не истек ли TTL
            if current_time < cached_item['expires_at']:
                self._hits += 1
                logger.debug(f"Cache HIT: {endpoint}")
                return cached_item['value']
            else:
                # Удаляем истекший кеш
                del self._cache[key]
                logger.debug(f"Cache EXPIRED: {endpoint}")
        
        self._misses += 1
        logger.debug(f"Cache MISS: {endpoint}")
        return None
    
    def set(self, endpoint: str, params: Dict[str, Any], value: Any, ttl: Optional[int] = None) -> None:
        """
        Сохраняет значение в кеш
        
        Args:
            endpoint: Путь endpoint
            params: Параметры запроса
            value: Значение для кеширования
            ttl: Время жизни в секундах (если None, используется default_ttl)
        """
        key = self._generate_key(endpoint, params)
        ttl = ttl or self.default_ttl
        
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
            'created_at': time.time()
        }
        
        logger.debug(f"Cache SET: {endpoint} (TTL: {ttl}s)")
    
    def clear(self, endpoint: Optional[str] = None) -> None:
        """
        Очищает кеш
        
        Args:
            endpoint: Если указан, очищает только кеш для этого endpoint
        """
        if endpoint:
            # Удаляем все ключи, содержащие endpoint
            keys_to_delete = [k for k in self._cache.keys() if endpoint in str(self._cache[k].get('endpoint', ''))]
            for key in keys_to_delete:
                del self._cache[key]
            logger.info(f"Cache cleared for endpoint: {endpoint}")
        else:
            self._cache.clear()
            logger.info("Cache cleared completely")
    
    def get_stats(self) -> Dict[str, Any]:
        """Возвращает статистику кеша"""
        total_requests = self._hits + self._misses
        hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': round(hit_rate, 2),
            'size': len(self._cache),
            'default_ttl': self.default_ttl
        }


# Глобальный экземпляр кеша
_response_cache = ResponseCache(default_ttl=30)


def cached(ttl: Optional[int] = None, key_params: Optional[list] = None):
    """
    Декоратор для кеширования ответов endpoint
    
    Args:
        ttl: Время жизни кеша в секундах (если None, используется default_ttl)
        key_params: Список параметров для генерации ключа кеша (если None, используются все)
    
    Usage:
        @cached(ttl=60)
        async def get_analytics(bot_id: str, days: int = 7):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Формируем endpoint из имени функции
            endpoint = f"{func.__module__}.{func.__name__}"
            
            # Формируем параметры для ключа кеша
            if key_params:
                cache_params = {k: v for k, v in kwargs.items() if k in key_params}
            else:
                cache_params = kwargs.copy()
                # Добавляем позиционные аргументы, если они есть
                if args:
                    # Пропускаем первый аргумент (обычно это request)
                    for i, arg in enumerate(args[1:], 1):
                        cache_params[f'arg_{i}'] = arg
            
            # Пытаемся получить из кеша
            cached_value = _response_cache.get(endpoint, cache_params)
            if cached_value is not None:
                return cached_value
            
            # Выполняем функцию
            result = await func(*args, **kwargs)
            
            # Кешируем результат
            _response_cache.set(endpoint, cache_params, result, ttl)
            
            return result
        
        return wrapper
    return decorator


def get_cache_stats() -> Dict[str, Any]:
    """Возвращает статистику кеша"""
    return _response_cache.get_stats()


def clear_cache(endpoint: Optional[str] = None) -> None:
    """Очищает кеш"""
    _response_cache.clear(endpoint)






