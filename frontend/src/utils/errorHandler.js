/**
 * Централизованная обработка ошибок
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Обрабатывает ошибки API запросов и возвращает понятное сообщение
 */
export const handleApiError = (error) => {
  // Проверяем, является ли это реальной сетевой ошибкой
  const isNetworkError = !error.response && (
    error.code === 'ECONNABORTED' || // Таймаут
    error.code === 'ERR_NETWORK' || // Сетевая ошибка
    error.code === 'ERR_INTERNET_DISCONNECTED' || // Нет интернета
    error.message?.includes('Network Error') || // Сетевая ошибка в сообщении
    error.message?.includes('timeout') || // Таймаут
    (error.request && !error.response) // Запрос был отправлен, но ответа нет
  )
  
  // Сетевая ошибка - только для реальных проблем с сетью
  if (isNetworkError) {
    // В режиме разработки показываем более детальное сообщение
    if (import.meta.env.DEV) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      return {
        message: `Сайт находится в режиме разработки. Проблема с подключением к серверу. Проверьте, что сервер запущен и доступен по адресу ${apiUrl}`,
        type: 'network',
        statusCode: 0
      }
    }
    // В продакшене показываем общее сообщение
    return {
      message: 'Сайт находится в разработке. Некоторые функции могут быть временно недоступны.',
      type: 'network',
      statusCode: 0
    }
  }
  
  // Если нет response, но это не сетевая ошибка - возможно, это другая проблема
  if (!error.response) {
    // В режиме разработки показываем детали
    if (import.meta.env.DEV) {
      return {
        message: `Ошибка запроса: ${error.message || 'Неизвестная ошибка'}. Проверьте консоль для деталей.`,
        type: 'unknown',
        statusCode: 0
      }
    }
    // В продакшене показываем общее сообщение о разработке
    return {
      message: 'Сайт находится в разработке. Попробуйте обновить страницу или вернитесь позже.',
      type: 'unknown',
      statusCode: 0
    }
  }

  const statusCode = error.response?.status
  const data = error.response?.data

  // Обработка различных HTTP статусов
  switch (statusCode) {
    case 401:
      return {
        message: 'Требуется авторизация. Пожалуйста, войдите снова.',
        type: 'auth',
        statusCode: 401
      }
    
    case 403:
      return {
        message: data?.detail || 'Нет доступа к запрашиваемому ресурсу.',
        type: 'permission',
        statusCode: 403
      }
    
    case 404:
      return {
        message: data?.detail || 'Запрашиваемый ресурс не найден.',
        type: 'not_found',
        statusCode: 404
      }
    
    case 429:
      return {
        message: 'Слишком много запросов. Пожалуйста, подождите немного.',
        type: 'rate_limit',
        statusCode: 429
      }
    
    case 500:
    case 502:
    case 503:
      return {
        message: 'Ошибка на сервере. Пожалуйста, попробуйте позже.',
        type: 'server',
        statusCode
      }
    
    default:
      return {
        message: data?.detail || data?.message || 'Произошла ошибка при выполнении запроса.',
        type: 'unknown',
        statusCode: statusCode || 500
      }
  }
}

/**
 * Показывает ошибку пользователю (можно интегрировать с toast библиотекой)
 */
export const showError = (error, options = {}) => {
  const errorInfo = handleApiError(error)
  
  // Логируем в консоль для разработки
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', errorInfo, error)
  }
  
  // Можно интегрировать с toast библиотекой
  // toast.error(errorInfo.message)
  
  return errorInfo
}

/**
 * Retry механизм для запросов
 */
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error
      
      // Не повторяем для ошибок авторизации или доступа
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error
      }
      
      // Если это последняя попытка - выбрасываем ошибку
      if (attempt === maxRetries - 1) {
        throw error
      }
      
      // Ждем перед следующей попыткой (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
    }
  }
  
  throw lastError
}

