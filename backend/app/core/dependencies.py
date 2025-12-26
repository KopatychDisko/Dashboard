"""
Dependencies для FastAPI - проверка авторизации и доступа
"""
import logging
from fastapi import HTTPException, Request, Depends
from typing import Optional, Callable

from app.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

async def get_current_user_id(request: Request) -> Optional[int]:
    """
    Получает telegram_id текущего пользователя из куков
    
    Returns:
        int: telegram_id пользователя или None если не авторизован
    """
    telegram_id = request.cookies.get('telegram_id')
    if not telegram_id:
        return None
    try:
        return int(telegram_id)
    except (ValueError, TypeError):
        return None

def verify_bot_access_factory(bot_id_param: str = "bot_id") -> Callable:
    """
    Фабрика для создания dependency, проверяющей доступ к bot_id
    
    Args:
        bot_id_param: имя параметра пути, содержащего bot_id (по умолчанию "bot_id")
    
    Returns:
        dependency функция, которая проверяет доступ пользователя к боту
    """
    async def verify_bot_access(
        request: Request,
        current_user_id: Optional[int] = Depends(get_current_user_id)
    ) -> int:
        """
        Проверяет, что пользователь имеет доступ к указанному bot_id
        
        Args:
            request: FastAPI Request объект для получения параметров пути
            current_user_id: telegram_id текущего пользователя (из зависимости)
        
        Returns:
            int: telegram_id пользователя
            
        Raises:
            HTTPException: 401 если не авторизован, 403 если нет доступа
        """
        # Получаем bot_id из параметров пути
        bot_id = request.path_params.get(bot_id_param)
        
        if not bot_id:
            logger.error(f"Параметр {bot_id_param} не найден в пути")
            raise HTTPException(
                status_code=400,
                detail=f"Параметр {bot_id_param} обязателен"
            )
        
        if not current_user_id:
            logger.warning(f"Попытка доступа к боту {bot_id} без авторизации")
            raise HTTPException(
                status_code=401,
                detail="Требуется авторизация"
            )
        
        # Проверяем доступ пользователя к боту
        db_client = get_supabase_client()
        await db_client.initialize()
        
        user_bots = await db_client.get_user_bots(current_user_id)
        
        if bot_id not in user_bots:
            logger.warning(f"Пользователь {current_user_id} пытается получить доступ к боту {bot_id}, к которому у него нет доступа")
            raise HTTPException(
                status_code=403,
                detail="Нет доступа к данному боту"
            )
        
        logger.info(f"Пользователь {current_user_id} имеет доступ к боту {bot_id}")
        return current_user_id
    
    return verify_bot_access

# Создаем стандартную dependency для bot_id
verify_bot_access = verify_bot_access_factory("bot_id")

