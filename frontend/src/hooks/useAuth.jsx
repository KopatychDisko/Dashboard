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
      const telegramId = sessionStorage.getItem('telegram_id')
      
      if (telegramId) {
        const response = await apiClient.get(`/auth/user/${telegramId}`)
        
        if (response.data.success) {
          setUser(response.data.user)
          setIsAuthenticated(true)
        } else {
          clearAuth()
        }
      } else {
        clearAuth()
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error)
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
        sessionStorage.setItem('telegram_id', response.data.telegram_id.toString())
        
        return { success: true, user: userData }
      }
      
      return { success: false, error: 'Ошибка авторизации' }
    } catch (error) {
      console.error('Ошибка входа:', error)
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Ошибка авторизации' 
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearAuth()
  }

  const clearAuth = () => {
    setUser(null)
    setIsAuthenticated(false)
    sessionStorage.removeItem('telegram_id')
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