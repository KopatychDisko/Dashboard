# Функции метрик и их соответствие карточкам дашборда

## Обзор

Документ описывает все функции, связанные с метриками в бэкенде, и их соответствие карточкам на фронтенде.

---

## API Endpoints

### 1. `/api/analytics/{bot_id}/detailed-metrics`

**Описание:** Основной эндпоинт для получения детальных метрик дашборда.

**Вызываемые функции:**
- `get_general_metrics(bot_id)` - общие метрики за все время
- `get_period_metrics(bot_id, days)` - метрики за период
- `get_funnel_breakdown(bot_id)` - разбивка по стадиям воронки
- `_get_chart_data(bot_id, start_date, end_date)` - данные для графика роста

**Возвращает:**
```json
{
  "general_metrics": {...},
  "period_metrics": {...},
  "funnel_breakdown": {...},
  "user_growth_chart": [...]
}
```

### 2. `/api/analytics/{bot_id}/dashboard`

**Описание:** Эндпоинт для получения метрик дашборда (используется для активных сегодня).

**Вызываемые функции:**
- `get_dashboard_metrics(bot_id, days)` - метрики дашборда
- `get_funnel_stats(bot_id, days)` - статистика воронки
- `get_user_growth_data(bot_id, days, base_total)` - данные роста пользователей

---

## Функции метрик в `supabase_client.py`

### 1. `get_general_metrics(bot_id: str) -> Dict[str, Any]`

**Описание:** Получает общие метрики за все время работы бота.

**Что считает:**
- Всего пользователей (исключая тестовых по `first_name LIKE 'Test%'`)
- Заблокированные пользователи (`is_active=False`)
- Процент заблокированных
- Пользователи по сегментам (из поля `segments`)

**Возвращает:**
```python
{
    'total_users': int,
    'blocked_users': int,
    'blocked_percentage': float,
    'segments': [
        {
            'segment': str,
            'count': int,
            'percentage': float
        }
    ]
}
```

**Соответствие карточкам:**
- ✅ **"Всего пользователей"** → `general_metrics.total_users`
- ✅ **"Заблокировали бота"** → `general_metrics.blocked_users` и `general_metrics.blocked_percentage`
- ✅ **"Пользователи по сегментам"** (круговая диаграмма и таблица) → `general_metrics.segments`

**Таблицы БД:**
- `sales_users` (поля: `telegram_id`, `is_active`, `segments`, `first_name`, `bot_id`)

---

### 2. `get_period_metrics(bot_id: str, days: int) -> Dict[str, Any]`

**Описание:** Получает метрики за указанный период с сравнением с предыдущим периодом.

**Что считает:**
- Новые пользователи за период (с разницей в процентах от предыдущего периода)
- Новые пользователи по UTM меткам (`source`, `medium`, `campaign`)
- Активные пользователи за период (с разницей в процентах от предыдущего периода)

**Внутренние функции:**
- `get_current_period_users()` - пользователи текущего периода
- `get_previous_period_users()` - пользователи предыдущего периода
- `get_active_users_current()` - активные пользователи текущего периода
- `get_active_users_previous()` - активные пользователи предыдущего периода

**Возвращает:**
```python
{
    'new_users': {
        'count': int,
        'diff_percentage': float
    },
    'new_users_by_utm': [
        {
            'source': str,
            'medium': str,
            'campaign': str,
            'count': int,
            'diff_percentage': float
        }
    ],
    'active_users': {
        'count': int,
        'diff_percentage': float
    }
}
```

**Соответствие карточкам:**
- ✅ **"Новых пользователей"** → `period_metrics.new_users.count` и `period_metrics.new_users.diff_percentage`
- ✅ **"Активных за период"** → `period_metrics.active_users.count` и `period_metrics.active_users.diff_percentage`

**Таблицы БД:**
- `sales_users` (поля: `telegram_id`, `created_at`, `source`, `medium`, `campaign`, `first_name`, `bot_id`)
- `sales_chat_sessions` (поля: `id`, `user_id`, `bot_id`, `created_at`)
- `sales_messages` (поля: `session_id`, `role`, `created_at`)

**Логика подсчета активных:**
1. Получает все сессии за период
2. Получает сообщения от пользователей (`role='user'`) в этих сессиях за период
3. Создает маппинг `session_id -> user_id`
4. Получает уникальные `user_id` из активных сессий
5. Фильтрует тестовых пользователей (`first_name NOT LIKE 'Test%'`)
6. Возвращает количество уникальных активных `user_id`

---

### 3. `get_funnel_breakdown(bot_id: str) -> Dict[str, Any]`

**Описание:** Получает разбивку пользователей по стадиям воронки продаж.

**Что считает:**
- Всех пользователей бота (исключая тестовых)
- Распределяет пользователей по стадиям воронки (`current_stage` из сессий)
- Пользователи без сессий или без валидной стадии попадают в стадию `"introduction"`

**Логика:**
1. Получает всех пользователей бота (исключая тестовых)
2. Получает все сессии с `current_stage`
3. Для каждого пользователя берет последнюю сессию (по `created_at`)
4. Если у пользователя нет сессий или нет валидной стадии → стадия `"introduction"`
5. Подсчитывает пользователей по стадиям
6. Вычисляет проценты от общего количества пользователей

**Возвращает:**
```python
{
    'total_users': int,
    'breakdown': [
        {
            'stage': str,  # 'introduction', 'interest', 'consideration', 'intent', 'purchase'
            'count': int,
            'percentage': float
        }
    ]
}
```

**Соответствие карточкам:**
- ✅ **"Разбивка пользователей по стадиям воронки"** (таблица и круговая диаграмма) → `funnel_breakdown.breakdown`

**Таблицы БД:**
- `sales_users` (поля: `telegram_id`, `first_name`, `bot_id`)
- `sales_chat_sessions` (поля: `user_id`, `current_stage`, `created_at`, `bot_id`)

---

### 4. `_get_chart_data(bot_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]`

**Описание:** Получает данные для графика роста пользователей по дням.

**Что считает:**
- Новые пользователи по дням (из `sales_users.created_at`)
- Активные пользователи по дням (из сообщений пользователей в сессиях)

**Внутренние функции:**
- `get_new_users()` - новые пользователи за период
- `get_sessions_and_messages()` - сессии и сообщения за период

**Логика подсчета активных:**
1. Получает все сессии за период
2. Получает сообщения от пользователей (`role='user'`) в этих сессиях за период
3. Создает маппинг `session_id -> user_id`
4. Группирует активных пользователей по дням (по `created_at` сообщения)
5. Фильтрует тестовых пользователей
6. Возвращает уникальных `user_id` для каждого дня

**Возвращает:**
```python
[
    {
        'date': str,  # ISO формат даты
        'new_users': int,
        'active_users': int
    },
    ...
]
```

**Соответствие карточкам:**
- ✅ **"График роста пользователей"** → `user_growth_chart` (массив данных по дням)

**Таблицы БД:**
- `sales_users` (поля: `telegram_id`, `created_at`, `first_name`, `bot_id`)
- `sales_chat_sessions` (поля: `id`, `user_id`, `bot_id`, `created_at`)
- `sales_messages` (поля: `session_id`, `role`, `created_at`)

---

### 5. `get_dashboard_metrics(bot_id: str, days: int = 7) -> Dict[str, Any]`

**Описание:** Получает метрики для дашборда (используется для карточки "Активных сегодня").

**Что считает:**
- Всего пользователей
- Новые пользователи за период
- Активные пользователи сегодня (уникальные сессии с сообщениями от пользователей сегодня)
- Всего сессий за период

**Внутренние функции:**
- `get_users()` - все пользователи бота
- `get_sessions()` - сессии за период

**Логика подсчета активных сегодня:**
1. Получает все сессии за период
2. Получает сообщения от пользователей (`role='user'`) сегодня в этих сессиях
3. Считает уникальные `session_id` (один пользователь = одна сессия)
4. Возвращает количество уникальных сессий

**Возвращает:**
```python
{
    'total_revenue': float,  # TODO: не реализовано
    'new_users': int,
    'conversion_rate': float,  # TODO: не реализовано
    'average_check': float,  # TODO: не реализовано
    'ltv': float,  # TODO: не реализовано
    'active_today': int,
    'total_users': int,
    'total_sessions': int,
    'period_days': int
}
```

**Соответствие карточкам:**
- ✅ **"Активных сегодня"** → `analytics.metrics.active_today`

**Таблицы БД:**
- `sales_users` (поля: `telegram_id`, `created_at`, `first_name`, `bot_id`)
- `sales_chat_sessions` (поля: `id`, `user_id`, `current_stage`, `created_at`, `bot_id`)
- `sales_messages` (поля: `session_id`, `role`, `created_at`)

---

### 6. `get_funnel_stats(bot_id: str, days: int = 7) -> Dict[str, Any]`

**Описание:** Получает статистику воронки продаж за период (используется в эндпоинте `/dashboard`).

**Примечание:** Эта функция используется в другом эндпоинте и не отображается на основном дашборде.

**Таблицы БД:**
- `sales_chat_sessions` (поля: `user_id`, `current_stage`, `created_at`, `bot_id`)

---

### 7. `get_user_growth_data(bot_id: str, days: int = 7, base_total: int = 0) -> List[Dict[str, Any]]`

**Описание:** Получает данные роста пользователей с накопительным итогом (используется в эндпоинте `/dashboard`).

**Примечание:** Эта функция используется в другом эндпоинте и не отображается на основном дашборде.

**Таблицы БД:**
- `sales_users` (поля: `telegram_id`, `created_at`, `first_name`, `bot_id`)

---

## Сводная таблица соответствия функций и карточек

| Карточка на фронтенде | Функция бэкенда | Путь к данным |
|----------------------|----------------|---------------|
| **Всего пользователей** | `get_general_metrics()` | `detailedMetrics.general_metrics.total_users` |
| **Заблокировали бота** | `get_general_metrics()` | `detailedMetrics.general_metrics.blocked_users` и `blocked_percentage` |
| **Пользователи по сегментам** (диаграмма) | `get_general_metrics()` | `detailedMetrics.general_metrics.segments` |
| **Пользователи по сегментам** (таблица) | `get_general_metrics()` | `detailedMetrics.general_metrics.segments` |
| **Разбивка по стадиям воронки** (таблица) | `get_funnel_breakdown()` | `detailedMetrics.funnel_breakdown.breakdown` |
| **Разбивка по стадиям воронки** (диаграмма) | `get_funnel_breakdown()` | `detailedMetrics.funnel_breakdown.breakdown` |
| **Новых пользователей** | `get_period_metrics()` | `detailedMetrics.period_metrics.new_users.count` и `diff_percentage` |
| **Активных за период** | `get_period_metrics()` | `detailedMetrics.period_metrics.active_users.count` и `diff_percentage` |
| **Активных сегодня** | `get_dashboard_metrics()` | `analytics.metrics.active_today` |
| **График роста пользователей** | `_get_chart_data()` | `detailedMetrics.user_growth_chart` |

---

## Важные замечания

### Фильтрация тестовых пользователей

**Везде используется единая логика:** `first_name NOT LIKE 'Test%'`

### Приведение типов

**Важно:** Для консистентного сравнения `user_id` и `telegram_id` приводятся к строкам (`str()`), так как в БД они могут быть разных типов (int, str).

### Подсчет активных пользователей

**Разница между функциями:**
- `get_dashboard_metrics()` - считает активных **сегодня** по уникальным `session_id`
- `get_period_metrics()` - считает активных **за период** по уникальным `user_id`
- `_get_chart_data()` - считает активных **по дням** по уникальным `user_id`

### Пользователи без стадии воронки

**Логика:** Все пользователи без сессий или без валидной стадии автоматически попадают в стадию `"introduction"`. Пользователей без стадии быть не может.

---

## Структура данных на фронтенде

### `detailedMetrics` (из `/api/analytics/{bot_id}/detailed-metrics`)

```javascript
{
  general_metrics: {
    total_users: number,
    blocked_users: number,
    blocked_percentage: number,
    segments: Array<{
      segment: string,
      count: number,
      percentage: number
    }>
  },
  period_metrics: {
    new_users: {
      count: number,
      diff_percentage: number
    },
    active_users: {
      count: number,
      diff_percentage: number
    },
    new_users_by_utm: Array<{...}>
  },
  funnel_breakdown: {
    total_users: number,
    breakdown: Array<{
      stage: string,
      count: number,
      percentage: number
    }>
  },
  user_growth_chart: Array<{
    date: string,
    new_users: number,
    active_users: number
  }>
}
```

### `analytics` (из `/api/analytics/{bot_id}/dashboard`)

```javascript
{
  metrics: {
    active_today: number,
    total_users: number,
    new_users: number,
    total_sessions: number,
    ...
  }
}
```

