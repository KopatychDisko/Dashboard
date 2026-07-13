# Telegram Bot Dashboard

Веб-дашборд для аналитики Telegram-ботов: вход через Telegram Login Widget, выбор бота, метрики пользователей, воронка продаж, история диалогов.

## Что это

Проект состоит из двух частей:

| Часть | Стек | Назначение |
|-------|------|------------|
| **backend/** | Python, FastAPI, Supabase | REST API, авторизация, агрегация метрик из БД |
| **frontend/** | React, Vite, Tailwind, Recharts | SPA с графиками и таблицами |

Данные хранятся в **Supabase** (PostgreSQL). Бэкенд читает таблицы продажного бота:

- `sales_admins` — привязка Telegram-пользователя к ботам
- `sales_users` — пользователи бота
- `sales_chat_sessions` — сессии чатов, стадии воронки
- `sales_messages` — сообщения в сессиях

## Возможности

- Вход через [Telegram Login Widget](https://core.telegram.org/widgets/login)
- Список ботов, к которым у пользователя есть доступ
- Дашборд метрик: пользователи, сегменты, воронка, активность за период
- Графики роста и фильтры по периоду / сегментам / стадиям воронки
- История диалогов с экспортом в CSV
- Docker-сборка для локальной разработки и production

## Быстрый старт (Docker)

### 1. Клонирование и настройка

```bash
git clone https://github.com/KopatychDisko/Dashboard.git
cd Dashboard

cp .env.example .env
# Заполните .env — см. раздел «Переменные окружения»
```

Для локальной разработки фронтенда без пересборки Docker-образа:

```bash
cp frontend/.env.example frontend/.env
# Укажите VITE_TELEGRAM_BOT_USERNAME и VITE_AUTH_URL
```

### 2. Telegram-бот для входа

1. Создайте бота через [@BotFather](https://t.me/BotFather).
2. В BotFather: `/setdomain` → укажите домен сайта (для localhost используйте туннель вроде ngrok).
3. Скопируйте токен в `.env` → `TELEGRAM_BOT_TOKEN`.
4. Имя бота (без `@`) — в `TELEGRAM_BOT_USERNAME` и `VITE_TELEGRAM_BOT_USERNAME`.

### 3. Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. В Settings → API скопируйте URL и ключ (service role или anon — в зависимости от вашей схемы доступа).
3. Убедитесь, что в БД есть таблицы `sales_*` и записи в `sales_admins` для вашего Telegram ID.

### 4. Запуск

```bash
docker compose up --build
```

| Сервис | URL |
|--------|-----|
| Фронтенд | http://127.0.0.1 |
| API | http://127.0.0.1:8000 |
| Health check | http://127.0.0.1:8000/health |

## Локальная разработка без Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# .env в корне проекта (backend подхватывает ../.env через pydantic-settings)
cd ..
cp .env.example .env
# заполните .env

cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api

npm run dev
```

Фронтенд: http://localhost:5173

## Переменные окружения

### Корневой `.env` (backend + docker compose)

| Переменная | Описание |
|------------|----------|
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_KEY` | API-ключ Supabase |
| `TELEGRAM_BOT_TOKEN` | Токен бота для проверки подписи Login Widget |
| `TELEGRAM_BOT_USERNAME` | Username бота без `@` |
| `SECRET_KEY` | Секрет приложения (`openssl rand -hex 32`) |
| `FRONTEND_URL` | URL фронтенда для CORS |
| `ENVIRONMENT` | `development` — подпись Telegram не проверяется; `production` — проверяется |
| `CORS_ORIGINS` | Разрешённые origins через запятую (опционально) |

### `frontend/.env` (сборка Vite)

| Переменная | Описание |
|------------|----------|
| `VITE_TELEGRAM_BOT_USERNAME` | Username бота для виджета входа |
| `VITE_API_URL` | URL API, например `http://localhost:8000/api` |
| `VITE_AUTH_URL` | URL редиректа после входа, например `http://127.0.0.1/bots` |

Шаблоны: [.env.example](.env.example), [frontend/.env.example](frontend/.env.example).

## Production

```bash
# В .env задайте production-значения, включая:
# FRONTEND_URL, CORS_ORIGINS, VITE_API_URL, VITE_TELEGRAM_BOT_USERNAME, VITE_AUTH_URL

docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Внешний nginx (SSL, домен) — пример в [nginx.conf.example](nginx.conf.example).

### GitHub Actions

Workflow [.github/workflows/docker.yaml](.github/workflows/docker.yaml) собирает образы и деплоит на VPS. Нужны secrets:

- `DOCKER_USERNAME`, `DOCKER_TOKEN`
- `VITE_API_URL`, `VITE_TELEGRAM_BOT_USERNAME`, `VITE_AUTH_URL`
- `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`

## Архитектура

```
Пользователь → Telegram Login Widget → Frontend (React)
                    ↓
              POST /api/auth/telegram
                    ↓
              Backend (FastAPI) → Supabase
                    ↓
              Cookie telegram_id → доступ к /api/bots, /api/analytics
```

### Основные маршруты фронтенда

| Путь | Страница |
|------|----------|
| `/login` | Вход через Telegram |
| `/bots` | Выбор бота |
| `/dashboard/:botId` | Дашборд метрик |
| `/dialog-history/:botId` | История диалогов |
| `/account-switch` | Инструкция смены Telegram-аккаунта |

### API

| Endpoint | Описание |
|----------|----------|
| `POST /api/auth/telegram` | Авторизация через Telegram Widget |
| `GET /api/auth/me` | Текущий пользователь (из cookie) |
| `GET /api/bots/{telegram_id}` | Список ботов пользователя |
| `GET /api/analytics/{bot_id}/dashboard` | Сводные метрики |
| `GET /api/analytics/{bot_id}/detailed-metrics` | Детальные метрики дашборда |
| `GET /health` | Проверка состояния сервиса и БД |

Подробнее о метриках: [METRICS_FUNCTIONS.md](METRICS_FUNCTIONS.md).

## Структура репозитория

```
Dashboard/
├── backend/
│   └── app/
│       ├── api/          # auth, bots, analytics
│       ├── core/         # config, cache, validators
│       ├── database/     # Supabase client
│       ├── middleware/   # rate limit, CORS headers, logging
│       └── services/     # Telegram auth
├── frontend/
│   └── src/
│       ├── pages/        # Login, Dashboard, DialogHistory, ...
│       └── components/   # Графики, таблицы, фильтры
├── docker-compose.yml
├── docker-compose.prod.yml
└── nginx.conf.example
```

## Безопасность

- **Не коммитьте** `.env` — только `.env.example`.
- В `production` включена проверка подписи Telegram; в `development` она отключена для удобства локальной отладки.
- Сессия хранится в httpOnly-cookie `telegram_id`.
- Если репозиторий ранее был приватным с закоммиченными ключами — **обязательно ротируйте**:
  - токен бота в [@BotFather](https://t.me/BotFather) (`/revoke`);
  - ключи Supabase в панели проекта.

## Устранение неполадок

| Проблема | Решение |
|----------|---------|
| Виджет Telegram не появляется | Проверьте `VITE_TELEGRAM_BOT_USERNAME`, домен в BotFather, CSP |
| 401 / пустой список ботов | Убедитесь, что ваш `telegram_id` есть в `sales_admins` |
| CORS-ошибки | Добавьте URL фронтенда в `CORS_ORIGINS` и `FRONTEND_URL` |
| API недоступен из Docker | Фронтенд в Docker проксирует `/api/` на `backend:8000` через nginx |

## Лицензия

Открытый исходный код. Используйте на свой страх и риск.
