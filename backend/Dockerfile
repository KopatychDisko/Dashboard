# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Установка build-time зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .

# Создание виртуального окружения и установка зависимостей
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Установка и кэширование wheel
RUN pip install --no-cache-dir wheel && \
    pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Копирование виртуального окружения из builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Создание непривилегированного пользователя и директории для логов
RUN adduser --disabled-password --gecos '' appuser && \
    mkdir -p /app/logs && \
    chown -R appuser:appuser /app/logs

# Копирование кода приложения
COPY . .

# Установка владельца для всего приложения
RUN chown -R appuser:appuser /app
USER appuser

# Открытие порта
EXPOSE 8000

# Запуск приложения с production настройками
# Используем переменную окружения WORKERS для количества воркеров (по умолчанию 4)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WORKERS:-4} --timeout-keep-alive 5 --no-access-log"]