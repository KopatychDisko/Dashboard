import logging
from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Any, List
from datetime import datetime

from app.database.supabase_client import get_supabase_client
from app.models.analytics import (
    AnalyticsResponse, 
    DashboardMetrics, 
    RevenueByDay, 
    FunnelStats,
    DetailedAnalytics
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{bot_id}/dashboard")
async def get_dashboard_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
):
    """
    Получение полной аналитики для дашборда
    """
    try:
        logger.info(f"Запрос аналитики дашборда для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем основные метрики
        metrics_data = await db_client.get_dashboard_metrics(bot_id, days)
        
        # Получаем статистику воронки
        funnel_data = await db_client.get_funnel_stats(bot_id, days)
        
        # Получаем выручку по дням
        revenue_data = await db_client.get_revenue_by_days(bot_id, days)
        
        # Формируем ответ
        response = {
            "bot_id": bot_id,
            "metrics": metrics_data,
            "funnel": funnel_data,
            "revenue_by_days": revenue_data,
            "generated_at": datetime.now().isoformat()
        }
        
        logger.info(f"Аналитика для бота {bot_id} успешно сформирована")
        
        return response
        
    except Exception as e:
        logger.error(f"Ошибка получения аналитики дашборда для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения аналитики"
        )

@router.get("/{bot_id}/metrics")
async def get_bot_metrics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
):
    """
    Получение основных метрик бота
    """
    try:
        logger.info(f"Запрос метрик для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        metrics = await db_client.get_dashboard_metrics(bot_id, days)
        
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

@router.get("/{bot_id}/funnel")
async def get_funnel_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
):
    """
    Получение аналитики воронки продаж
    """
    try:
        logger.info(f"Запрос воронки для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        funnel_stats = await db_client.get_funnel_stats(bot_id, days)
        
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

@router.get("/{bot_id}/revenue")
async def get_revenue_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(7, ge=1, le=365, description="Количество дней для анализа")
):
    """
    Получение аналитики выручки по дням
    """
    try:
        logger.info(f"Запрос выручки для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        revenue_data = await db_client.get_revenue_by_days(bot_id, days)
        
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

@router.get("/{bot_id}/detailed")
async def get_detailed_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(30, ge=1, le=365, description="Количество дней для анализа")
):
    """
    Получение детальной аналитики
    """
    try:
        logger.info(f"Запрос детальной аналитики для бота {bot_id}, период: {days} дней")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем основные метрики
        metrics = await db_client.get_dashboard_metrics(bot_id, days)
        
        # Получаем статистику воронки
        funnel_stats = await db_client.get_funnel_stats(bot_id, days)
        
        # Формируем детальный ответ
        detailed_analytics = {
            "bot_id": bot_id,
            "period_days": days,
            "total_sessions": metrics.get('total_sessions', 0),
            "total_users": metrics.get('total_users', 0),
            "stages": {step['stage']: step['users_count'] for step in funnel_stats.get('steps', [])},
            "events": [],  # Можно добавить статистику событий
            "avg_quality": 0.0,  # Можно добавить средний балл качества лидов
            "generated_at": datetime.now().isoformat()
        }
        
        return detailed_analytics
        
    except Exception as e:
        logger.error(f"Ошибка получения детальной аналитики для бота {bot_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка получения детальной аналитики"
        )

@router.get("/{bot_id}/export")
async def export_analytics(
    bot_id: str = Path(..., description="ID бота"),
    days: int = Query(30, ge=1, le=365, description="Количество дней для экспорта"),
    format: str = Query("json", regex="^(json|csv)$", description="Формат экспорта")
):
    """
    Экспорт аналитики в различных форматах
    """
    try:
        logger.info(f"Экспорт аналитики для бота {bot_id}, период: {days} дней, формат: {format}")
        
        db_client = get_supabase_client(bot_id)
        await db_client.initialize()
        
        # Получаем полную аналитику
        metrics = await db_client.get_dashboard_metrics(bot_id, days)
        funnel_stats = await db_client.get_funnel_stats(bot_id, days)
        revenue_data = await db_client.get_revenue_by_days(bot_id, days)
        
        export_data = {
            "bot_id": bot_id,
            "period_days": days,
            "exported_at": datetime.now().isoformat(),
            "metrics": metrics,
            "funnel": funnel_stats,
            "revenue_data": revenue_data
        }
        
        if format == "json":
            return export_data
        elif format == "csv":
            # Здесь можно добавить конвертацию в CSV
            # Пока возвращаем JSON с указанием формата
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