import { useState, useEffect, createContext, useContext } from 'react'
import { apiClient } from '../utils/api'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    console.log('[useAuth] checkAuthStatus: начало проверки авторизации')
    try {
      // Используем новый endpoint /auth/me который читает куки
      const response = await apiClient.get('/auth/me')
      console.log('[useAuth] checkAuthStatus: ответ от /auth/me', {
        success: response.data.success,
        hasUser: !!response.data.user
      })
      
      if (response.data.success && response.data.user) {
        console.log('[useAuth] checkAuthStatus: пользователь авторизован', {
          telegram_id: response.data.user.telegram_id,
          first_name: response.data.user.first_name
        })
        setUser(response.data.user)
        setIsAuthenticated(true)
      } else {
        console.log('[useAuth] checkAuthStatus: пользователь не авторизован')
        clearAuth()
      }
    } catch (error) {
      console.error('[useAuth] checkAuthStatus: ошибка проверки авторизации', {
        message: error.message,
        response: error.response?.data
      })
      clearAuth()
    } finally {
      setLoading(false)
      console.log('[useAuth] checkAuthStatus: завершение проверки авторизации', { loading: false })
    }
  }

  const login = async (telegramData) => {
    console.log('[useAuth] login: начало авторизации', {
      telegram_id: telegramData.telegram_id,
      first_name: telegramData.first_name
    })
    
    try {
      setLoading(true)
      const response = await apiClient.post('/auth/telegram', telegramData)
      console.log('[useAuth] login: ответ от /auth/telegram', {
        success: response.data.success,
        telegram_id: response.data.telegram_id
      })
      
      if (response.data.success) {
        const userData = {
          telegram_id: response.data.telegram_id,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          username: response.data.username,
          bots: response.data.bots
        }
        
        console.log('[useAuth] login: авторизация успешна', {
          telegram_id: userData.telegram_id,
          first_name: userData.first_name
        })
        
        setUser(userData)
        setIsAuthenticated(true)
        // Куки устанавливаются автоматически сервером
        
        return { success: true, user: userData }
      }
      
      console.warn('[useAuth] login: авторизация не успешна - ответ не содержит success')
      return { success: false, error: 'Ошибка авторизации' }
    } catch (error) {
      const errorMessage = error.processedError?.message || error.response?.data?.detail || 'Ошибка авторизации'
      
      console.error('[useAuth] login: ошибка авторизации', {
        message: errorMessage,
        error: error.response?.data || error.message
      })
      
      return { 
        success: false, 
        error: errorMessage
      }
    } finally {
      setLoading(false)
      console.log('[useAuth] login: завершение авторизации', { loading: false })
    }
  }

  const logout = async () => {
    console.log('[useAuth] logout: начало выхода')
    try {
      // Вызываем logout на сервере для очистки куков с таймаутом
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 секунды таймаут
      
      try {
        await apiClient.post('/auth/logout', {}, {
          signal: controller.signal,
          timeout: 3000 // Дополнительный таймаут на уровне axios
        })
        console.log('[useAuth] logout: выход успешно выполнен на сервере')
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      // Игнорируем ошибки - все равно очищаем локальное состояние
      // AbortError и timeout ошибки не логируем
      if (error.name !== 'AbortError' && 
          error.name !== 'CanceledError' &&
          error.code !== 'ECONNABORTED') {
        console.warn('[useAuth] logout: ошибка выхода (игнорируем)', {
          name: error.name,
          message: error.message
        })
      } else {
        console.log('[useAuth] logout: таймаут выхода (ожидаемо)')
      }
    } finally {
      // Всегда очищаем локальное состояние, даже если запрос не прошел
      console.log('[useAuth] logout: очистка локального состояния')
      clearAuth()
    }
  }

  const clearAuth = () => {
    setUser(null)
    setIsAuthenticated(false)
    // Больше не используем sessionStorage
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}