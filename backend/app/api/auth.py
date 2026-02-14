import logging
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.services.telegram_auth import TelegramAuth
from app.database.supabase_client import get_supabase_client
from app.models.user import TelegramUser

logger = logging.getLogger(__name__)

router = APIRouter()

class TelegramAuthRequest(BaseModel):
    """Запрос на авторизацию через Telegram"""
    telegram_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class AuthResponse(BaseModel):
    """Ответ после успешной авторизации"""
    success: bool
    telegram_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    bots: list = []
    message: str

@router.post("/telegram", response_model=AuthResponse)
async def telegram_auth(auth_request: TelegramAuthRequest, response: Response):
    """
    Авторизация пользователя через Telegram Widget
    """
    try:
        logger.info("=" * 100)
        logger.info(f"🔐 НОВАЯ ПОПЫТКА АВТОРИЗАЦИИ")
        logger.info("=" * 100)
        logger.info(f"👤 User ID: {auth_request.telegram_id}")
        logger.info(f"👤 Имя: {auth_request.first_name} {auth_request.last_name or ''}")
        logger.info(f"👤 Username: @{auth_request.username or 'нет'}")
        logger.info(f"🔑 Hash (первые 30): {auth_request.hash[:30]}...")
        logger.info(f"🔑 Hash (последние 10): ...{auth_request.hash[-10:]}")
        logger.info(f"⏰ Auth date (timestamp): {auth_request.auth_date}")
        
        # Создаем словарь с оригинальными именами полей от Telegram
        # ВАЖНО: используем 'id' вместо 'telegram_id' для проверки подписи
        auth_data = {
            'id': auth_request.telegram_id,
            'first_name': auth_request.first_name,
            'auth_date': auth_request.auth_date,
            'hash': auth_request.hash
        }
        
        # Добавляем опциональные поля только если они есть
        if auth_request.last_name:
            auth_data['last_name'] = auth_request.last_name
            logger.info(f"📝 Добавлено поле: last_name = {auth_request.last_name}")
        if auth_request.username:
            auth_data['username'] = auth_request.username
            logger.info(f"📝 Добавлено поле: username = {auth_request.username}")
        if auth_request.photo_url:
            auth_data['photo_url'] = auth_request.photo_url
            logger.info(f"📝 Добавлено поле: photo_url = {auth_request.photo_url[:50]}...")
            
        logger.info(f"📦 Итоговые поля для проверки: {list(auth_data.keys())}")
        logger.info(f"📦 Количество полей: {len(auth_data)}")
        
        # Проверяем подпись Telegram
        telegram_auth_service = TelegramAuth()
        
        logger.info("🔍 ЗАПУСК ПРОВЕРКИ ПОДПИСИ...")
        logger.info("-" * 100)
        is_valid = telegram_auth_service.verify_telegram_auth(auth_data)
        logger.info("-" * 100)
        
        if not is_valid:
            logger.error("❌" * 40)
            logger.error(f"❌ АВТОРИЗАЦИЯ ОТКЛОНЕНА: Неверная подпись для пользователя {auth_request.telegram_id}")
            logger.error("❌" * 40)
            raise HTTPException(
                status_code=400,
                detail="Неверная подпись Telegram авторизации"
            )
        
        logger.info("✅" * 40)
        logger.info(f"✅ ПОДПИСЬ ВАЛИДНА! Пользователь {auth_request.telegram_id} успешно авторизован")
        logger.info("✅" * 40)
        
        # Проверяем актуальность авторизации (не старше 60 минут)
        logger.info(f"⏰ Проверка времени авторизации...")
        if not telegram_auth_service.check_auth_date(auth_request.auth_date, max_age_minutes=60):
            logger.error(f"⏰ ОШИБКА: Устаревшая авторизация для пользователя {auth_request.telegram_id}")
            raise HTTPException(
                status_code=400,
                detail="Авторизация устарела. Попробуйте войти заново."
            )
        logger.info(f"⏰ Время авторизации валидно (не старше 60 минут)")
        
        # Извлекаем данные пользователя
        logger.info(f"📤 Извлечение данных пользователя...")
        user_data = telegram_auth_service.extract_user_data(auth_data)
        logger.info(f"📤 Данные пользователя: {user_data}")
        
        # Работаем с базой данных
        logger.info(f"💾 Подключение к базе данных...")
        db_client = get_supabase_client()
        await db_client.initialize()
        logger.info(f"💾 База данных подключена")
        
        # Создаем или обновляем пользователя
        logger.info(f"💾 Сохранение пользователя в БД...")
        user_created = await db_client.create_or_update_user(user_data)
        
        if not user_created:
            logger.error(f"💾 ОШИБКА: Не удалось создать/обновить пользователя {auth_request.telegram_id}")
            raise HTTPException(
                status_code=500,
                detail="Ошибка при создании пользователя"
            )
        logger.info(f"💾 Пользователь успешно сохранен в БД")
        
        # Получаем список ботов пользователя
        logger.info(f"🤖 Загрузка списка ботов пользователя...")
        user_bots = await db_client.get_user_bots(auth_request.telegram_id)
        logger.info(f"🤖 Найдено ботов: {len(user_bots)}")
        
        logger.info("=" * 100)
        logger.info(f"🎉 АВТОРИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
        logger.info(f"🎉 Пользователь: {auth_request.first_name} (@{auth_request.username or 'нет'})")
        logger.info(f"🎉 ID: {auth_request.telegram_id}")
        logger.info(f"🎉 Ботов доступно: {len(user_bots)}")
        logger.info("=" * 100)
        
        # Устанавливаем куку с telegram_id
        response.set_cookie(
            key="telegram_id",
            value=str(auth_request.telegram_id),
            max_age=30 * 24 * 60 * 60,  # 30 дней
            httponly=True,
            secure=False,  # Для localhost
            samesite="lax",
            path="/"
        )
        
        logger.info(f"🍪 Установлена кука telegram_id={auth_request.telegram_id}")
        
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

@router.get("/me")
async def get_current_user(request: Request):
    """
    Получение информации о текущем пользователе из куков
    """
    try:
        logger.info(f"🍪 Куки запроса: {dict(request.cookies)}")
        telegram_id = request.cookies.get('telegram_id')
        
        if not telegram_id:
            # Нет куки — считаем, что пользователь не авторизован, но не шлем 401
            # чтобы не провоцировать бесконечные редиректы на фронтенде
            return {
                "success": False,
                "user": None,
                "bots": []
            }
        
        logger.info(f"Запрос информации о пользователе {telegram_id} из куков")
        
        db_client = get_supabase_client()
        await db_client.initialize()
        
        # Получаем информацию о пользователе
        user_info = await db_client.get_user_info(int(telegram_id))
        
        if not user_info:
            raise HTTPException(
                status_code=404,
                detail="Пользователь не найден"
            )
        
        # Получаем список ботов пользователя
        user_bots = await db_client.get_user_bots(int(telegram_id))
        
        return {
            "success": True,
            "user": user_info,
            "bots": user_bots
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения информации о текущем пользователе: {e}")
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера"
        )

@router.post("/logout")
async def logout(response: Response):
    """
    Выход пользователя (очистка куков)
    """
    try:
        # Удаляем куку
        response.delete_cookie(
            key="telegram_id",
            httponly=True,
            secure=False,
            samesite="lax",
            path="/"
        )
        
        logger.info("🍪 Кука telegram_id удалена")
        
        return {
            "success": True,
            "message": "Выход выполнен"
        }
        
    except Exception as e:
        logger.error(f"Ошибка выхода: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка выхода"
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