# Настройка проекта для локальной разработки и продакшена

## Локальная разработка

### 1. Настройка домена в BotFather

1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/setdomain`
3. Выберите вашего бота (`DashBoardMetricksBot`)
4. Укажите домен: `127.0.0.1` (без порта!)

### 2. Запуск приложения

```bash
# Используйте обычный docker-compose.yml (для локальной разработки)
docker-compose down
docker-compose up -d --build
```

### 3. Открытие приложения

Откройте браузер и перейдите по адресу:
```
http://127.0.0.1
```

**Важно:** Используйте именно `http://127.0.0.1` (без порта), а не `localhost` или `127.0.0.1:8080`

## Продакшен

### 1. Настройка домена в BotFather

1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/setdomain`
3. Выберите вашего бота (`DashBoardMetricksBot`)
4. Укажите домен: `dshb.lemifar.ru`

### 2. Запуск приложения

```bash
# Используйте docker-compose.prod.yml для продакшена
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Открытие приложения

Приложение будет доступно по адресу:
```
https://dshb.lemifar.ru
```

## Переключение между режимами

### Локальная разработка:
```bash
docker-compose up -d --build
```
- Frontend: `http://127.0.0.1` (порт 80)
- Backend API: `http://127.0.0.1:8000/api`
- Telegram виджет: `http://127.0.0.1/bots`

### Продакшен:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
- Frontend: `https://dshb.lemifar.ru`
- Backend API: `https://dshb.lemifar.ru/api`
- Telegram виджет: `https://dshb.lemifar.ru/bots`

## Важные замечания

1. **Порт 80 на Windows:** Для использования порта 80 может потребоваться запуск Docker Desktop от имени администратора
2. **Домены в BotFather:** Нужно настроить оба домена (`127.0.0.1` для локальной разработки и `dshb.lemifar.ru` для продакшена)
3. **URL формируется автоматически:** Код автоматически определяет правильный URL для `data-auth-url` в зависимости от текущего домена

## Проверка

После настройки Telegram виджет должен:
- Загружаться без ошибок CSP
- Показывать кнопку "Log in with Telegram"
- Работать при нажатии
- Правильно редиректить на `/bots` после авторизации

