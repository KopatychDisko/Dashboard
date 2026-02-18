import hashlib
import hmac
import logging
from urllib.parse import unquote
from typing import Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

class TelegramAuth:
    """Сервис для аутентификации через Telegram Widget"""
    
    @staticmethod
    def verify_telegram_auth(auth_data: Dict) -> bool:
        """
        Проверяет подпись данных от Telegram Widget
        
        Args:
            auth_data: Данные авторизации от Telegram
            
        Returns:
            bool: True если подпись валидна
        """
        # Для тестового окружения пропускаем проверку подписи
        if settings.ENVIRONMENT != "production":
            logger.info("=" * 80)
            logger.info("🔐 ПРОВЕРКА ПОДПИСИ ПРОПУЩЕНА (тестовое окружение)")
            logger.info("=" * 80)
            logger.info(f"🤖 Окружение: {settings.ENVIRONMENT}")
            logger.info("✅ Для тестового окружения проверка подписи отключена")
            return True
        
        try:
            logger.info("=" * 80)
            logger.info("🔐 НАЧАЛО ПРОВЕРКИ TELEGRAM ПОДПИСИ")
            logger.info("=" * 80)
            
            # Извлекаем hash из данных
            received_hash = auth_data.get('hash', '')
            if not received_hash:
                logger.error("❌ Отсутствует hash в данных авторизации")
                return False
            
            logger.info(f"📥 Полученный hash от Telegram: {received_hash}")
            
            # Создаем копию данных без hash
            auth_data_copy = {k: v for k, v in auth_data.items() if k != 'hash'}
            logger.info(f"📋 Данные для проверки (без hash): {auth_data_copy}")
            
            # ВАЖНО: Все значения должны быть строками для правильной проверки подписи
            # Telegram требует, чтобы все значения в data_check_string были строками
            auth_data_strings = {}
            for k, v in auth_data_copy.items():
                if v is None:
                    continue  # Пропускаем None значения
                # Преобразуем все значения в строки
                auth_data_strings[k] = str(v)
            
            logger.info(f"📋 Данные для проверки (все строки): {auth_data_strings}")
            
            # Сортируем ключи и создаем строку для проверки
            # Формат: key1=value1\nkey2=value2\n...
            data_check_string = '\n'.join([
                f"{k}={v}" for k, v in sorted(auth_data_strings.items())
            ])
            
            logger.info(f"📝 Data check string:\n{data_check_string}")
            logger.info(f"📝 Data check string (repr): {repr(data_check_string)}")
            
            # Проверяем токен бота
            bot_token = settings.TELEGRAM_BOT_TOKEN
            bot_username = settings.TELEGRAM_BOT_USERNAME
            logger.info(f"🤖 Используемый бот: {bot_username}")
            logger.info(f"🤖 Окружение: {settings.ENVIRONMENT}")
            
            # Предупреждение, если используется неправильный бот для окружения
            if settings.ENVIRONMENT != "production" and bot_username != "test_dahboard_bot":
                logger.warning(f"⚠️ ВНИМАНИЕ: Для тестового окружения ожидается бот 'test_dahboard_bot', но используется '{bot_username}'")
                logger.warning(f"⚠️ Убедитесь, что в .env указан TELEGRAM_BOT_TOKEN_DEV и TELEGRAM_BOT_USERNAME_DEV")
            
            logger.info(f"🤖 BOT_TOKEN длина: {len(bot_token)} символов")
            logger.info(f"🤖 BOT_TOKEN первые 10 символов: {bot_token[:10]}...")
            logger.info(f"🤖 BOT_TOKEN последние 5 символов: ...{bot_token[-5:]}")
            
            # Создаем секретный ключ из токена бота
            logger.info("🔨 Создаем SHA256 хеш от токена бота...")
            secret_key = hashlib.sha256(bot_token.encode()).digest()
            logger.info(f"🔑 Secret key (hex первые 20 байт): {secret_key[:20].hex()}")
            
            # Вычисляем HMAC
            logger.info("🔨 Вычисляем HMAC-SHA256...")
            calculated_hash = hmac.new(
                secret_key,
                data_check_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            logger.info(f"🔢 Вычисленный hash: {calculated_hash}")
            logger.info(f"📥 Полученный hash:  {received_hash}")
            
            # Сравниваем хэши
            is_valid = hmac.compare_digest(calculated_hash, received_hash)
            
            if is_valid:
                logger.info("✅ ПОДПИСИ СОВПАДАЮТ! Авторизация валидна")
            else:
                logger.warning("❌ ПОДПИСИ НЕ СОВПАДАЮТ! Авторизация невалидна")
                logger.warning(f"❌ Разница: expected={calculated_hash}, got={received_hash}")
            
            logger.info("=" * 80)
            return is_valid
            
        except Exception as e:
            logger.error(f"Ошибка при проверке Telegram авторизации: {e}")
            return False
    
    @staticmethod
    def check_auth_date(auth_date: int, max_age_minutes: int = 60) -> bool:
        """
        Проверяет актуальность времени авторизации
        
        Args:
            auth_date: Время авторизации (timestamp)
            max_age_minutes: Максимальный возраст в минутах
            
        Returns:
            bool: True если авторизация не устарела
        """
        import time
        
        current_time = int(time.time())
        auth_age_seconds = current_time - auth_date
        max_age_seconds = max_age_minutes * 60
        
        is_valid = auth_age_seconds <= max_age_seconds
        
        if not is_valid:
            logger.warning(f"Авторизация устарела: {auth_age_seconds}s > {max_age_seconds}s")
        
        return is_valid
    
    @staticmethod
    def extract_user_data(auth_data: Dict) -> Dict:
        """
        Извлекает данные пользователя из данных авторизации
        
        Args:
            auth_data: Данные авторизации от Telegram
            
        Returns:
            Dict: Очищенные данные пользователя
        """
        return {
            'telegram_id': int(auth_data.get('id', 0)),
            'first_name': auth_data.get('first_name', ''),
            'last_name': auth_data.get('last_name'),
            'username': auth_data.get('username'),
            'photo_url': auth_data.get('photo_url'),
            'auth_date': int(auth_data.get('auth_date', 0))
        }