"""
Конфигурация логирования с поддержкой JSON формата, ротации файлов и структурированного логирования
"""
import json
import logging
import logging.handlers
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """JSON форматтер для структурированного логирования"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Форматирует запись лога в JSON"""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Добавляем контекст из extra, если есть
        if hasattr(record, 'request_id') and record.request_id:
            log_data["request_id"] = record.request_id
        if hasattr(record, 'user_id') and record.user_id:
            log_data["user_id"] = record.user_id
        if hasattr(record, 'bot_id') and record.bot_id:
            log_data["bot_id"] = record.bot_id
        if hasattr(record, 'ip_address') and record.ip_address:
            log_data["ip_address"] = record.ip_address
        if hasattr(record, 'user_agent') and record.user_agent:
            log_data["user_agent"] = record.user_agent
        
        # Добавляем все остальные поля из extra
        if hasattr(record, '__dict__'):
            for key, value in record.__dict__.items():
                if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName', 
                              'levelname', 'levelno', 'lineno', 'module', 'msecs', 'message',
                              'pathname', 'process', 'processName', 'relativeCreated', 'thread',
                              'threadName', 'exc_info', 'exc_text', 'stack_info', 'request_id',
                              'user_id', 'bot_id', 'ip_address', 'user_agent']:
                    if not key.startswith('_'):
                        log_data[key] = value
        
        # Добавляем информацию об исключении, если есть
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Добавляем stack trace для ошибок
        if record.levelno >= logging.ERROR and record.exc_info is None:
            import traceback
            log_data["stack_trace"] = traceback.format_stack()
        
        return json.dumps(log_data, ensure_ascii=False)


class StructuredLoggerAdapter(logging.LoggerAdapter):
    """Адаптер для структурированного логирования с контекстом"""
    
    def process(self, msg, kwargs):
        """Добавляет контекст к записи лога"""
        extra = kwargs.get('extra', {})
        if self.extra:
            extra.update(self.extra)
        kwargs['extra'] = extra
        return msg, kwargs


def setup_logging():
    """Настраивает логирование в зависимости от окружения"""
    # Определяем уровень логирования
    if settings.LOG_LEVEL:
        # Если указан явно, используем его
        log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    elif settings.ENVIRONMENT == "development":
        log_level = logging.DEBUG
    elif settings.ENVIRONMENT == "testing":
        log_level = logging.INFO
    else:  # production
        log_level = logging.INFO
    
    # Создаем директорию для логов, если её нет
    log_dir = Path(settings.LOG_DIR)
    log_dir.mkdir(exist_ok=True)
    
    # Получаем корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Удаляем существующие handlers
    root_logger.handlers.clear()
    
    # Определяем форматтер в зависимости от окружения
    if settings.ENVIRONMENT == "development":
        # В development используем обычный формат для читаемости
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    else:
        # В production используем JSON формат
        formatter = JSONFormatter()
    
    # Console handler (всегда выводим в консоль)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler с ротацией (только для production и testing)
    if settings.ENVIRONMENT != "development":
        # Основной файл логов с ротацией
        file_handler = logging.handlers.RotatingFileHandler(
            filename=log_dir / "app.log",
            maxBytes=settings.LOG_FILE_MAX_BYTES,
            backupCount=settings.LOG_FILE_BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
        
        # Отдельный файл для ошибок
        error_handler = logging.handlers.RotatingFileHandler(
            filename=log_dir / "errors.log",
            maxBytes=settings.LOG_FILE_MAX_BYTES,
            backupCount=settings.LOG_FILE_BACKUP_COUNT * 2,  # Храним больше резервных копий для ошибок
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        root_logger.addHandler(error_handler)
    
    # Настраиваем уровни для сторонних библиотек
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # Логируем информацию о конфигурации
    logger = logging.getLogger(__name__)
    logger.info(
        f"Логирование настроено: уровень={logging.getLevelName(log_level)}, "
        f"окружение={settings.ENVIRONMENT}, "
        f"формат={'JSON' if settings.ENVIRONMENT != 'development' else 'TEXT'}"
    )


def get_logger(name: str, **context) -> StructuredLoggerAdapter:
    """
    Получает логгер с контекстом
    
    Args:
        name: Имя логгера (обычно __name__)
        **context: Дополнительный контекст (request_id, user_id, bot_id и т.д.)
    
    Returns:
        StructuredLoggerAdapter: Логгер с контекстом
    """
    logger = logging.getLogger(name)
    return StructuredLoggerAdapter(logger, context)

