"""
Централизованная обработка исключений
"""
import logging
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging_config import get_logger

logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Обработчик для HTTPException (400, 401, 403, 404, и т.д.)
    """
    # Получаем Request ID из state
    request_id = getattr(request.state, "request_id", None)
    user_id = request.cookies.get('telegram_id')
    
    # Создаем структурированный логгер
    structured_logger = get_logger(
        __name__,
        request_id=request_id,
        user_id=user_id
    )
    
    # Формируем стандартизированный ответ
    error_response = {
        "success": False,
        "error": {
            "message": exc.detail,
            "status_code": exc.status_code,
            "request_id": request_id
        }
    }
    
    # Логируем ошибку
    structured_logger.warning(
        f"HTTP {exc.status_code}: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "error_message": exc.detail,
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "user_id": user_id
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Обработчик для Starlette HTTPException (используется FastAPI для некоторых ошибок)
    """
    request_id = getattr(request.state, "request_id", None)
    user_id = request.cookies.get('telegram_id')
    
    structured_logger = get_logger(
        __name__,
        request_id=request_id,
        user_id=user_id
    )
    
    error_response = {
        "success": False,
        "error": {
            "message": exc.detail,
            "status_code": exc.status_code,
            "request_id": request_id
        }
    }
    
    structured_logger.warning(
        f"HTTP {exc.status_code}: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "error_message": exc.detail,
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "user_id": user_id
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Обработчик для ошибок валидации Pydantic
    """
    request_id = getattr(request.state, "request_id", None)
    user_id = request.cookies.get('telegram_id')
    
    structured_logger = get_logger(
        __name__,
        request_id=request_id,
        user_id=user_id
    )
    
    # Форматируем ошибки валидации
    errors = exc.errors()
    error_messages = []
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        error_messages.append(f"{field}: {message}")
    
    error_detail = "; ".join(error_messages)
    
    error_response = {
        "success": False,
        "error": {
            "message": "Ошибка валидации данных",
            "detail": error_detail,
            "errors": errors,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "request_id": request_id
        }
    }
    
    structured_logger.warning(
        f"Validation Error: {error_detail}",
        extra={
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "error_detail": error_detail,
            "errors": errors,
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "user_id": user_id
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Глобальный обработчик для всех необработанных исключений (500 ошибки)
    """
    request_id = getattr(request.state, "request_id", None)
    user_id = request.cookies.get('telegram_id')
    
    structured_logger = get_logger(
        __name__,
        request_id=request_id,
        user_id=user_id
    )
    
    # Формируем ответ (скрываем детали в production)
    from app.core.config import settings
    
    error_message = "Внутренняя ошибка сервера"
    error_detail = None
    
    # В development режиме показываем больше информации
    if settings.ENVIRONMENT == "development":
        error_detail = f"{type(exc).__name__}: {str(exc)}"
    
    # Логируем полную информацию об ошибке
    structured_logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        extra={
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "user_id": user_id
        },
        exc_info=True
    )
    
    error_response = {
        "success": False,
        "error": {
            "message": error_message,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "request_id": request_id
        }
    }
    
    if error_detail:
        error_response["error"]["detail"] = error_detail
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response
    )


