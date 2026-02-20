import logging
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from typing import List, Dict, Any

from app.database.supabase_client import get_supabase_client
from app.core.dependencies import verify_bot_access
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{telegram_id}")
async def get_user_bots(telegram_id: int):
    """
    Получение списка ботов пользователя
    """
    try:
        if settings.ENVIRONMENT != "production":
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
                if settings.ENVIRONMENT != "production":
                    logger.info(f"🔍 Подсчет пользователей для bot_id: {bot_id}")
                users_response = bot_client.client.table('sales_users').select(
                    'telegram_id'
                ).eq('bot_id', bot_id).not_.like('first_name', 'Test%').execute()
                
                if settings.ENVIRONMENT != "production":
                    logger.info(f"📊 Ответ от БД: data={users_response.data}")
                    logger.info(f"📊 Тип данных: {type(users_response.data)}")
                    logger.info(f"📊 Длина массива: {len(users_response.data) if users_response.data else 0}")
                
                users_count = len(users_response.data) if users_response.data else 0
                if settings.ENVIRONMENT != "production":
                    logger.info(f"✅ Для бота {bot_id} найдено {users_count} пользователей (без Test)")
            except Exception as e:
                logger.error(f"❌ Ошибка получения пользователей для бота {bot_id}: {e}")
            
            bot_info = {
                "bot_id": bot_id,
                "name": bot_id.replace("-", " ").title(),
                "status": "active",
                "total": users_count,
                "created_at": None,
                "description": f"Бот {bot_id}"
            }
            bots_info.append(bot_info)
        
        if settings.ENVIRONMENT != "production":
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
async def get_bot_info(
    bot_id: str,
    current_user_id: int = Depends(verify_bot_access)
):
    """
    Получение детальной информации о боте
    """
    try:
        if settings.ENVIRONMENT != "production":
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
    offset: int = Query(0, ge=0),
    current_user_id: int = Depends(verify_bot_access)
):
    """
    Получение списка пользователей бота из таблицы sales_users
    """
    try:
        if settings.ENVIRONMENT != "production":
            logger.info(f"Запрос пользователей бота {bot_id}, limit={limit}, offset={offset}")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем пользователей бота с count в одном запросе, исключая тестовых (first_name LIKE 'Test%')
        users_query = db_client.client.table('sales_users').select(
            'telegram_id,username,first_name,last_name,language_code,created_at,updated_at,is_active',
            count='exact'
        ).eq('bot_id', bot_id).not_.like('first_name', 'Test%').order('created_at', desc=True)
        
        # Применяем пагинацию
        users_query = users_query.range(offset, offset + limit - 1)
        
        users_response = users_query.execute()
        users = users_response.data or []
        
        # Получаем общее количество из того же запроса
        total = getattr(users_response, 'count', None)
        if total is None:
            # Fallback: если count недоступен, используем длину данных
            total = len(users)
        
        if settings.ENVIRONMENT != "production":
            logger.info(f"Найдено {len(users)} пользователей бота {bot_id} (offset={offset}, limit={limit}, total={total})")
        
        return {
            "success": True,
            "bot_id": bot_id,
            "users": users,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения пользователей бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения пользователей бота"
        )

@router.get("/{bot_id}/users/{user_id}/dialog")
async def get_user_dialog_history(
    bot_id: str,
    user_id: int,
    from_start: bool = Query(True, description="Читать с начала (от start) или с конца (последние сообщения)"),
    limit: int = Query(50, ge=1, le=200, description="Количество сообщений для загрузки"),
    offset: int = Query(0, ge=0, description="Смещение для пагинации"),
    current_user_id: int = Depends(verify_bot_access)
):
    """
    Получение истории диалога пользователя (последняя сессия)
    """
    try:
        if settings.ENVIRONMENT != "production":
            logger.info(f"Запрос истории диалога для пользователя {user_id} бота {bot_id}, from_start={from_start}, limit={limit}, offset={offset}")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем последнюю сессию пользователя
        sessions_query = db_client.client.table('sales_chat_sessions').select(
            'id,user_id,created_at,updated_at'
        ).eq('bot_id', bot_id).eq('user_id', str(user_id)).order('created_at', desc=True).limit(1)
        
        sessions_response = sessions_query.execute()
        sessions = sessions_response.data or []
        
        if not sessions:
            if settings.ENVIRONMENT != "production":
                logger.info(f"Сессии не найдены для пользователя {user_id} бота {bot_id}")
            return {
                "success": True,
                "bot_id": bot_id,
                "user_id": user_id,
                "session": None,
                "messages": [],
                "total": 0,
                "limit": limit,
                "offset": offset
            }
        
        last_session = sessions[0]
        session_id = last_session['id']
        
        if settings.ENVIRONMENT != "production":
            logger.info(f"Найдена последняя сессия {session_id} для пользователя {user_id}")
        
        # Получаем сообщения из последней сессии с count в одном запросе
        messages_query = db_client.client.table('sales_messages').select(
            'id,session_id,role,content,created_at',
            count='exact'
        ).eq('session_id', session_id)
        
        # Сортируем в зависимости от параметра from_start
        if from_start:
            # Читаем с начала (от start) - сортировка по created_at ASC
            messages_query = messages_query.order('created_at', desc=False)
        else:
            # Читаем с конца (последние сообщения) - сортировка по created_at DESC
            messages_query = messages_query.order('created_at', desc=True)
        
        # Применяем пагинацию
        messages_query = messages_query.range(offset, offset + limit - 1)
        
        messages_response = messages_query.execute()
        messages = messages_response.data or []
        
        # Получаем общее количество из того же запроса
        total_messages = getattr(messages_response, 'count', None)
        if total_messages is None:
            total_messages = len(messages) if messages else 0
        
        # НЕ переворачиваем массив - порядок уже правильный после сортировки
        # Если from_start=True: сортировка ASC, получаем с начала
        # Если from_start=False: сортировка DESC, получаем с конца (последние сообщения)
        # Фронтенд сам решает, как отображать
        
        if settings.ENVIRONMENT != "production":
            logger.info(f"Найдено {len(messages)} сообщений из {total_messages} для сессии {session_id}, from_start={from_start}, offset={offset}")
        
        return {
            "success": True,
            "bot_id": bot_id,
            "user_id": user_id,
            "session": {
                "id": last_session['id'],
                "created_at": last_session.get('created_at'),
                "updated_at": last_session.get('updated_at')
            },
            "messages": messages,
            "total": total_messages,
            "limit": limit,
            "offset": offset,
            "from_start": from_start
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения истории диалога для пользователя {user_id} бота {bot_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения истории диалога: {str(e)}"
        )