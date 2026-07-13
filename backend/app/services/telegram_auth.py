import hashlib
import hmac
import logging
from typing import Dict

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
        if settings.ENVIRONMENT != "production":
            logger.info("Проверка подписи Telegram пропущена (окружение: %s)", settings.ENVIRONMENT)
            return True
        
        try:
            received_hash = auth_data.get('hash', '')
            if not received_hash:
                logger.error("Отсутствует hash в данных авторизации")
                return False
            
            auth_data_copy = {k: v for k, v in auth_data.items() if k != 'hash'}
            
            auth_data_strings = {}
            for k, v in auth_data_copy.items():
                if v is None:
                    continue
                auth_data_strings[k] = str(v)
            
            data_check_string = '\n'.join([
                f"{k}={v}" for k, v in sorted(auth_data_strings.items())
            ])
            
            bot_token = settings.TELEGRAM_BOT_TOKEN
            secret_key = hashlib.sha256(bot_token.encode()).digest()
            
            calculated_hash = hmac.new(
                secret_key,
                data_check_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            is_valid = hmac.compare_digest(calculated_hash, received_hash)
            
            if not is_valid:
                logger.warning("Невалидная подпись Telegram для пользователя %s", auth_data.get('id'))
            
            return is_valid
            
        except Exception as e:
            logger.error("Ошибка при проверке Telegram авторизации: %s", e)
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
