/**
 * Утилиты для форматирования дат в московском времени (UTC+3)
 */

/**
 * Форматирует дату в московском времени для отображения
 * @param {string|Date} dateString - Дата в формате ISO или Date объект
 * @param {Object} options - Опции форматирования для toLocaleString
 * @returns {string} Отформатированная дата
 */
export const formatMoscowDate = (dateString, options = {}) => {
  if (!dateString) return 'Дата не указана'
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    
    if (isNaN(date.getTime())) {
      return 'Дата не указана'
    }
    
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
      ...options
    }
    
    // Используем Intl.DateTimeFormat для правильной конвертации в московское время
    const formatter = new Intl.DateTimeFormat('ru-RU', defaultOptions)
    return formatter.format(date)
  } catch (error) {
    console.error('Ошибка форматирования даты:', error)
    return 'Дата не указана'
  }
}

/**
 * Форматирует дату и время для отображения сессии
 * @param {string|Date} dateString - Дата в формате ISO или Date объект
 * @returns {string} Отформатированная дата
 */
export const formatSessionDate = (dateString) => {
  return formatMoscowDate(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Форматирует дату и время для отображения сообщения
 * @param {string|Date} dateString - Дата в формате ISO или Date объект
 * @returns {string} Отформатированная дата
 */
export const formatMessageDate = (dateString) => {
  return formatMoscowDate(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

