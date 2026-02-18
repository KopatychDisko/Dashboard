import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from postgrest.exceptions import APIError

from app.core.config import settings

logger = logging.getLogger(__name__)


class ConnectionPool:
    """Пул соединений для переиспользования клиентов Supabase"""
    
    def __init__(self, max_connections: int = 50):
        """
        Инициализация пула соединений
        
        Args:
            max_connections: Максимальное количество соединений в пуле
        """
        # Кеш клиентов: ключ = (url, key) или (url, key, bot_id)
        self._clients: Dict[tuple, Client] = {}
        self._lock = asyncio.Lock()
        self._max_connections = max_connections
        self._connection_count = 0
    
    async def get_client(self, url: str, key: str, bot_id: Optional[str] = None) -> Client:
        """
        Получает клиент из пула или создает новый
        
        Args:
            url: URL Supabase
            key: API ключ Supabase
            bot_id: ID бота (опционально, для изоляции)
        
        Returns:
            Client: Клиент Supabase
        """
        # Ключ для кеша: используем общий клиент для всех запросов без bot_id
        # или отдельный для каждого bot_id (если нужна изоляция)
        cache_key = (url, key, bot_id) if bot_id else (url, key, None)
        
        async with self._lock:
            # Проверяем, есть ли клиент в пуле
            if cache_key in self._clients:
                client = self._clients[cache_key]
                # Проверяем, что клиент еще валиден (базовая проверка)
                if client:
                    logger.debug(f"Использован существующий клиент из пула для {'bot_id: ' + bot_id if bot_id else 'общий'}")
                    return client
            
            # Если пул переполнен, удаляем старые соединения
            if self._connection_count >= self._max_connections:
                # Удаляем первое соединение (FIFO)
                if self._clients:
                    first_key = next(iter(self._clients))
                    del self._clients[first_key]
                    self._connection_count -= 1
                    logger.warning(f"Пул соединений переполнен, удалено соединение: {first_key}")
            
            # Создаем новый клиент
            try:
                client = create_client(url, key)
                self._clients[cache_key] = client
                self._connection_count += 1
                logger.info(f"Создан новый клиент Supabase в пуле{' для bot_id: ' + bot_id if bot_id else ' (общий)'}. Всего соединений: {self._connection_count}")
                return client
            except Exception as e:
                logger.error(f"Ошибка создания клиента Supabase: {e}")
                raise
    
    async def clear(self):
        """Очищает пул соединений"""
        async with self._lock:
            self._clients.clear()
            self._connection_count = 0
            logger.info("Пул соединений очищен")
    
    def get_stats(self) -> Dict[str, Any]:
        """Возвращает статистику пула"""
        return {
            "total_connections": self._connection_count,
            "max_connections": self._max_connections,
            "cached_clients": len(self._clients)
        }


# Глобальный пул соединений (инициализируется с настройками из config)
_connection_pool: Optional[ConnectionPool] = None

def _get_connection_pool() -> ConnectionPool:
    """Получает или создает глобальный пул соединений"""
    global _connection_pool
    if _connection_pool is None:
        max_connections = getattr(settings, 'DB_POOL_MAX_CONNECTIONS', 50)
        _connection_pool = ConnectionPool(max_connections=max_connections)
        logger.info(f"Инициализирован пул соединений Supabase (максимум: {max_connections})")
    return _connection_pool


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
            logger.debug(f"Инициализация SupabaseClient для bot_id: {self.bot_id}")
        else:
            logger.debug("SupabaseClient инициализирован без bot_id - доступ ко всем ботам")
    
    async def initialize(self):
        """Инициализация клиента Supabase из пула соединений"""
        try:
            # Получаем клиент из пула (переиспользуем существующие соединения)
            pool = _get_connection_pool()
            self.client = await pool.get_client(self.url, self.key, self.bot_id)
            logger.debug(f"Supabase client инициализирован из пула{f' для bot_id: {self.bot_id}' if self.bot_id else ''}")
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
        """Получает метрики для дашборда (оптимизированная версия с параллельными запросами)"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            today = datetime.now(timezone.utc).date()
            
            # ОПТИМИЗАЦИЯ: Выполняем запросы пользователей и сессий параллельно
            async def get_users():
                real_users_query = self.client.table('sales_users').select(
                    'telegram_id', 'created_at'
                ).eq('bot_id', bot_id).not_.like('first_name', 'Test%')
                real_users_response = real_users_query.execute()
                return real_users_response.data or []
            
            async def get_sessions():
                sessions_query = self.client.table('sales_chat_sessions').select(
                    'id', 'user_id', 'current_stage', 'created_at'
                ).eq('bot_id', bot_id).gte('created_at', cutoff_date.isoformat())
                sessions_response = sessions_query.execute()
                return sessions_response.data or []
            
            # Параллельное выполнение запросов
            all_users, all_sessions = await asyncio.gather(
                get_users(),
                get_sessions()
            )
            
            real_user_ids = [u['telegram_id'] for u in all_users]
            total_users = len(real_user_ids)
            
            # ОПТИМИЗАЦИЯ: Используем Set для O(1) поиска вместо O(n) списка
            real_user_ids_set = set(real_user_ids) if real_user_ids else set()
            
            # Фильтруем сессии по реальным пользователям (в памяти, быстрее чем в БД)
            sessions = [s for s in all_sessions if s.get('user_id') in real_user_ids_set] if real_user_ids_set else all_sessions
            session_ids = [s['id'] for s in sessions]
            
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
        """Получает данные роста пользователей по дням (использует _get_chart_data для избежания дублирования)"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            # Используем существующий метод для получения данных графика
            chart_data = await self._get_chart_data(bot_id, start_date, end_date)
            
            # Добавляем total_users к данным
            current_total = base_total
            growth_data = []
            for item in chart_data:
                current_total += item.get('new_users', 0)
                growth_data.append({
                    'date': item['date'],
                    'total_users': current_total,
                    'new_users': item.get('new_users', 0),
                    'active_users': item.get('active_users', 0)
                })
            
            logger.info(f"✅ Получены данные роста пользователей для бота {bot_id} за {days} дней")
            return growth_data
            
        except Exception as e:
            logger.error(f"Ошибка получения данных роста пользователей: {e}")
            return []
    
    async def _get_chart_data(self, bot_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Получает данные для графика роста (только новые и активные пользователи, без total_users).
        Оптимизированная версия с минимальным количеством запросов."""
        try:
            logger.info(
                f"📊 Начало получения данных графика для бота {bot_id}: "
                f"период с {start_date.isoformat()} по {end_date.isoformat()}"
            )
            
            # ОПТИМИЗАЦИЯ: Параллельное получение всех необходимых данных
            async def get_new_users():
                query = self.client.table('sales_users').select('telegram_id,created_at')
                if bot_id:
                    query = query.eq('bot_id', bot_id)
                query = query.not_.like('first_name', 'Test%').gte(
                    'created_at', start_date.isoformat()
                ).lte('created_at', end_date.isoformat())
                try:
                    response = query.execute()
                    return response.data or []
                except Exception as e:
                    logger.warning(f"Ошибка получения новых пользователей для графика: {e}")
                    return []
            
            async def get_sessions_and_messages():
                # Получаем сессии за период (без ограничений)
                sessions_query = self.client.table('sales_chat_sessions').select('id,user_id')
                if bot_id:
                    sessions_query = sessions_query.eq('bot_id', bot_id)
                sessions_query = sessions_query.gte('created_at', start_date.isoformat()).lte(
                    'created_at', end_date.isoformat()
                )
                
                try:
                    sessions_response = sessions_query.execute()
                    sessions = sessions_response.data or []
                    session_ids = [s['id'] for s in sessions if s.get('id')]
                    
                    # Получаем сообщения только если есть сессии (без ограничений)
                    active_messages = []
                    if session_ids:
                        # ВАЖНО: Получаем сообщения только из сессий этого бота
                        # Сессии уже отфильтрованы по bot_id, поэтому сообщения тоже будут правильными
                        messages_query = self.client.table('sales_messages').select('session_id,created_at').in_(
                            'session_id', session_ids
                        ).eq('role', 'user').gte('created_at', start_date.isoformat()).lte(
                            'created_at', end_date.isoformat()
                        )
                        
                        try:
                            messages_response = messages_query.execute()
                            active_messages = messages_response.data or []
                        except Exception as e:
                            logger.warning(f"Ошибка получения сообщений для графика: {e}")
                    
                    return sessions, active_messages
                except Exception as e:
                    logger.warning(f"Ошибка получения сессий для графика: {e}")
                    return [], []
            
            # Параллельное выполнение всех запросов
            new_users, (sessions, active_messages) = await asyncio.gather(
                get_new_users(),
                get_sessions_and_messages()
            )
            
            # Получаем пользователей из сессий и фильтруем тестовых (используем ту же логику, что и в get_period_metrics)
            # ВАЖНО: Приводим user_id к строке для консистентности
            user_ids_from_sessions = {str(s.get('user_id')) for s in sessions if s.get('user_id')}
            
            if user_ids_from_sessions:
                # Получаем всех реальных пользователей этого бота (исключая тестовых по first_name)
                real_users_query = self.client.table('sales_users').select('telegram_id')
                if bot_id:
                    real_users_query = real_users_query.eq('bot_id', bot_id)
                real_users_query = real_users_query.not_.like('first_name', 'Test%')
                try:
                    real_users_response = real_users_query.execute()
                    # Приводим telegram_id к строке для консистентности
                    real_user_ids = {str(u['telegram_id']) for u in (real_users_response.data or [])}
                    # Оставляем только тех, кто есть в сессиях И является пользователем этого бота
                    real_user_ids = user_ids_from_sessions & real_user_ids
                    
                    logger.info(
                        f"📊 График для бота {bot_id}: "
                        f"user_id из сессий={len(user_ids_from_sessions)}, "
                        f"реальных пользователей бота={len(real_user_ids)}"
                    )
                except Exception as e:
                    logger.warning(f"Ошибка фильтрации тестовых пользователей: {e}")
                    real_user_ids = user_ids_from_sessions
            else:
                real_user_ids = set()
            
            # Группируем новых пользователей по дням
            daily_new = {}
            for user in new_users:
                if user.get('created_at'):
                    try:
                        user_date = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
                        day_key = user_date.date().isoformat()
                        daily_new[day_key] = daily_new.get(day_key, 0) + 1
                    except (ValueError, AttributeError):
                        continue
            
            # Группируем активных пользователей по дням
            daily_active = {}
            if active_messages:
                active_session_ids = {msg['session_id'] for msg in active_messages}
                session_to_user = {s['id']: s.get('user_id') for s in sessions if s.get('id') and s.get('user_id')}
                
                # real_user_ids уже содержит строки telegram_id пользователей этого бота
                # Получаем уникальные user_id из активных сессий (один user_id может быть в нескольких сессиях)
                for msg in active_messages:
                    session_id = msg.get('session_id')
                    user_id = session_to_user.get(session_id)
                    # Проверяем, что user_id есть в real_user_ids (приводим к строке для сравнения)
                    if user_id and str(user_id) in real_user_ids:
                        if msg.get('created_at'):
                            try:
                                msg_date = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
                                day_key = msg_date.date().isoformat()
                                if day_key not in daily_active:
                                    daily_active[day_key] = set()
                                # Добавляем уникальный user_id в set для этого дня
                                daily_active[day_key].add(str(user_id))
                            except (ValueError, AttributeError):
                                continue
                
                # Логирование для диагностики
                total_active_users_unique = set()
                for users_set in daily_active.values():
                    total_active_users_unique.update(users_set)
                
                logger.info(
                    f"📊 График для бота {bot_id}: "
                    f"всего сообщений={len(active_messages)}, "
                    f"сессий с сообщениями={len(active_session_ids)}, "
                    f"реальных пользователей бота={len(real_user_ids)}, "
                    f"уникальных активных пользователей за весь период={len(total_active_users_unique)}, "
                    f"активных пользователей по дням (сумма)={sum(len(users) for users in daily_active.values())}"
                )
            
            # Формируем данные по дням
            chart_data = []
            current_date = start_date.date()
            end_date_only = end_date.date()
            
            while current_date <= end_date_only:
                day_key = current_date.isoformat()
                active_count = len(daily_active.get(day_key, set()))
                new_count = daily_new.get(day_key, 0)
                chart_data.append({
                    'date': datetime.combine(current_date, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat(),
                    'new_users': new_count,
                    'active_users': active_count
                })
                current_date += timedelta(days=1)
            
            # Логирование итоговых данных графика
            total_new_chart = sum(item['new_users'] for item in chart_data)
            total_active_chart = sum(item['active_users'] for item in chart_data)
            max_active_chart = max((item['active_users'] for item in chart_data), default=0)
            
            logger.info(
                f"📊 Итоговые данные графика для бота {bot_id}: "
                f"дней={len(chart_data)}, "
                f"всего новых={total_new_chart}, "
                f"всего активных={total_active_chart}, "
                f"максимум активных за день={max_active_chart}, "
                f"дней с активными={sum(1 for item in chart_data if item['active_users'] > 0)}, "
                f"пример первых 3 дней={chart_data[:3] if len(chart_data) >= 3 else chart_data}"
            )
            
            return chart_data
            
        except Exception as e:
            logger.error(f"Ошибка получения данных графика для бота {bot_id}: {e}")
            return []
    
    async def get_general_metrics(self, bot_id: str) -> Dict[str, Any]:
        """Получает общие метрики за все время"""
        try:
            # Всего пользователей
            users_query = self.client.table('sales_users').select(
                'telegram_id', 'is_active', 'segments'
            )
            
            # Фильтруем по bot_id если он указан
            if bot_id:
                users_query = users_query.eq('bot_id', bot_id)
            
            # Исключаем тестовых пользователей
            users_query = users_query.not_.like('first_name', 'Test%')
            
            users_response = users_query.execute()
            all_users = users_response.data or []
            
            total_users = len(all_users)
            
            # Заблокированные пользователи (is_active=False)
            blocked_users = sum(1 for u in all_users if not u.get('is_active', True))
            blocked_percentage = (blocked_users / total_users * 100) if total_users > 0 else 0
            
            # Пользователи по сегментам
            segments_count = {}
            users_without_segment = 0
            
            for user in all_users:
                segments_str = user.get('segments')
                # Проверяем, что сегменты не пустые (None, пустая строка или только пробелы)
                if not segments_str or (isinstance(segments_str, str) and segments_str.strip() == ""):
                    users_without_segment += 1
                else:
                    # segments может быть строкой с разделителями (например, "segment1,segment2")
                    segment_list = [s.strip() for s in str(segments_str).split(',') if s.strip()]
                    for segment in segment_list:
                        segments_count[segment] = segments_count.get(segment, 0) + 1
            
            # Формируем список сегментов с процентами
            segments_list = []
            for segment, count in segments_count.items():
                segments_list.append({
                    'segment': segment,
                    'count': count,
                    'percentage': round((count / total_users * 100) if total_users > 0 else 0, 2)
                })
            
            # Добавляем пользователей без сегмента
            if users_without_segment > 0:
                segments_list.append({
                    'segment': 'Без сегмента',
                    'count': users_without_segment,
                    'percentage': round((users_without_segment / total_users * 100) if total_users > 0 else 0, 2)
                })
            
            return {
                'total_users': total_users,
                'blocked_users': blocked_users,
                'blocked_percentage': round(blocked_percentage, 2),
                'segments': segments_list
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения общих метрик для бота {bot_id}: {e}")
            return {
                'total_users': 0,
                'blocked_users': 0,
                'blocked_percentage': 0,
                'segments': []
            }
    
    async def get_period_metrics(self, bot_id: str, days: int) -> Dict[str, Any]:
        """Получает метрики за период с разницей от предыдущего периода (оптимизированная версия)"""
        try:
            now = datetime.now(timezone.utc)
            cutoff_date = now - timedelta(days=days)
            # Для предыдущего периода берем такой же период перед текущим
            previous_cutoff_date = cutoff_date - timedelta(days=days)
            
            # ОПТИМИЗАЦИЯ: Параллельное выполнение запросов для текущего и предыдущего периодов
            async def get_current_period_users():
                query = self.client.table('sales_users').select('telegram_id,created_at,source,medium,campaign')
                if bot_id:
                    query = query.eq('bot_id', bot_id)
                query = query.not_.like('first_name', 'Test%').gte('created_at', cutoff_date.isoformat())
                try:
                    response = query.execute()
                    return response.data or []
                except Exception as e:
                    logger.warning(f"Ошибка получения пользователей текущего периода: {e}")
                    return []
            
            async def get_previous_period_users():
                query = self.client.table('sales_users').select('telegram_id,source,medium,campaign')
                if bot_id:
                    query = query.eq('bot_id', bot_id)
                query = query.not_.like('first_name', 'Test%').gte(
                    'created_at', previous_cutoff_date.isoformat()
                ).lt('created_at', cutoff_date.isoformat())
                try:
                    response = query.execute()
                    return response.data or []
                except Exception as e:
                    logger.warning(f"Ошибка получения пользователей предыдущего периода: {e}")
                    return []
            
            # Параллельное выполнение
            new_users, previous_new_users = await asyncio.gather(
                get_current_period_users(),
                get_previous_period_users()
            )
            
            previous_new_users_count = len(previous_new_users)
            
            # Разница в процентах
            new_users_count = len(new_users)
            new_users_diff_percentage = 0
            if previous_new_users_count > 0:
                new_users_diff_percentage = round(
                    ((new_users_count - previous_new_users_count) / previous_new_users_count * 100), 2
                )
            elif new_users_count > 0:
                new_users_diff_percentage = 100.0
            
            # Новые пользователи по UTM меткам
            utm_stats = {}
            for user in new_users:
                # Формируем ключ UTM из source, medium, campaign
                utm_key = f"{user.get('source', '') or 'direct'}|{user.get('medium', '') or 'none'}|{user.get('campaign', '') or 'none'}"
                if utm_key not in utm_stats:
                    utm_stats[utm_key] = {
                        'source': user.get('source') or 'direct',
                        'medium': user.get('medium') or 'none',
                        'campaign': user.get('campaign') or 'none',
                        'count': 0
                    }
                utm_stats[utm_key]['count'] += 1
            
            # ОПТИМИЗАЦИЯ: Используем уже полученные данные предыдущего периода для UTM
            previous_utm_stats = {}
            for user in previous_new_users:
                utm_key = f"{user.get('source', '') or 'direct'}|{user.get('medium', '') or 'none'}|{user.get('campaign', '') or 'none'}"
                previous_utm_stats[utm_key] = previous_utm_stats.get(utm_key, 0) + 1
            
            # Добавляем разницу в процентах для каждого UTM
            utm_list = []
            for utm_key, stats in utm_stats.items():
                previous_count = previous_utm_stats.get(utm_key, 0)
                diff_percentage = 0
                if previous_count > 0:
                    diff_percentage = round(
                        ((stats['count'] - previous_count) / previous_count * 100), 2
                    )
                elif stats['count'] > 0:
                    diff_percentage = 100.0
                
                utm_list.append({
                    **stats,
                    'diff_percentage': diff_percentage
                })
            
            # Получаем активных пользователей параллельно для текущего и предыдущего периодов
            async def get_active_users_current():
                try:
                    # Получаем сессии за период
                    sessions_query = self.client.table('sales_chat_sessions').select('id,user_id')
                    if bot_id:
                        sessions_query = sessions_query.eq('bot_id', bot_id)
                    sessions_query = sessions_query.gte('created_at', cutoff_date.isoformat())
                    sessions_response = sessions_query.execute()
                    sessions = sessions_response.data or []
                    session_ids = [s['id'] for s in sessions if s.get('id')]
                    
                    if not session_ids:
                        return 0
                    
                    # Получаем сообщения от пользователей
                    messages_query = self.client.table('sales_messages').select('session_id').in_(
                        'session_id', session_ids
                    ).eq('role', 'user').gte('created_at', cutoff_date.isoformat())
                    messages_response = messages_query.execute()
                    active_messages = messages_response.data or []
                    
                    # Получаем уникальных активных пользователей по user_id (не по сессиям!)
                    # Сначала получаем все session_id, которые имеют сообщения от пользователей
                    active_session_ids = {msg['session_id'] for msg in active_messages}
                    
                    # Создаем маппинг session_id -> user_id
                    session_to_user = {s['id']: s.get('user_id') for s in sessions if s.get('id') and s.get('user_id')}
                    
                    # Получаем уникальные user_id из активных сессий (один user_id может быть в нескольких сессиях)
                    active_user_ids = set()
                    for session_id in active_session_ids:
                        user_id = session_to_user.get(session_id)
                        if user_id:
                            # Приводим к строке для консистентности
                            active_user_ids.add(str(user_id))
                    
                    # Фильтруем тестовых пользователей
                    if active_user_ids:
                        real_users_query = self.client.table('sales_users').select('telegram_id')
                        if bot_id:
                            real_users_query = real_users_query.eq('bot_id', bot_id)
                        real_users_query = real_users_query.not_.like('first_name', 'Test%')
                        real_users_response = real_users_query.execute()
                        real_user_ids = {str(u['telegram_id']) for u in (real_users_response.data or [])}
                        active_user_ids = active_user_ids & real_user_ids
                    
                    # Получаем общее количество пользователей бота для проверки
                    total_users_check_query = self.client.table('sales_users').select('telegram_id')
                    if bot_id:
                        total_users_check_query = total_users_check_query.eq('bot_id', bot_id)
                    total_users_check_query = total_users_check_query.not_.like('first_name', 'Test%')
                    total_users_check_response = total_users_check_query.execute()
                    total_users_count_check = len(total_users_check_response.data or [])
                    
                    logger.info(
                        f"📊 Активные пользователи текущего периода для бота {bot_id}: "
                        f"сессий={len(sessions)}, "
                        f"сообщений={len(active_messages)}, "
                        f"уникальных активных user_id={len(active_user_ids)}, "
                        f"всего пользователей бота={total_users_count_check}"
                    )
                    
                    if len(active_user_ids) > total_users_count_check:
                        logger.warning(
                            f"⚠️ ПРОБЛЕМА: Активных пользователей ({len(active_user_ids)}) больше, "
                            f"чем всего пользователей бота ({total_users_count_check})!"
                        )
                    
                    return len(active_user_ids)
                except Exception as e:
                    logger.warning(f"Ошибка получения активных пользователей текущего периода: {e}")
                    return 0
            
            async def get_active_users_previous():
                try:
                    # Получаем сессии за предыдущий период
                    sessions_query = self.client.table('sales_chat_sessions').select('id,user_id')
                    if bot_id:
                        sessions_query = sessions_query.eq('bot_id', bot_id)
                    sessions_query = sessions_query.gte(
                        'created_at', previous_cutoff_date.isoformat()
                    ).lt('created_at', cutoff_date.isoformat())
                    sessions_response = sessions_query.execute()
                    sessions = sessions_response.data or []
                    session_ids = [s['id'] for s in sessions if s.get('id')]
                    
                    if not session_ids:
                        return 0
                    
                    # Получаем сообщения от пользователей
                    messages_query = self.client.table('sales_messages').select('session_id').in_(
                        'session_id', session_ids
                    ).eq('role', 'user').gte(
                        'created_at', previous_cutoff_date.isoformat()
                    ).lt('created_at', cutoff_date.isoformat())
                    messages_response = messages_query.execute()
                    active_messages = messages_response.data or []
                    
                    # Получаем уникальных активных пользователей по user_id (не по сессиям!)
                    # Сначала получаем все session_id, которые имеют сообщения от пользователей
                    active_session_ids = {msg['session_id'] for msg in active_messages}
                    
                    # Создаем маппинг session_id -> user_id
                    session_to_user = {s['id']: s.get('user_id') for s in sessions if s.get('id') and s.get('user_id')}
                    
                    # Получаем уникальные user_id из активных сессий (один user_id может быть в нескольких сессиях)
                    active_user_ids = set()
                    for session_id in active_session_ids:
                        user_id = session_to_user.get(session_id)
                        if user_id:
                            # Приводим к строке для консистентности
                            active_user_ids.add(str(user_id))
                    
                    # Фильтруем тестовых пользователей
                    if active_user_ids:
                        real_users_query = self.client.table('sales_users').select('telegram_id')
                        if bot_id:
                            real_users_query = real_users_query.eq('bot_id', bot_id)
                        real_users_query = real_users_query.not_.like('first_name', 'Test%')
                        real_users_response = real_users_query.execute()
                        real_user_ids = {str(u['telegram_id']) for u in (real_users_response.data or [])}
                        active_user_ids = active_user_ids & real_user_ids
                    
                    return len(active_user_ids)
                except Exception as e:
                    logger.warning(f"Ошибка получения активных пользователей предыдущего периода: {e}")
                    return 0
            
            # Параллельное получение активных пользователей
            active_users_count, previous_active_users_count = await asyncio.gather(
                get_active_users_current(),
                get_active_users_previous()
            )
            
            # Разница в процентах для активных пользователей
            active_users_diff_percentage = 0
            if previous_active_users_count > 0:
                active_users_diff_percentage = round(
                    ((active_users_count - previous_active_users_count) / previous_active_users_count * 100), 2
                )
            elif active_users_count > 0:
                active_users_diff_percentage = 100.0
            
            return {
                'new_users': {
                    'count': new_users_count,
                    'diff_percentage': new_users_diff_percentage
                },
                'new_users_by_utm': utm_list,
                'active_users': {
                    'count': active_users_count,
                    'diff_percentage': active_users_diff_percentage
                }
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения метрик за период для бота {bot_id}: {e}")
            return {
                'new_users': {'count': 0, 'diff_percentage': 0},
                'new_users_by_utm': [],
                'active_users': {'count': 0, 'diff_percentage': 0}
            }
    
    async def get_funnel_breakdown(self, bot_id: str) -> Dict[str, Any]:
        """
        Получает разбивку пользователей по стадиям воронки (с процентами от всего пользователей)
        Пользователи без сессий попадают в категорию "Без стадии"
        """
        try:
            # Получаем всех пользователей (исключая тестовых по first_name, как везде)
            total_users_query = self.client.table("sales_users").select("telegram_id")
            
            if bot_id:
                total_users_query = total_users_query.eq("bot_id", bot_id)
            
            total_users_query = total_users_query.not_.like("first_name", "Test%")
            total_users_response = total_users_query.execute()
            total_users = total_users_response.data if total_users_response.data else []
            total_users_count = len(total_users)
            # Приводим к строке для надежного сравнения
            total_user_ids = {str(u["telegram_id"]) for u in total_users}
            
            logger.info(f"🔍 Воронка для бота {bot_id}: всего пользователей (без тестовых) = {total_users_count}")
            
            # Получаем все сессии (включая завершенные) с текущей стадией
            sessions_query = self.client.table("sales_chat_sessions").select("user_id", "current_stage", "created_at")
            
            if bot_id:
                sessions_query = sessions_query.eq("bot_id", bot_id)
            
            sessions_response = sessions_query.execute()
            all_sessions = sessions_response.data if sessions_response.data else []
            
            logger.info(f"🔍 Воронка для бота {bot_id}: всего сессий = {len(all_sessions)}")
            
            # Исключаем тестовых пользователей из сессий (используем ту же логику)
            test_users_query = self.client.table("sales_users").select("telegram_id").like("first_name", "Test%")
            if bot_id:
                test_users_query = test_users_query.eq("bot_id", bot_id)
            
            test_users_response = test_users_query.execute()
            test_user_ids = {str(u["telegram_id"]) for u in (test_users_response.data or [])}
            
            # Фильтруем сессии: исключаем тестовых пользователей (приводим user_id к строке)
            sessions = [s for s in all_sessions if str(s.get("user_id")) not in test_user_ids]
            
            logger.info(f"🔍 Воронка для бота {bot_id}: сессий после фильтрации тестовых = {len(sessions)}")
            
            # Группируем сессии по пользователям и находим последнюю стадию для каждого
            # Сначала группируем все сессии по user_id (приводим к строке для консистентности)
            user_sessions_dict = {}
            for session in sessions:
                user_id = session.get("user_id")
                if user_id:
                    user_id_str = str(user_id)
                    if user_id_str not in user_sessions_dict:
                        user_sessions_dict[user_id_str] = []
                    user_sessions_dict[user_id_str].append(session)
            
            logger.info(f"🔍 Воронка для бота {bot_id}: уникальных пользователей с сессиями = {len(user_sessions_dict)}")
            
            # Для каждого пользователя берем последнюю сессию (по created_at) и ее стадию
            # Если у пользователя нет сессий или нет стадии, он попадает в начальную стадию
            DEFAULT_STAGE = "introduction"  # Начальная стадия воронки
            
            user_last_stages = {}
            for user_id_str, user_sessions_list in user_sessions_dict.items():
                # Сортируем сессии по дате создания (последняя первая)
                sorted_sessions = sorted(
                    user_sessions_list,
                    key=lambda s: s.get("created_at", ""),
                    reverse=True
                )
                
                # Ищем первую сессию с валидной стадией
                stage_found = False
                for session in sorted_sessions:
                    current_stage = session.get("current_stage")
                    # Проверяем, что стадия не пустая и не None
                    if current_stage and str(current_stage).strip():
                        user_last_stages[user_id_str] = current_stage
                        stage_found = True
                        break  # Берем первую найденную (самую последнюю по дате)
                
                # Если у пользователя есть сессии, но нет валидной стадии, используем начальную стадию
                if not stage_found:
                    user_last_stages[user_id_str] = DEFAULT_STAGE
            
            logger.info(f"🔍 Воронка для бота {bot_id}: пользователей с сессиями (все получили стадию) = {len(user_last_stages)}")
            
            # Пользователи без сессий - они тоже должны попасть в начальную стадию
            users_with_sessions = set(user_last_stages.keys())
            users_without_sessions = total_user_ids - users_with_sessions
            
            # Все пользователи без сессий попадают в начальную стадию
            for user_id_str in users_without_sessions:
                user_last_stages[user_id_str] = DEFAULT_STAGE
            
            logger.info(
                f"🔍 Воронка для бота {bot_id}: "
                f"пользователей без сессий (получили {DEFAULT_STAGE}) = {len(users_without_sessions)}"
            )
            
            # Подсчитываем пользователей по стадиям
            stages_count = {}
            for user_id_str, stage in user_last_stages.items():
                stages_count[stage] = stages_count.get(stage, 0) + 1
            
            # Теперь все пользователи должны быть распределены по стадиям
            users_with_stages = set(user_last_stages.keys())
            users_without_stages = 0  # Больше не может быть пользователей без стадии
            
            # Детальное логирование для диагностики
            logger.info(
                f"🔍 Воронка для бота {bot_id}: "
                f"всего пользователей={len(total_user_ids)}, "
                f"пользователей с сессиями={len(user_sessions_dict)}, "
                f"пользователей распределено по стадиям={len(users_with_stages)}, "
                f"проверка: все пользователи учтены={len(users_with_stages) == len(total_user_ids)}"
            )
            
            # Проверяем, что все пользователи учтены
            if len(total_user_ids) != len(users_with_stages):
                logger.warning(
                    f"⚠️ Несоответствие в воронке для бота {bot_id}: "
                    f"всего пользователей={len(total_user_ids)}, "
                    f"распределено по стадиям={len(users_with_stages)}, "
                    f"разница={len(total_user_ids) - len(users_with_stages)}"
                )
                
                # Дополнительная диагностика: проверяем пересечение множеств
                users_only_in_total = total_user_ids - users_with_stages
                users_only_in_stages = users_with_stages - total_user_ids
                logger.debug(
                    f"🔍 Детализация: "
                    f"пользователи только в total_user_ids={len(users_only_in_total)}, "
                    f"пользователи только в user_last_stages={len(users_only_in_stages)}"
                )
            
            # Формируем результат с процентами
            # Все пользователи уже распределены по стадиям (включая начальную стадию для тех, у кого нет сессий)
            stages_with_percentage = {}
            for stage, count in stages_count.items():
                percentage = (count / total_users_count * 100) if total_users_count > 0 else 0
                stages_with_percentage[stage] = {
                    "count": count,
                    "percentage": round(percentage, 2)
                }
            
            # Проверка: сумма всех должна равняться total_users_count
            total_counted = sum(s["count"] for s in stages_with_percentage.values())
            if total_counted != total_users_count:
                logger.warning(
                    f"⚠️ Несоответствие в подсчете: всего пользователей {total_users_count}, "
                    f"посчитано {total_counted}. Разница: {total_users_count - total_counted}"
                )
            
            # Формируем список стадий в формате breakdown
            funnel_breakdown = []
            for stage, data in stages_with_percentage.items():
                funnel_breakdown.append({
                    'stage': stage,
                    'count': data['count'],
                    'percentage': data['percentage']
                })
            
            return {
                'total_users': total_users_count,
                'breakdown': funnel_breakdown
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения разбивки по стадиям воронки: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'total_users': 0,
                'breakdown': []
            }

# Создание глобального экземпляра
def get_supabase_client(bot_id: str = None) -> SupabaseClient:
    """
    Фабрика для создания клиента Supabase с поддержкой connection pooling
    
    Args:
        bot_id: Идентификатор бота (опционально)
    
    Returns:
        SupabaseClient: Клиент для работы с Supabase
    """
    client = SupabaseClient(bot_id)
    return client


def get_connection_pool_stats() -> Dict[str, Any]:
    """Возвращает статистику пула соединений"""
    pool = _get_connection_pool()
    return pool.get_stats()


async def clear_connection_pool():
    """Очищает пул соединений (полезно для тестов или graceful shutdown)"""
    pool = _get_connection_pool()
    await pool.clear()