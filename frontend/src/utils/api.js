import axios from 'axios'

// Базовый URL для API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Создаем экземпляр axios
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    
    // Если ошибка авторизации - очищаем сессию
    if (error.response?.status === 401) {
      sessionStorage.removeItem('telegram_id')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

// API функции
export const authAPI = {
  loginWithTelegram: (telegramData) => 
    apiClient.post('/auth/telegram', telegramData),
  
  getUserInfo: (telegramId) => 
    apiClient.get(`/auth/user/${telegramId}`),
  
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
  
  getRevenueAnalytics: (botId, days = 7) => 
    apiClient.get(`/analytics/${botId}/revenue`, { params: { days } }),
  
  getDetailedAnalytics: (botId, days = 30) => 
    apiClient.get(`/analytics/${botId}/detailed`, { params: { days } }),
  
  exportAnalytics: (botId, days = 30, format = 'json') => 
    apiClient.get(`/analytics/${botId}/export`, { params: { days, format } })
}

export default apiClient