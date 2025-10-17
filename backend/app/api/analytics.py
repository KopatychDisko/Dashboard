import logging
from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Any, List
from datetime import datetime

from app.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{bot_id}/dashboard", response_model=Dict[str, Any])
async def get_dashboard_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
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
        
        # Получаем основные метрики
        logger.info(f"📈 Получение метрик...")
        metrics_data = await db_client.get_dashboard_metrics(bot_id, days)
        
        # Получаем статистику воронки
        logger.info(f"🎯 Получение воронки продаж...")
        funnel_data = await db_client.get_funnel_stats(bot_id, days)
        
        # Получаем выручку по дням
        logger.info(f"💰 Получение выручки по дням...")
        revenue_data = await db_client.get_revenue_by_days(bot_id, days)
        
        # Формируем ответ
        response = {
            "bot_id": bot_id,
            "metrics": metrics_data,
            "funnel": funnel_data,
            "revenue_by_days": revenue_data,
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
async def get_bot_metrics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
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
async def get_funnel_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
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

@router.get("/{bot_id}/revenue", response_model=Dict[str, Any])
async def get_revenue_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
) -> Dict[str, Any]:
    """
    Получение аналитики выручки по дням
    
    Returns:
        Dict с выручкой и количеством заказов по дням
    """
    try:
        logger.info(f"💰 Запрос выручки для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        revenue_data = await db_client.get_revenue_by_days(bot_id, days)
        
        logger.info(f"✅ Выручка для бота {bot_id} получена: {len(revenue_data)} дней")
        
        return {
            "success": True,
            "bot_id": bot_id,
            "period_days": days,
            "revenue_data": revenue_data
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения выручки для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения аналитики выручки"
        )

@router.get("/{bot_id}/detailed", response_model=Dict[str, Any])
async def get_detailed_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(30, ge=1, le=365, description="Количество дней для анализа")
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
        
        # Получаем основные метрики
        logger.info(f"📊 Получение метрик...")
        metrics = await db_client.get_dashboard_metrics(bot_id, days)
        
        # Получаем статистику воронки
        logger.info(f"🎯 Получение воронки...")
        funnel_stats = await db_client.get_funnel_stats(bot_id, days)
        
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

@router.get("/{bot_id}/export", response_model=Dict[str, Any])
async def export_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(30, ge=1, le=365, description="Количество дней для экспорта"),
    export_format: str = Query("json", pattern="^(json|csv)$", description="Формат экспорта", alias="format")
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
        
        logger.info(f"💰 Получение выручки...")
        revenue_data = await db_client.get_revenue_by_days(bot_id, days)
        
        export_data = {
            "bot_id": bot_id,
            "period_days": days,
            "exported_at": datetime.now().isoformat(),
            "metrics": metrics,
            "funnel": funnel_stats,
            "revenue_data": revenue_data
        }
        
        if export_format == "json":
            logger.info(f"✅ JSON экспорт для бота {bot_id} завершен")
            return export_data
        elif export_format == "csv":
            # TODO: Добавить конвертацию в CSV
            logger.warning(f"⚠️ CSV экспорт еще не реализован, возвращаем JSON")
            return {
                "message": "CSV экспорт будет добавлен в следующих версиях",
                "data": export_data
            }
        
    except Exception as e:
        logger.error(f"Ошибка экспорта аналитики для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка экспорта аналитики"
        )