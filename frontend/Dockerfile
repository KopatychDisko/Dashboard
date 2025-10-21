# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка ВСЕХ зависимостей (production + dev для сборки)
RUN npm ci

# Копирование исходного кода
COPY . .

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

# Копирование собранного приложения из build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 8080

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
