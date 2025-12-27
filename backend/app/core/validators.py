"""
Валидаторы для входных параметров
"""
import re
import logging
from fastapi import HTTPException
from typing import Optional

logger = logging.getLogger(__name__)

# Паттерн для валидации bot_id: только буквы, цифры, дефисы и подчеркивания
# Минимальная длина 1, максимальная 100 символов
BOT_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,100}$')

def validate_bot_id(bot_id: str) -> str:
    """
    Валидирует и санитизирует bot_id
    
    Args:
        bot_id: ID бота для валидации
    
    Returns:
        str: Валидный bot_id
    
    Raises:
        HTTPException: 400 если bot_id невалиден
    """
    if not bot_id:
        logger.warning("Попытка использования пустого bot_id")
        raise HTTPException(
            status_code=400,
            detail="bot_id не может быть пустым"
        )
    
    # Проверка длины
    if len(bot_id) > 100:
        logger.warning(f"bot_id слишком длинный: {len(bot_id)} символов")
        raise HTTPException(
            status_code=400,
            detail="bot_id не может быть длиннее 100 символов"
        )
    
    # Проверка на безопасные символы (защита от SQL injection, XSS и т.д.)
    if not BOT_ID_PATTERN.match(bot_id):
        logger.warning(f"Невалидный bot_id: {bot_id[:50]}... (содержит недопустимые символы)")
        raise HTTPException(
            status_code=400,
            detail="bot_id может содержать только буквы, цифры, дефисы и подчеркивания"
        )
    
    # Дополнительная проверка: bot_id не должен быть только из специальных символов
    if not any(c.isalnum() for c in bot_id):
        logger.warning(f"bot_id содержит только специальные символы: {bot_id[:50]}")
        raise HTTPException(
            status_code=400,
            detail="bot_id должен содержать хотя бы одну букву или цифру"
        )
    
    return bot_id

def sanitize_string(value: str, max_length: int = 500, allow_newlines: bool = False) -> str:
    """
    Санитизирует строковое значение
    
    Args:
        value: Строка для санитизации
        max_length: Максимальная длина строки
        allow_newlines: Разрешить переносы строк
    
    Returns:
        str: Санитизированная строка
    
    Raises:
        HTTPException: 400 если значение невалидно
    """
    if not value:
        return value
    
    if len(value) > max_length:
        logger.warning(f"Строка слишком длинная: {len(value)} символов (максимум {max_length})")
        raise HTTPException(
            status_code=400,
            detail=f"Строка не может быть длиннее {max_length} символов"
        )
    
    # Удаляем потенциально опасные символы
    if not allow_newlines:
        value = value.replace('\n', ' ').replace('\r', ' ')
    
    # Удаляем NULL байты
    value = value.replace('\x00', '')
    
    return value.strip()

