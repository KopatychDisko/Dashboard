from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TelegramUser(BaseModel):
    """Модель пользователя Telegram"""
    telegram_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class UserProfile(BaseModel):
    """Профиль пользователя в системе"""
    telegram_id: int
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    language_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True

class BotUser(BaseModel):
    """Пользователь конкретного бота"""
    telegram_id: int
    bot_id: str
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    language_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    source: Optional[str] = None
    medium: Optional[str] = None
    campaign: Optional[str] = None
    term: Optional[str] = None
    content: Optional[str] = None
    segments: Optional[str] = None

class UserBotAccess(BaseModel):
    """Доступ пользователя к ботам"""
    telegram_id: int
    bots: List[str]  # Список bot_id доступных ботов