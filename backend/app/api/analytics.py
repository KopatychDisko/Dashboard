import logging
import asyncio
from fastapi import APIRouter, HTTPException, Query, Path, Depends
from typing import Dict, Any, List
from datetime import datetime

from app.database.supabase_client import get_supabase_client
from app.core.dependencies import verify_bot_access
from app.core.cache import cached
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{bot_id}/dashboard", response_model=Dict[str, Any])
@cached(ttl=settings.RESPONSE_CACHE_TTL if settings.ENABLE_RESPONSE_CACHE else None, key_params=['bot_id', 'days'])
async def get_dashboard_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа"),
    current_user_id: int = Depends(verify_bot_access)
) -> Dict[str, Any]:
    """
    Получение полной аналитики для дашборда
    
    Returns:
        Dict с метриками, воронкой продаж и выручкой по дням
    """
    try:
        logger.info(f"📊 Запрос аналитики дашборда для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # ОПТИМИЗАЦИЯ: Выполняем независимые запросы параллельно
        logger.info(f"📈 Параллельная загрузка метрик и воронки...")
        metrics_data, funnel_data = await asyncio.gather(
            db_client.get_dashboard_metrics(bot_id, days),
            db_client.get_funnel_stats(bot_id, days)
        )
        
        # Получаем данные роста пользователей (зависит от метрик)
        logger.info(f"📈 Получение данных роста пользователей...")
        # Вычисляем базовое количество: общее количество минус новые за период
        base_total = max(0, metrics_data.get('total_users', 0) - metrics_data.get('new_users', 0))
        user_growth_data = await db_client.get_user_growth_data(bot_id, days, base_total)
        
        # Формируем ответ
        response = {
            "bot_id": bot_id,
            "metrics": metrics_data,
            "funnel": funnel_data,
            "user_growth": user_growth_data,
            "generated_at": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Аналитика для бота {bot_id} успешно сформирована")
        
        return response
        
    except Exception as e:
        logger.error(f"Ошибка получения аналитики дашборда для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения аналитики"
        )

@router.get("/{bot_id}/metrics", response_model=Dict[str, Any])
@cached(ttl=settings.RESPONSE_CACHE_TTL if settings.ENABLE_RESPONSE_CACHE else None, key_params=['bot_id', 'days'])
async def get_bot_metrics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа"),
    current_user_id: int = Depends(verify_bot_access)
) -> Dict[str, Any]:
    """
    Получение основных метрик бота
    
    Returns:
        Dict с основными метриками: выручка, пользователи, конверсия, LTV
    """
    try:
        logger.info(f"📊 Запрос метрик для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        metrics = await db_client.get_dashboard_metrics(bot_id, days)
        
        logger.info(f"✅ Метрики для бота {bot_id} получены")
        
        return {
            "success": True,
            "bot_id": bot_id,
            "period_days": days,
            "metrics": metrics
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения метрик для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения метрик"
        )

@router.get("/{bot_id}/funnel", response_model=Dict[str, Any])
@cached(ttl=settings.RESPONSE_CACHE_TTL if settings.ENABLE_RESPONSE_CACHE else None, key_params=['bot_id', 'days'])
async def get_funnel_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа"),
    current_user_id: int = Depends(verify_bot_access)
) -> Dict[str, Any]:
    """
    Получение аналитики воронки продаж
    
    Returns:
        Dict со статистикой воронки по этапам и общей конверсией
    """
    try:
        logger.info(f"🎯 Запрос воронки для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        funnel_stats = await db_client.get_funnel_stats(bot_id, days)
        
        logger.info(f"✅ Воронка для бота {bot_id} получена: {len(funnel_stats.get('steps', []))} этапов")
        
        return {
            "success": True,
            "bot_id": bot_id,
            "period_days": days,
            "funnel": funnel_stats
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения воронки для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения воронки продаж"
        )

# Эндпоинт выручки удалён по требованию. Оставлены метрики и воронка.

@router.get("/{bot_id}/detailed", response_model=Dict[str, Any])
async def get_detailed_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(30, ge=1, le=365, description="Количество дней для анализа"),
    current_user_id: int = Depends(verify_bot_access)
) -> Dict[str, Any]:
    """
    Получение детальной аналитики
    
    Returns:
        Dict с детальной статистикой по сессиям, пользователям и этапам
    """
    try:
        logger.info(f"📋 Запрос детальной аналитики для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # ОПТИМИЗАЦИЯ: Выполняем независимые запросы параллельно
        logger.info(f"📊 Параллельная загрузка метрик и воронки...")
        metrics, funnel_stats = await asyncio.gather(
            db_client.get_dashboard_metrics(bot_id, days),
            db_client.get_funnel_stats(bot_id, days)
        )
        
        # Формируем детальный ответ
        detailed_analytics = {
            "bot_id": bot_id,
            "period_days": days,
            "total_sessions": metrics.get('total_sessions', 0),
            "total_users": metrics.get('total_users', 0),
            "stages": {step['stage']: step['users_count'] for step in funnel_stats.get('steps', [])},
            "events": [],  # TODO: Добавить статистику событий
            "avg_quality": 0.0,  # TODO: Добавить средний балл качества лидов
            "generated_at": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Детальная аналитика для бота {bot_id} получена")
        
        return detailed_analytics
        
    except Exception as e:
        logger.error(f"Ошибка получения детальной аналитики для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения детальной аналитики"
        )

@router.get("/{bot_id}/detailed-metrics", response_model=Dict[str, Any])
@cached(ttl=settings.RESPONSE_CACHE_TTL if settings.ENABLE_RESPONSE_CACHE else None, key_params=['bot_id', 'days'])
async def get_detailed_metrics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа"),
    current_user_id: int = Depends(verify_bot_access)
) -> Dict[str, Any]:
    """
    Получение детальных метрик для маркетинга
    
    Returns:
        Dict с общими метриками, метриками за период и разбивкой по воронке
    """
    try:
        logger.info(f"📊 Запрос детальных метрик для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # ОПТИМИЗАЦИЯ: Выполняем независимые запросы параллельно
        logger.info(f"📈 Параллельная загрузка детальных метрик...")
        from datetime import timedelta, timezone
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        general_metrics, period_metrics, funnel_breakdown, chart_data = await asyncio.gather(
            db_client.get_general_metrics(bot_id),
            db_client.get_period_metrics(bot_id, days),
            db_client.get_funnel_breakdown(bot_id),
            db_client._get_chart_data(bot_id, start_date, end_date)
        )
        
        # Формируем ответ
        response = {
            "bot_id": bot_id,
            "period_days": days,
            "general_metrics": general_metrics,
            "period_metrics": period_metrics,
            "funnel_breakdown": funnel_breakdown,
            "user_growth_chart": chart_data,
            "generated_at": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Детальные метрики для бота {bot_id} успешно получены")
        
        return response
        
    except Exception as e:
        logger.error(f"Ошибка получения детальных метрик для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения детальных метрик"
        )

@router.get("/{bot_id}/recent-events", response_model=Dict[str, Any])
async def get_recent_events(
    bot_id: str = Path(..., description="ID бота"),
    limit: int = Query(10, ge=1, le=50, description="Количество событий"),
    current_user_id: int = Depends(verify_bot_access)
) -> Dict[str, Any]:
    """
    Получение последних событий бота
    
    Returns:
        Dict со списком последних событий (title, description, created_at)
    """
    try:
        logger.info(f"📋 Запрос последних {limit} событий для бота {bot_id}")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем события из таблицы scheduled_events, колонка info_dashboard
        events_response = db_client.client.table('scheduled_events').select(
            'info_dashboard'
        ).eq('bot_id', bot_id).not_.is_('info_dashboard', 'null').order(
            'created_at', desc=True
        ).limit(limit).execute()
        
        # Парсим JSON из info_dashboard
        events_list = []
        for row in (events_response.data or []):
            info = row.get('info_dashboard')
            if info and isinstance(info, dict):
                # info уже распарсен как dict
                events_list.append({
                    'title': info.get('title', ''),
                    'description': info.get('description', ''),
                    'created_at': info.get('created_at', '')
                })
            elif info and isinstance(info, str):
                # Если пришло как строка - парсим JSON
                import json
                try:
                    parsed_info = json.loads(info)
                    events_list.append({
                        'title': parsed_info.get('title', ''),
                        'description': parsed_info.get('description', ''),
                        'created_at': parsed_info.get('created_at', '')
                    })
                except json.JSONDecodeError:
                    logger.warning(f"Не удалось распарсить info_dashboard: {info}")
        
        logger.info(f"✅ Получено {len(events_list)} событий для бота {bot_id}")
        
        return {
            "success": True,
            "bot_id": bot_id,
            "events": events_list
        }
    except Exception as e:
        logger.error(f"Ошибка получения событий для бота {bot_id}: {e}")
        # Возвращаем пустой список при ошибке
        return {"success": True, "bot_id": bot_id, "events": []}

@router.get("/{bot_id}/export", response_model=Dict[str, Any])
async def export_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(30, ge=1, le=365, description="Количество дней для экспорта"),
    export_format: str = Query("json", pattern="^(json|csv)$", description="Формат экспорта", alias="format"),
    current_user_id: int = Depends(verify_bot_access)
) -> Dict[str, Any]:
    """
    Экспорт аналитики в различных форматах
    
    Args:
        bot_id: ID бота
        days: Период в днях
        export_format: Формат экспорта (json или csv)
        
    Returns:
        Dict с полной аналитикой для экспорта
    """
    try:
        logger.info(f"📤 Экспорт аналитики для бота {bot_id}, период: {days} дней, формат: {export_format}")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем полную аналитику
        logger.info(f"📊 Получение метрик...")
        metrics = await db_client.get_dashboard_metrics(bot_id, days)
        
        logger.info(f"🎯 Получение воронки...")
        funnel_stats = await db_client.get_funnel_stats(bot_id, days)
        
        export_data = {
            "bot_id": bot_id,
            "period_days": days,
            "exported_at": datetime.now().isoformat(),
            "metrics": metrics,
            "funnel": funnel_stats
        }
        
        if export_format == "json":
            logger.info(f"✅ JSON экспорт для бота {bot_id} завершен")
            return export_data
        elif export_format == "csv":
            # Возвращаем те же данные - конвертация в CSV происходит на фронтенде
            logger.info(f"✅ CSV экспорт для бота {bot_id} завершен (конвертация на фронтенде)")
            return export_data
        
    except Exception as e:
        logger.error(f"Ошибка экспорта аналитики для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка экспорта аналитики"
        )