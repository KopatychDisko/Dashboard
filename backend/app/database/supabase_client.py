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
            users_response = self.client.table('sales_admins').select('bot_id').eq(
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
        """Получает метрики для дашборда (оптимизированная версия)"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            today = datetime.now(timezone.utc).date()
            
            # ОПТИМИЗАЦИЯ: Один запрос для получения всех пользователей с created_at
            # Затем считаем новые пользователи в памяти (быстрее чем второй запрос к БД)
            real_users_query = self.client.table('sales_users').select(
                'telegram_id', 'created_at'
            ).eq('bot_id', bot_id).not_.like('first_name', 'Test%')
            real_users_response = real_users_query.execute()
            all_users = real_users_response.data or []
            real_user_ids = [u['telegram_id'] for u in all_users]
            total_users = len(real_user_ids)
            
            # Считаем новых пользователей из уже полученных данных (оптимизация)
            new_users = 0
            if all_users:
                cutoff_datetime = cutoff_date.replace(tzinfo=timezone.utc)
                for user in all_users:
                    if user.get('created_at'):
                        try:
                            user_date = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
                            if user_date >= cutoff_datetime:
                                new_users += 1
                        except (ValueError, AttributeError):
                            continue
            
            # ОПТИМИЗАЦИЯ: Один запрос для сессий (вместо двух)
            # Получаем все сессии за период с нужными полями
            sessions_query = self.client.table('sales_chat_sessions').select(
                'id', 'user_id', 'current_stage', 'created_at'
            ).eq('bot_id', bot_id).gte('created_at', cutoff_date.isoformat())
            if real_user_ids:  # Добавляем фильтр по реальным пользователям
                sessions_query = sessions_query.in_('user_id', real_user_ids)
            sessions_response = sessions_query.execute()
            sessions = sessions_response.data or []
            session_ids = [s['id'] for s in sessions]
            
            # Активные пользователи сегодня
            logger.info(f"🔍 Подсчет активных пользователей за сегодня ({today})")
            active_today = 0
            if session_ids:
                # Ищем сообщения от пользователей (role='user') сегодня в этих сессиях
                messages_query = self.client.table('sales_messages').select(
                    'session_id'
                ).in_('session_id', session_ids).eq('role', 'user').gte(
                    'created_at', today.isoformat()
                )
                messages_response = messages_query.execute()
                
                # Считаем уникальные session_id (один пользователь = одна сессия)
                unique_sessions = set(msg['session_id'] for msg in (messages_response.data or []))
                active_today = len(unique_sessions)
                
                logger.info(f"💬 Найдено {len(messages_response.data or [])} сообщений от пользователей сегодня")
                logger.info(f"✅ Активных пользователей сегодня: {active_today}")
            else:
                logger.warning(f"⚠️ Нет сессий для бота {bot_id}")
            
            # Реальные данные из базы
            return {
                'total_revenue': 0.0,  # TODO: Добавить расчет из таблицы платежей
                'new_users': new_users,
                'conversion_rate': 0.0,  # TODO: Рассчитать конверсию
                'average_check': 0.0,  # TODO: Средний чек из платежей
                'ltv': 0.0,  # TODO: LTV из истории платежей
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
                    'revenue': 0.0,  # TODO: Посчитать выручку на этапе
                    'avg_check': 0.0  # TODO: Средний чек на этапе
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
    
    # Метод get_revenue_by_days удалён по требованию. Оставлены метрики и воронка.
    
    async def get_user_growth_data(self, bot_id: str, days: int = 7, base_total: int = 0) -> List[Dict[str, Any]]:
        """Получает данные роста пользователей по дням (оптимизированная версия)"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Получаем всех пользователей за период одним запросом
            users_query = self.client.table('sales_users').select('telegram_id,created_at').eq(
                'bot_id', bot_id
            ).not_.like('first_name', 'Test%').gte('created_at', cutoff_date.isoformat())
            users_response = users_query.execute()
            all_users = users_response.data if users_response.data else []
            
            # Получаем все сессии за период одним запросом
            sessions_query = self.client.table('sales_chat_sessions').select('user_id,created_at').eq(
                'bot_id', bot_id
            ).gte('created_at', cutoff_date.isoformat())
            sessions_response = sessions_query.execute()
            all_sessions = sessions_response.data if sessions_response.data else []
            
            # Создаем множество реальных пользователей из уже полученных данных
            real_user_ids = {u['telegram_id'] for u in all_users}
            
            # Группируем данные по дням
            growth_data = []
            daily_new_users = {}
            daily_active_users = {}
            
            # Подсчитываем новых пользователей по дням
            for user in all_users:
                if user.get('created_at'):
                    user_date = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
                    day_key = user_date.date().isoformat()
                    daily_new_users[day_key] = daily_new_users.get(day_key, 0) + 1
            
            # Подсчитываем активных пользователей по дням
            for session in all_sessions:
                if session.get('user_id') and session.get('user_id') in real_user_ids:
                    if session.get('created_at'):
                        session_date = datetime.fromisoformat(session['created_at'].replace('Z', '+00:00'))
                        day_key = session_date.date().isoformat()
                        if day_key not in daily_active_users:
                            daily_active_users[day_key] = set()
                        daily_active_users[day_key].add(session['user_id'])
            
            # Формируем данные для каждого дня
            # Используем базовое количество из metrics (передается как параметр)
            current_total = base_total
            for i in range(days):
                date = datetime.now() - timedelta(days=days-1-i)
                date_key = date.date().isoformat()
                
                # Новые пользователи за день
                new_users = daily_new_users.get(date_key, 0)
                current_total += new_users
                
                # Активные пользователи за день
                active_set = daily_active_users.get(date_key, set())
                active_users = len(active_set)
                
                growth_data.append({
                    'date': date.isoformat(),
                    'total_users': current_total,
                    'new_users': new_users,
                    'active_users': active_users
                })
            
            logger.info(f"✅ Получены данные роста пользователей для бота {bot_id} за {days} дней")
            return growth_data
            
        except Exception as e:
            logger.error(f"Ошибка получения данных роста пользователей: {e}")
            return []

# Создание глобального экземпляра
def get_supabase_client(bot_id: str = None) -> SupabaseClient:
    """Фабрика для создания клиента Supabase"""
    client = SupabaseClient(bot_id)
    return client