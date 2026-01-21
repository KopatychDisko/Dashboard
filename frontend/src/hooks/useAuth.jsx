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
    try {
      // Используем новый endpoint /auth/me который читает куки
      const response = await apiClient.get('/auth/me')
      
      if (response.data.success && response.data.user) {
        setUser(response.data.user)
        setIsAuthenticated(true)
      } else {
        clearAuth()
      }
    } catch (error) {
      // Логируем только в development
      if (import.meta.env.DEV) {
        console.error('Ошибка проверки авторизации:', error)
      }
      clearAuth()
    } finally {
      setLoading(false)
    }
  }

  const login = async (telegramData) => {
    try {
      setLoading(true)
      const response = await apiClient.post('/auth/telegram', telegramData)
      
      if (response.data.success) {
        const userData = {
          telegram_id: response.data.telegram_id,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          username: response.data.username,
          bots: response.data.bots
        }
        
        setUser(userData)
        setIsAuthenticated(true)
        // Куки устанавливаются автоматически сервером
        
        return { success: true, user: userData }
      }
      
      return { success: false, error: 'Ошибка авторизации' }
    } catch (error) {
      const errorMessage = error.processedError?.message || error.response?.data?.detail || 'Ошибка авторизации'
      
      if (import.meta.env.DEV) {
        console.error('Ошибка входа:', error)
      }
      
      return { 
        success: false, 
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Вызываем logout на сервере для очистки куков
      await apiClient.post('/auth/logout')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Ошибка выхода:', error)
      }
    } finally {
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