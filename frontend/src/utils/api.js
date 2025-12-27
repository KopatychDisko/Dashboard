import axios from 'axios'
import { handleApiError } from './errorHandler.js'

// Базовый URL для API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Создаем экземпляр axios
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,  // Включаем отправку куков
  headers: {
    'Content-Type': 'application/json',
  }
})

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Обрабатываем ошибку через централизованный обработчик
    const errorInfo = handleApiError(error)
    
    // Логируем только в development режиме
    if (import.meta.env.DEV) {
      console.error('API Error:', errorInfo, error)
    }
    
    // Если ошибка авторизации - перенаправляем на логин
    if (errorInfo.statusCode === 401) {
      // Не редиректим если мы уже на странице логина
      if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
      }
    }
    
    // Добавляем обработанную информацию об ошибке к объекту ошибки
    error.processedError = errorInfo
    
    return Promise.reject(error)
  }
)

// API функции
export const authAPI = {
  loginWithTelegram: (telegramData) => 
    apiClient.post('/auth/telegram', telegramData),
  
  getCurrentUser: () => 
    apiClient.get('/auth/me'),
  
  getUserInfo: (telegramId) => 
    apiClient.get(`/auth/user/${telegramId}`),
  
  logout: () => 
    apiClient.post('/auth/logout'),
  
  verifyHash: (data) => 
    apiClient.post('/auth/verify-hash', data)
}

export const botsAPI = {
  getUserBots: (telegramId) => 
    apiClient.get(`/bots/${telegramId}`),
  
  getBotInfo: (botId) => 
    apiClient.get(`/bots/${botId}/info`),
  
  getBotUsers: (botId, params = {}) => 
    apiClient.get(`/bots/${botId}/users`, { params })
}

export const analyticsAPI = {
  getDashboardAnalytics: (botId, days = 7) => 
    apiClient.get(`/analytics/${botId}/dashboard`, { params: { days } }),
  
  getBotMetrics: (botId, days = 7) => 
    apiClient.get(`/analytics/${botId}/metrics`, { params: { days } }),
  
  getFunnelAnalytics: (botId, days = 7) => 
    apiClient.get(`/analytics/${botId}/funnel`, { params: { days } }),
  
  getDetailedAnalytics: (botId, days = 30) => 
    apiClient.get(`/analytics/${botId}/detailed`, { params: { days } }),
  
  getRecentEvents: (botId, limit = 10) => 
    apiClient.get(`/analytics/${botId}/recent-events`, { params: { limit } }),
  
  exportAnalytics: (botId, days = 30, format = 'json') => 
    apiClient.get(`/analytics/${botId}/export`, { params: { days, format } })
}

export default apiClient