# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка ВСЕХ зависимостей (production + dev для сборки)
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Production stage
FROM nginx:alpine

# Копирование собранного приложения из build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
