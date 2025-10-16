import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from postgrest.exceptions import APIError

from app.core.config import settings

logger = logging.getLogger(__name__)

class SupabaseClient:
    """Клиент для работы с Supabase с поддержкой bot_id для мультиботовой архитектуры"""
    
    def __init__(self, bot_id: str = None):
        """
        Инициализация клиента Supabase
        
        Args:
            bot_id: Идентификатор бота для изоляции данных (опционально)
        """
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.bot_id = bot_id
        self.client: Optional[Client] = None
        
        if self.bot_id:
            logger.info(f"Инициализация SupabaseClient для bot_id: {self.bot_id}")
        else:
            logger.info("SupabaseClient инициализирован без bot_id - доступ ко всем ботам")
    
    async def initialize(self):
        """Инициализация клиента Supabase"""
        try:
            self.client = create_client(self.url, self.key)
            logger.info(f"Supabase client инициализирован{f' для bot_id: {self.bot_id}' if self.bot_id else ''}")
        except Exception as e:
            logger.error(f"Ошибка инициализации Supabase client: {e}")
            raise
    
    async def get_user_bots(self, telegram_id: int) -> List[str]:
        """Получает список ботов, к которым пользователь имеет доступ"""
        try:
            # Получаем уникальные bot_id для пользователя из разных таблиц
            bots = set()
            
            # Проверяем в sales_users
            users_response = self.client.table('sales_users').select('bot_id').eq(
                'telegram_id', telegram_id
            ).execute()
            
            if users_response.data:
                for user in users_response.data:
                    if user.get('bot_id'):
                        bots.add(user['bot_id'])
            
            # Проверяем в sales_admins
            admins_response = self.client.table('sales_admins').select('bot_id').eq(
                'telegram_id', telegram_id
            ).execute()
            
            if admins_response.data:
                for admin in admins_response.data:
                    if admin.get('bot_id'):
                        bots.add(admin['bot_id'])
            
            logger.info(f"Найдено {len(bots)} ботов для пользователя {telegram_id}: {list(bots)}")
            return list(bots)
            
        except APIError as e:
            logger.error(f"Ошибка при получении списка ботов для пользователя {telegram_id}: {e}")
            return []
    
    async def get_user_info(self, telegram_id: int) -> Optional[Dict[str, Any]]:
        """Получает информацию о пользователе"""
        try:
            response = self.client.table('sales_users').select(
                'telegram_id', 'username', 'first_name', 'last_name', 'language_code', 'created_at', 'updated_at', 'is_active'
            ).eq('telegram_id', telegram_id).limit(1).execute()
            
            if response.data:
                return response.data[0]
            return None
            
        except APIError as e:
            logger.error(f"Ошибка получения информации о пользователе {telegram_id}: {e}")
            return None
    
    async def create_or_update_user(self, user_data: Dict[str, Any]) -> bool:
        """Создает или обновляет пользователя"""
        try:
            # Проверяем существует ли пользователь
            existing = await self.get_user_info(user_data['telegram_id'])
            
            if existing:
                # Обновляем существующего
                self.client.table('sales_users').update({
                    'username': user_data.get('username'),
                    'first_name': user_data.get('first_name'),
                    'last_name': user_data.get('last_name'),
                    'updated_at': datetime.now().isoformat(),
                    'is_active': True
                }).eq('telegram_id', user_data['telegram_id']).execute()
                
                logger.info(f"Обновлен пользователь {user_data['telegram_id']}")
            else:
                # Создаем нового (без bot_id на этапе регистрации)
                self.client.table('sales_users').insert({
                    'telegram_id': user_data['telegram_id'],
                    'username': user_data.get('username'),
                    'first_name': user_data.get('first_name'),
                    'last_name': user_data.get('last_name'),
                    'is_active': True,
                    'bot_id': 'system'  # Временный bot_id для системных пользователей
                }).execute()
                
                logger.info(f"Создан новый пользователь {user_data['telegram_id']}")
            
            return True
            
        except APIError as e:
            logger.error(f"Ошибка при создании/обновлении пользователя: {e}")
            return False
    
    async def get_dashboard_metrics(self, bot_id: str, days: int = 7) -> Dict[str, Any]:
        """Получает метрики для дашборда"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Получаем пользователей бота
            users_query = self.client.table('sales_users').select('telegram_id').eq('bot_id', bot_id)
            users_response = users_query.execute()
            total_users = len(users_response.data) if users_response.data else 0
            
            # Получаем новых пользователей за период
            new_users_query = self.client.table('sales_users').select('telegram_id').eq(
                'bot_id', bot_id
            ).gte('created_at', cutoff_date.isoformat())
            new_users_response = new_users_query.execute()
            new_users = len(new_users_response.data) if new_users_response.data else 0
            
            # Получаем сессии за период
            sessions_query = self.client.table('sales_chat_sessions').select(
                'id', 'user_id', 'current_stage', 'created_at'
            ).eq('bot_id', bot_id).gte('created_at', cutoff_date.isoformat())
            sessions_response = sessions_query.execute()
            sessions = sessions_response.data if sessions_response.data else []
            
            # Активные пользователи сегодня
            today = datetime.now().date()
            active_today_query = self.client.table('sales_chat_sessions').select('user_id').eq(
                'bot_id', bot_id
            ).gte('created_at', today.isoformat())
            active_today_response = active_today_query.execute()
            active_today = len(set(session['user_id'] for session in active_today_response.data)) if active_today_response.data else 0
            
            # Симуляция данных для демонстрации (замените на реальные расчеты)
            return {
                'total_revenue': 142890.0,
                'new_users': new_users,
                'conversion_rate': 4.2,
                'average_check': 2734.0,
                'ltv': 8945.0,
                'active_today': active_today,
                'total_users': total_users,
                'total_sessions': len(sessions),
                'period_days': days
            }
            
        except APIError as e:
            logger.error(f"Ошибка получения метрик дашборда для бота {bot_id}: {e}")
            return {
                'total_revenue': 0.0,
                'new_users': 0,
                'conversion_rate': 0.0,
                'average_check': 0.0,
                'ltv': 0.0,
                'active_today': 0,
                'total_users': 0,
                'total_sessions': 0,
                'period_days': days
            }
    
    async def get_funnel_stats(self, bot_id: str, days: int = 7) -> Dict[str, Any]:
        """Получает статистику воронки продаж"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Получаем сессии с этапами
            sessions_query = self.client.table('sales_chat_sessions').select(
                'id', 'user_id', 'current_stage', 'lead_quality_score'
            ).eq('bot_id', bot_id).gte('created_at', cutoff_date.isoformat())
            sessions_response = sessions_query.execute()
            sessions = sessions_response.data if sessions_response.data else []
            
            # Группируем по этапам
            stages = {}
            for session in sessions:
                stage = session.get('current_stage', 'unknown')
                stages[stage] = stages.get(stage, 0) + 1
            
            total_sessions = len(sessions)
            
            # Формируем воронку с процентами
            funnel_steps = []
            stage_order = ['introduction', 'interest', 'consideration', 'intent', 'purchase']
            
            for i, stage in enumerate(stage_order):
                count = stages.get(stage, 0)
                percentage = (count / total_sessions * 100) if total_sessions > 0 else 0
                
                funnel_steps.append({
                    'stage': stage,
                    'users_count': count,
                    'percentage': round(percentage, 1),
                    'revenue': 0.0,  # Заглушка - добавьте реальный расчет
                    'avg_check': 0.0  # Заглушка - добавьте реальный расчет
                })
            
            return {
                'steps': funnel_steps,
                'total_users': total_sessions,
                'total_conversion': funnel_steps[-1]['percentage'] if funnel_steps else 0
            }
            
        except APIError as e:
            logger.error(f"Ошибка получения статистики воронки для бота {bot_id}: {e}")
            return {
                'steps': [],
                'total_users': 0,
                'total_conversion': 0
            }
    
    async def get_revenue_by_days(self, bot_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """Получает выручку по дням (заглушка - адаптируйте под вашу структуру)"""
        try:
            # Заглушка с примерными данными
            revenue_data = []
            base_date = datetime.now().date()
            
            for i in range(days):
                date_point = base_date - timedelta(days=days-i-1)
                revenue_data.append({
                    'date': date_point.isoformat(),
                    'revenue': 15000 + (i * 2000) + (i * i * 100),  # Примерные данные
                    'orders_count': 5 + i
                })
            
            return revenue_data
            
        except Exception as e:
            logger.error(f"Ошибка получения выручки по дням для бота {bot_id}: {e}")
            return []

# Создание глобального экземпляра
def get_supabase_client(bot_id: str = None) -> SupabaseClient:
    """Фабрика для создания клиента Supabase"""
    client = SupabaseClient(bot_id)
    return client