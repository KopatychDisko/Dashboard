# Dependencies stage
FROM node:18-alpine AS deps

WORKDIR /app

# Устанавливаем зависимости для более быстрой сборки
RUN apk add --no-cache libc6-compat

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей с BuildKit кэшированием
# --mount=type=cache создает кэш между сборками
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Builder stage
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем зависимости из предыдущего этапа
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Очищаем assets и создаем dist
RUN rm -rf /app/public/assets && mkdir -p /app/dist

# Аргументы для сборки (без значений по умолчанию для безопасности)
# Значения передаются через --build-arg при сборке
ARG VITE_API_URL
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_AUTH_URL

# Установка переменных окружения для сборки
# Vite требует эти переменные на этапе сборки, так как они встраиваются в JS код
# Примечание: Эти переменные не являются секретами (публичные URL),
# но для настоящих секретов используйте Docker secrets через --secret
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_TELEGRAM_BOT_USERNAME=${VITE_TELEGRAM_BOT_USERNAME} \
    VITE_AUTH_URL=${VITE_AUTH_URL} \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=8192"

# Оптимизированная сборка
ENV VITE_DISABLE_ESLINT=true \
    BABEL_ENV=production \
    GENERATE_SOURCEMAP=false

# Сборка приложения с оптимизациями
RUN npm run build && \
    # Очищаем node_modules после сборки (они больше не нужны)
    rm -rf node_modules

# Production stage
FROM nginx:alpine

# Создание директории для внешних ассетов
RUN mkdir -p /usr/share/nginx/assets

# Копирование собранного приложения из builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 80

# Создание volume для ассетов
VOLUME /usr/share/nginx/assets

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]