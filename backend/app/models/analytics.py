from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime, date

class DashboardMetrics(BaseModel):
    """Основные метрики дашборда"""
    total_revenue: float
    new_users: int
    conversion_rate: float
    average_check: float
    ltv: float
    active_today: int
    period_days: int = 7

class RevenueByDay(BaseModel):
    """Выручка по дням"""
    date: date
    revenue: float
    orders_count: int

class FunnelStep(BaseModel):
    """Этап воронки продаж"""
    stage: str
    users_count: int
    percentage: float
    revenue: float
    avg_check: float

class FunnelStats(BaseModel):
    """Статистика воронки продаж"""
    steps: List[FunnelStep]
    total_users: int
    total_conversion: float

class UserActivity(BaseModel):
    """Активность пользователей"""
    date: date
    new_users: int
    active_users: int
    returning_users: int

class AnalyticsResponse(BaseModel):
    """Ответ с аналитикой"""
    bot_id: str
    metrics: DashboardMetrics
    revenue_by_days: List[RevenueByDay]
    funnel: FunnelStats
    user_activity: List[UserActivity]
    generated_at: datetime

class EventStats(BaseModel):
    """Статистика событий"""
    event_type: str
    count: int
    percentage: float

class DetailedAnalytics(BaseModel):
    """Детальная аналитика"""
    bot_id: str
    period_days: int
    total_sessions: int
    total_users: int
    stages: Dict[str, int]
    events: List[EventStats]
    avg_quality: float
    generated_at: datetime