# Build stage
FROM node:18-alpine AS build

# Устанавливаем зависимости для более быстрой сборки
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей с использованием cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit

# Копирование исходного кода (без assets)
COPY . .
RUN rm -rf /app/public/assets && mkdir -p /app/dist

# Аргументы для сборки
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_TELEGRAM_BOT_USERNAME=DashBoardMetricksBot

# Установка переменных окружения для сборки
ENV VITE_API_URL=$VITE_API_URL \
    VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096"

# Сборка приложения с использованием cache mount для node_modules
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/node_modules/.vite \
    npm run build

# Production stage
FROM nginx:alpine

# Создание директории для внешних ассетов
RUN mkdir -p /usr/share/nginx/assets

# Копирование собранного приложения из build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 8080

# Создание volume для ассетов
VOLUME /usr/share/nginx/assets

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
