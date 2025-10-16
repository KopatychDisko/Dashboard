#!/bin/bash

# Цвета для красивого вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Запуск Telegram Bot Dashboard${NC}"
echo "================================="

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден. Создание из .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}❗ Пожалуйста, заполните переменные окружения в файле .env${NC}"
    echo -e "${YELLOW}Откройте файл .env и заполните:${NC}"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_KEY"
    echo "- TELEGRAM_BOT_TOKEN"
    echo "- TELEGRAM_BOT_USERNAME"
    echo -e "${YELLOW}После заполнения запустите скрипт снова.${NC}"
    exit 1
fi

# Загрузка переменных окружения
source .env

# Проверка обязательных переменных
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ] || [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❗ Не заполнены обязательные переменные окружения в .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Переменные окружения загружены${NC}"

# Функция для запуска бэкенда
start_backend() {
    echo -e "${BLUE}🔧 Запуск бэкенда...${NC}"
    cd backend
    
    # Проверка наличия виртуального окружения
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}📦 Создание виртуального окружения...${NC}"
        python3 -m venv venv
    fi
    
    # Активация виртуального окружения
    source venv/bin/activate
    
    # Установка зависимостей
    echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
    pip install -r requirements.txt
    
    # Запуск сервера
    echo -e "${GREEN}🚀 Запуск FastAPI сервера на http://localhost:8000${NC}"
    python main.py &
    BACKEND_PID=$!
    
    cd ..
}

# Функция для запуска фронтенда
start_frontend() {
    echo -e "${BLUE}🔧 Запуск фронтенда...${NC}"
    cd frontend
    
    # Создание .env файла для фронтенда
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "VITE_API_URL=http://localhost:8000/api" > .env
        echo "VITE_TELEGRAM_BOT_USERNAME=$TELEGRAM_BOT_USERNAME" >> .env
    fi
    
    # Проверка наличия node_modules
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Установка зависимостей Node.js...${NC}"
        npm install
    fi
    
    # Запуск dev сервера
    echo -e "${GREEN}🚀 Запуск React приложения на http://localhost:3000${NC}"
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
}

# Функция для очистки при выходе
cleanup() {
    echo -e "\n${YELLOW}🛑 Остановка серверов...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Обработка сигналов для корректного завершения
trap cleanup SIGINT SIGTERM

# Запуск серверов
start_backend
sleep 3
start_frontend

echo -e "\n${GREEN}✅ Проект запущен!${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend:  http://localhost:8000${NC}"
echo -e "${BLUE}📚 API Docs: http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}Для остановки нажмите Ctrl+C${NC}"

# Ожидание завершения
wait