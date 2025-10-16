# Исправление проблемы с отображением Frontend в Docker

## Проблема
При запуске через `docker-compose` сайт отображался без стилей - только текст, компоненты не работали.

## Причины
1. **Переменные окружения VITE_* передавались после сборки** - Vite встраивает переменные окружения во время `npm run build`, а не во время запуска контейнера
2. **MIME типы не были явно настроены в nginx** - могли загружаться CSS/JS файлы с неправильным Content-Type
3. **Отсутствовал .env файл** для production сборки

## Исправления

### 1. Frontend Dockerfile
Добавлены ARG и ENV переменные для сборки:
```dockerfile
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_TELEGRAM_BOT_USERNAME=DashBoardMetricksBot
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
```

### 2. docker-compose.yml
Переменные перенесены в `build.args`:
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      - VITE_API_URL=http://localhost:8000/api
      - VITE_TELEGRAM_BOT_USERNAME=DashBoardMetricksBot
```

### 3. nginx.conf
Добавлено явное указание MIME типов для корректной загрузки CSS/JS

## Как пересобрать

```bash
# Остановить контейнеры
docker-compose down

# Пересобрать frontend с очисткой кеша
docker-compose build --no-cache frontend

# Запустить заново
docker-compose up -d

# Проверить логи
docker-compose logs -f frontend
```

## Проверка
После пересборки откройте http://localhost:3000 и проверьте:
1. Стили применяются
2. Компоненты отрисовываются корректно
3. В консоли браузера нет ошибок загрузки CSS/JS
4. В DevTools → Network все файлы загружаются с правильным Content-Type

## Дополнительно
Если проблема сохраняется, проверьте:
```bash
# Войти в контейнер
docker exec -it <container_id> sh

# Проверить содержимое
ls -la /usr/share/nginx/html/
ls -la /usr/share/nginx/html/assets/

# Проверить что файлы собраны
cat /usr/share/nginx/html/index.html
```

