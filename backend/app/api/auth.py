import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any

from app.services.telegram_auth import TelegramAuth
from app.database.supabase_client import get_supabase_client
from app.models.user import TelegramUser

logger = logging.getLogger(__name__)

router = APIRouter()

class TelegramAuthRequest(BaseModel):
    """Запрос на авторизацию через Telegram"""
    telegram_id: int
    first_name: str
    last_name: str = None
    username: str = None
    photo_url: str = None
    auth_date: int
    hash: str

class AuthResponse(BaseModel):
    """Ответ после успешной авторизации"""
    success: bool
    telegram_id: int
    first_name: str
    last_name: str = None
    username: str = None
    bots: list = []
    message: str

@router.post("/telegram", response_model=AuthResponse)
async def telegram_auth(auth_request: TelegramAuthRequest):
    """
    Авторизация пользователя через Telegram Widget
    """
    try:
        logger.info(f"Попытка авторизации пользователя {auth_request.telegram_id}")
        
        # Преобразуем в словарь для проверки
        auth_data = auth_request.dict()
        
        # Проверяем подпись Telegram
        telegram_auth_service = TelegramAuth()
        
        if not telegram_auth_service.verify_telegram_auth(auth_data):
            logger.error(f"Неверная подпись для пользователя {auth_request.telegram_id}")
            raise HTTPException(
                status_code=400,
                detail="Неверная подпись Telegram авторизации"
            )
        
        # Проверяем актуальность авторизации (не старше 60 минут)
        if not telegram_auth_service.check_auth_date(auth_request.auth_date, max_age_minutes=60):
            logger.error(f"Устаревшая авторизация для пользователя {auth_request.telegram_id}")
            raise HTTPException(
                status_code=400,
                detail="Авторизация устарела. Попробуйте войти заново."
            )
        
        # Извлекаем данные пользователя
        user_data = telegram_auth_service.extract_user_data(auth_data)
        
        # Работаем с базой данных
        db_client = get_supabase_client()
        await db_client.initialize()
        
        # Создаем или обновляем пользователя
        user_created = await db_client.create_or_update_user(user_data)
        
        if not user_created:
            logger.error(f"Не удалось создать/обновить пользователя {auth_request.telegram_id}")
            raise HTTPException(
                status_code=500,
                detail="Ошибка при создании пользователя"
            )
        
        # Получаем список ботов пользователя
        user_bots = await db_client.get_user_bots(auth_request.telegram_id)
        
        logger.info(f"Успешная авторизация пользователя {auth_request.telegram_id}, ботов: {len(user_bots)}")
        
        return AuthResponse(
            success=True,
            telegram_id=auth_request.telegram_id,
            first_name=auth_request.first_name,
            last_name=auth_request.last_name,
            username=auth_request.username,
            bots=user_bots,
            message="Авторизация успешна"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка авторизации для пользователя {auth_request.telegram_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера"
        )

@router.get("/user/{telegram_id}")
async def get_user_info(telegram_id: int):
    """
    Получение информации о пользователе
    """
    try:
        logger.info(f"Запрос информации о пользователе {telegram_id}")
        
        db_client = get_supabase_client()
        await db_client.initialize()
        
        # Получаем информацию о пользователе
        user_info = await db_client.get_user_info(telegram_id)
        
        if not user_info:
            raise HTTPException(
                status_code=404,
                detail="Пользователь не найден"
            )
        
        # Получаем список ботов пользователя
        user_bots = await db_client.get_user_bots(telegram_id)
        
        return {
            "success": True,
            "user": user_info,
            "bots": user_bots
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения информации о пользователе {telegram_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера"
        )

@router.post("/verify-hash")
async def verify_telegram_hash(data: Dict[str, Any]):
    """
    Проверка подписи Telegram (для тестирования)
    """
    try:
        telegram_auth_service = TelegramAuth()
        is_valid = telegram_auth_service.verify_telegram_auth(data)
        
        return {
            "valid": is_valid,
            "message": "Подпись валидна" if is_valid else "Подпись невалидна"
        }
        
    except Exception as e:
        logger.error(f"Ошибка проверки подписи: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка проверки подписи"
        )