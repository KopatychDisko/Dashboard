# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка ВСЕХ зависимостей (production + dev для сборки)
RUN npm ci

# Копирование исходного кода (без assets)
COPY . .
RUN rm -rf /app/public/assets && mkdir -p /app/dist

# Аргументы для сборки
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_TELEGRAM_BOT_USERNAME=DashBoardMetricksBot

# Установка переменных окружения для сборки
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME

# Сборка приложения
RUN npm run build

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
