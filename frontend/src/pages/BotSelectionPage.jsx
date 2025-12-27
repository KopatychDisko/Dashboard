import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { botsAPI } from '../utils/api'
import LoadingOverlay from '../components/LoadingOverlay'
import { Bot, Users, ChevronRight, LogOut } from 'lucide-react'

const BotSelectionPage = () => {
  const { user, logout, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Проверяем наличие параметров авторизации в URL
    const params = new URLSearchParams(location.search)
    const telegramAuthData = {
      telegram_id: params.get('id') ? Number(params.get('id')) : null,
      first_name: params.get('first_name'),
      last_name: params.get('last_name') || null,
      username: params.get('username') || null,
      photo_url: params.get('photo_url') || null,
      auth_date: params.get('auth_date') ? Number(params.get('auth_date')) : null,
      hash: params.get('hash')
    }

    // Убираем лишние логи для ускорения

    // Если есть параметры авторизации, выполняем вход
    if (telegramAuthData.telegram_id && telegramAuthData.hash && telegramAuthData.first_name) {
      // Обрабатываем авторизацию Telegram
      handleTelegramAuth(telegramAuthData)
    } else if (user && user.telegram_id) {
      loadUserBots()
    } else {
      navigate('/login', { replace: true })
    }
  }, [location.search, user, navigate])

  const handleTelegramAuth = async (telegramData) => {
    try {
      setLoading(true)
      setError('')
      
      const result = await login(telegramData)
      
      if (result?.success) {
        navigate('/bots', { replace: true })
        
        try {
          const botsResponse = await botsAPI.getUserBots(telegramData.telegram_id)
          if (botsResponse.data.success) {
            setBots(botsResponse.data.bots)
          } else {
            setError('Не удалось загрузить список ботов')
          }
        } catch (err) {
          const errorMessage = err.processedError?.message || err.response?.data?.detail || 'Ошибка загрузки ботов'
          setError(errorMessage)
          
          if (import.meta.env.DEV) {
          console.error('Ошибка загрузки ботов:', err)
          }
        }
      } else {
        setError(result?.error || 'Ошибка авторизации')
        setLoading(false)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    } catch (err) {
      const errorMessage = err.processedError?.message || err.response?.data?.detail || 'Ошибка авторизации. Попробуйте снова.'
      setError(errorMessage)
      setLoading(false)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
      
      if (import.meta.env.DEV) {
        console.error('Ошибка авторизации:', err)
      }
    }
  }

  const loadUserBots = async () => {
    if (!user || !user.telegram_id) {
      setError('Пользователь не авторизован')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await botsAPI.getUserBots(user.telegram_id)
      
      if (response.data.success) {
        setBots(response.data.bots)
      } else {
        setError('Не удалось загрузить список ботов')
      }
    } catch (err) {
      const errorMessage = err.processedError?.message || err.response?.data?.detail || 'Ошибка загрузки ботов'
      setError(errorMessage)
      
      if (import.meta.env.DEV) {
      console.error('Ошибка загрузки ботов:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBotSelect = (botId) => {
    navigate(`/dashboard/${botId}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <>
        <div className="min-h-screen" />
        <LoadingOverlay text="Загрузка ботов..." />
      </>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Выберите бота
            </h1>
            <p className="text-white/70">
              Добро пожаловать, {user.first_name}! Выберите бота для просмотра аналитики
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {bots.length === 0 ? (
          <div className="glass-card relative p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-4xl">
              🤖
            </div>
            
            <h2 className="text-2xl font-bold mb-3 text-white">
              Боты не найдены
            </h2>
            
            <p className="text-white/70 mb-6">
              У вас пока нет доступа к ботам. Обратитесь к администратору для получения доступа.
            </p>
            
            <button
              onClick={loadUserBots}
              className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-xl font-semibold hover:from-emerald-500 hover:to-blue-500 transition-all"
            >
              Обновить список
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot, index) => (
              <BotCard
                key={bot.bot_id}
                bot={bot}
                onSelect={() => handleBotSelect(bot.bot_id)}
                delay={index * 100}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const BotCard = ({ bot, onSelect, delay = 0 }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="glass-card relative p-6 cursor-pointer hover:scale-105 transition-all duration-300 fade-in"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center">
          <Bot size={24} className="text-white" />
        </div>
        
        <ChevronRight 
          size={20} 
          className={`text-white/50 transition-all duration-300 ${
            isHovered ? 'translate-x-1 text-white/80' : ''
          }`} 
        />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">
        {bot.name}
      </h3>
      
      <p className="text-white/60 text-sm mb-4">
        {bot.description}
      </p>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-white/70">
          <Users size={16} />
          <span>{bot.total || 0} польз.</span>
        </div>
        
        <div className={`flex items-center gap-1 ${
          bot.status === 'active' ? 'text-emerald-400' : 'text-gray-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            bot.status === 'active' ? 'bg-emerald-400' : 'bg-gray-400'
          }`}></div>
          <span className="capitalize">{bot.status}</span>
        </div>
      </div>
      
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-blue-400/10 rounded-xl transition-opacity duration-300" />
      )}
    </div>
  )
}

export default BotSelectionPage