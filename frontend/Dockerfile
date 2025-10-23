# Dependencies stage
FROM node:18-alpine AS deps

WORKDIR /app

# Устанавливаем зависимости для более быстрой сборки
RUN apk add --no-cache libc6-compat

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей с кэшированием
RUN npm ci --prefer-offline --no-audit

# Builder stage
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем зависимости из предыдущего этапа
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Очищаем assets и создаем dist
RUN rm -rf /app/public/assets && mkdir -p /app/dist

# Аргументы для сборки
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_TELEGRAM_BOT_USERNAME=DashBoardMetricksBot

# Установка переменных окружения для сборки
ENV VITE_API_URL=$VITE_API_URL \
    VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=8192"

# Оптимизированная сборка
ENV VITE_DISABLE_ESLINT=true \
    BABEL_ENV=production \
    GENERATE_SOURCEMAP=false

# Сборка приложения с оптимизациями
RUN npm run build

# Production stage
FROM nginx:alpine

# Создание директории для внешних ассетов
RUN mkdir -p /usr/share/nginx/assets

# Копирование собранного приложения из builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 8080

# Создание volume для ассетов
VOLUME /usr/share/nginx/assets

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]