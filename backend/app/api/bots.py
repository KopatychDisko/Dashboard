import logging
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any

from app.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{telegram_id}")
async def get_user_bots(telegram_id: int):
    """
    Получение списка ботов пользователя
    """
    try:
        logger.info(f"Запрос списка ботов для пользователя {telegram_id}")
        
        db_client = get_supabase_client()
        await db_client.initialize()
        
        # Получаем список ботов пользователя
        user_bots = await db_client.get_user_bots(telegram_id)
        
        # Формируем детальную информацию о ботах
        bots_info = []
        for bot_id in user_bots:
            # Получаем количество пользователей бота
            bot_client = get_supabase_client(bot_id)
            await bot_client.initialize()
            
            # Получаем базовую статистику (исключаем пользователей с first_name = Test)
            users_count = 0
            try:
                users_response = bot_client.client.table('sales_users').select(
                    'telegram_id'
                ).eq('bot_id', bot_id).neq('first_name', 'Test').execute()
                users_count = len(users_response.data) if users_response.data else 0
            except Exception as e:
                logger.warning(f"Не удалось получить количество пользователей для бота {bot_id}: {e}")
            
            bot_info = {
                "bot_id": bot_id,
                "name": bot_id.replace("-", " ").title(),
                "status": "active",
                "total": users_count,
                "created_at": None,
                "description": f"Бот {bot_id}"
            }
            bots_info.append(bot_info)
        
        logger.info(f"Найдено {len(bots_info)} ботов для пользователя {telegram_id}")
        
        return {
            "success": True,
            "telegram_id": telegram_id,
            "bots": bots_info
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения списка ботов для пользователя {telegram_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения списка ботов"
        )

@router.get("/{bot_id}/info")
async def get_bot_info(bot_id: str):
    """
    Получение детальной информации о боте
    """
    try:
        logger.info(f"Запрос информации о боте {bot_id}")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем базовые метрики бота
        metrics = await db_client.get_dashboard_metrics(bot_id, days=30)
        
        bot_info = {
            "bot_id": bot_id,
            "name": bot_id.replace("-", " ").title(),
            "status": "active",
            "total_users": metrics.get('total_users', 0),
            "total_sessions": metrics.get('total_sessions', 0),
            "created_at": None,  # Можно добавить из конфигурации
            "description": f"Телеграм бот {bot_id}",
            "metrics": metrics
        }
        
        return {
            "success": True,
            "bot": bot_info
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения информации о боте {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения информации о боте"
        )

@router.get("/{bot_id}/users")
async def get_bot_users(
    bot_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Получение списка пользователей бота
    """
    try:
        logger.info(f"Запрос пользователей бота {bot_id}, limit={limit}, offset={offset}")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Здесь можно добавить метод для получения пользователей бота
        # Пока возвращаем заглушку
        users = []
        
        return {
            "success": True,
            "bot_id": bot_id,
            "users": users,
            "total": len(users),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения пользователей бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения пользователей бота"
        )