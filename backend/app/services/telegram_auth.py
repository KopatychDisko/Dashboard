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
        try:
            # Извлекаем hash из данных
            received_hash = auth_data.get('hash', '')
            if not received_hash:
                logger.error("Отсутствует hash в данных авторизации")
                return False
            
            # Создаем копию данных без hash
            auth_data_copy = {k: v for k, v in auth_data.items() if k != 'hash'}
            
            # Сортируем ключи и создаем строку для проверки
            data_check_string = '\n'.join([
                f"{k}={v}" for k, v in sorted(auth_data_copy.items())
            ])
            
            logger.debug(f"Data check string: {data_check_string}")
            
            # Создаем секретный ключ из токена бота
            secret_key = hashlib.sha256(settings.TELEGRAM_BOT_TOKEN.encode()).digest()
            
            # Вычисляем HMAC
            calculated_hash = hmac.new(
                secret_key,
                data_check_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            logger.debug(f"Received hash: {received_hash}")
            logger.debug(f"Calculated hash: {calculated_hash}")
            
            # Сравниваем хэши
            is_valid = hmac.compare_digest(calculated_hash, received_hash)
            
            if is_valid:
                logger.info("Telegram авторизация успешно подтверждена")
            else:
                logger.warning("Неверная подпись Telegram авторизации")
            
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