import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { botsAPI } from '../utils/api'
import LoadingOverlay from '../components/LoadingOverlay'
import { Bot, Users, ChevronRight, LogOut } from 'lucide-react'

const BotSelectionPage = () => {
  const { user, logout, login, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(false) // Начинаем с false, чтобы не блокировать начальную проверку
  const [error, setError] = useState('')
  const [logoutLoading, setLogoutLoading] = useState(false)
  const authProcessingRef = useRef(false)
  const botsLoadedRef = useRef(false)

  const loadUserBots = useCallback(async (forceReload = false) => {
    console.log('[BotSelectionPage] loadUserBots: начало', {
      forceReload,
      hasUser: !!user,
      telegram_id: user?.telegram_id,
      botsLoaded: botsLoadedRef.current
    })
    
    if (!user || !user.telegram_id) {
      console.warn('[BotSelectionPage] loadUserBots: пользователь не авторизован')
      if (!forceReload) {
        setError('Пользователь не авторизован')
        setLoading(false)
      }
      return
    }

    // Если уже загружено и не принудительная перезагрузка - пропускаем
    if (botsLoadedRef.current && !forceReload) {
      console.log('[BotSelectionPage] loadUserBots: боты уже загружены, пропускаем')
      setLoading(false) // Убеждаемся, что loading сброшен
      return
    }

    try {
      setLoading(true)
      setError('')
      if (forceReload) {
        botsLoadedRef.current = false // Сбрасываем флаг при принудительной перезагрузке
        console.log('[BotSelectionPage] loadUserBots: принудительная перезагрузка')
      }
      
      console.log('[BotSelectionPage] loadUserBots: запрос ботов для telegram_id:', user.telegram_id)
      // Добавляем таймаут для загрузки ботов (10 секунд)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Таймаут загрузки ботов')), 10000)
      )
      
      const botsPromise = botsAPI.getUserBots(user.telegram_id)
      const response = await Promise.race([botsPromise, timeoutPromise])
      
      if (response.data.success) {
        const botsCount = response.data.bots?.length || 0
        console.log('[BotSelectionPage] loadUserBots: боты успешно загружены', { count: botsCount })
        setBots(response.data.bots || [])
        botsLoadedRef.current = true // Помечаем как загруженное только после успешной загрузки
      } else {
        console.error('[BotSelectionPage] loadUserBots: ошибка - ответ не успешен')
        setError('Не удалось загрузить список ботов')
        botsLoadedRef.current = false // Не помечаем как загруженное при ошибке
      }
    } catch (err) {
      const errorInfo = err.processedError || {}
      let errorMessage = ''
      
      if (err.message === 'Таймаут загрузки ботов') {
        errorMessage = 'Превышено время ожидания загрузки ботов. Попробуйте обновить страницу.'
      } else if (errorInfo.type === 'network') {
        // Для сетевых ошибок показываем сообщение только в dev режиме или если это не первая загрузка
        if (import.meta.env.DEV || forceReload) {
          errorMessage = errorInfo.message || 'Проблема с подключением к серверу'
        } else {
          // В продакшене при первой загрузке не показываем сетевые ошибки
          errorMessage = ''
        }
      } else {
        errorMessage = errorInfo.message || err.response?.data?.detail || 'Ошибка загрузки ботов'
      }
      
      console.error('[BotSelectionPage] loadUserBots: ошибка загрузки', {
        message: errorMessage,
        errorInfo,
        error: err,
        forceReload
      })
      
      if (errorMessage) {
        setError(errorMessage)
      }
      botsLoadedRef.current = false // Не помечаем как загруженное при ошибке
    } finally {
      setLoading(false)
      console.log('[BotSelectionPage] loadUserBots: завершение', {
        botsLoaded: botsLoadedRef.current,
        loading: false
      })
    }
  }, [user])

  const handleTelegramAuth = useCallback(async (telegramData) => {
    console.log('[BotSelectionPage] handleTelegramAuth: начало авторизации', {
      telegram_id: telegramData.telegram_id,
      first_name: telegramData.first_name
    })
    
    try {
      setLoading(true)
      setError('')
      
      console.log('[BotSelectionPage] handleTelegramAuth: вызов login()')
      const result = await login(telegramData)
      console.log('[BotSelectionPage] handleTelegramAuth: результат login()', { success: result?.success })
      
      if (result?.success) {
        try {
          console.log('[BotSelectionPage] handleTelegramAuth: начало загрузки ботов для telegram_id:', telegramData.telegram_id)
          // Добавляем таймаут для загрузки ботов (10 секунд)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут загрузки ботов')), 10000)
          )
          
          const botsPromise = botsAPI.getUserBots(telegramData.telegram_id)
          const botsResponse = await Promise.race([botsPromise, timeoutPromise])
          
          if (botsResponse.data.success) {
            const botsCount = botsResponse.data.bots?.length || 0
            console.log('[BotSelectionPage] handleTelegramAuth: боты успешно загружены', { count: botsCount })
            setBots(botsResponse.data.bots || [])
            // Помечаем, что боты успешно загружены только после успешной загрузки
            botsLoadedRef.current = true
          } else {
            console.error('[BotSelectionPage] handleTelegramAuth: ошибка загрузки ботов - ответ не успешен')
            setError('Не удалось загрузить список ботов')
            botsLoadedRef.current = false // Не помечаем как загруженное при ошибке
          }
        } catch (err) {
          const errorMessage = err.message === 'Таймаут загрузки ботов' 
            ? 'Превышено время ожидания загрузки ботов. Попробуйте обновить страницу.'
            : (err.processedError?.message || err.response?.data?.detail || 'Ошибка загрузки ботов')
          console.error('[BotSelectionPage] handleTelegramAuth: ошибка загрузки ботов', {
            message: errorMessage,
            error: err
          })
          setError(errorMessage)
          botsLoadedRef.current = false // Не помечаем как загруженное при ошибке
        } finally {
          setLoading(false)
          console.log('[BotSelectionPage] handleTelegramAuth: завершение загрузки ботов', {
            botsLoaded: botsLoadedRef.current,
            loading: false
          })
          // Не сбрасываем authProcessingRef здесь - он будет сброшен в useEffect
          // когда user будет установлен и загрузка завершена
        }
      } else {
        console.error('[BotSelectionPage] handleTelegramAuth: ошибка авторизации', { error: result?.error })
        setError(result?.error || 'Ошибка авторизации')
        setLoading(false)
        authProcessingRef.current = false
        botsLoadedRef.current = false
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    } catch (err) {
      const errorMessage = err.processedError?.message || err.response?.data?.detail || 'Ошибка авторизации. Попробуйте снова.'
      console.error('[BotSelectionPage] handleTelegramAuth: исключение при авторизации', {
        message: errorMessage,
        error: err
      })
      setError(errorMessage)
      setLoading(false)
      authProcessingRef.current = false
      botsLoadedRef.current = false
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    }
  }, [login, navigate])

  useEffect(() => {
    // Защита от зависания loading - если loading true больше 15 секунд, сбрасываем
    let loadingTimeout
    if (loading) {
      console.log('[BotSelectionPage] useEffect: установлен таймаут защиты от зависания loading (15 сек)')
      loadingTimeout = setTimeout(() => {
        if (loading) {
          console.warn('[BotSelectionPage] useEffect: таймаут loading - сброс состояния')
          setLoading(false)
          authProcessingRef.current = false
          botsLoadedRef.current = false
        }
      }, 15000)
    }
    
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }, [loading])

  useEffect(() => {
    console.log('[BotSelectionPage] useEffect: проверка состояния', {
      hasUser: !!user,
      telegram_id: user?.telegram_id,
      loading,
      authLoading,
      authProcessing: authProcessingRef.current,
      botsLoaded: botsLoadedRef.current,
      locationSearch: location.search
    })
    
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

    const hasAuthParams = telegramAuthData.telegram_id && telegramAuthData.hash && telegramAuthData.first_name

    // Если есть параметры авторизации и авторизация еще не обрабатывается
    if (hasAuthParams && !authProcessingRef.current) {
      console.log('[BotSelectionPage] useEffect: обнаружены параметры авторизации, начинаем обработку')
      authProcessingRef.current = true
      
      // Обрабатываем авторизацию Telegram
      // Очищаем параметры из URL сразу, чтобы избежать повторной авторизации
      // но сохраняем данные в переменной telegramAuthData
      const currentSearch = location.search
      if (currentSearch) {
        navigate('/bots', { replace: true })
      }
      
      // Обрабатываем авторизацию с сохраненными данными
      handleTelegramAuth(telegramAuthData)
      return // Не продолжаем выполнение, чтобы не сработали другие условия
    }
    
    // Если авторизация обрабатывается, ждем завершения (не редиректим на login)
    // Сбрасываем флаг когда пользователь установлен и загрузка завершена (независимо от результата загрузки ботов)
    if (authProcessingRef.current) {
      if (user && user.telegram_id && !loading && !authLoading) {
        console.log('[BotSelectionPage] useEffect: авторизация завершена, сбрасываем флаг обработки')
        authProcessingRef.current = false
      } else {
        console.log('[BotSelectionPage] useEffect: авторизация обрабатывается, ждем...', {
          hasUser: !!user,
          telegram_id: user?.telegram_id,
          loading,
          authLoading
        })
      }
      return // Не продолжаем выполнение, чтобы не сработал редирект на login
    }
    
    // Если пользователь авторизован и боты еще не загружены (и нет параметров авторизации)
    // Не проверяем loading, так как loadUserBots сам управляет состоянием loading
    if (user && user.telegram_id && !botsLoadedRef.current && !hasAuthParams && !authProcessingRef.current) {
      console.log('[BotSelectionPage] useEffect: пользователь авторизован, загружаем ботов')
      loadUserBots()
      return
    }
    
    // Если идет загрузка ботов локально и нет пользователя, ждем
    if (loading && !user && !hasAuthParams) {
      console.log('[BotSelectionPage] useEffect: идет загрузка, пользователь не установлен, ждем')
      return
    }

    // Редиректим на /login только если:
    // 1. Пользователь не авторизован
    // 2. Нет параметров авторизации в URL
    // 3. Авторизация не обрабатывается
    // 4. Не идет загрузка ботов
    // 5. Проверка авторизации завершена (не authLoading)
    // 6. Боты не загружаются (не botsLoadedRef.current или не loading)
    if (!user && !hasAuthParams && !authProcessingRef.current && !loading && !authLoading) {
      console.log('[BotSelectionPage] useEffect: редирект на /login - пользователь не авторизован')
      navigate('/login', { replace: true })
    }
  }, [location.search, user, navigate, loading, handleTelegramAuth, loadUserBots, authLoading])

  const handleBotSelect = (botId) => {
    navigate(`/dashboard/${botId}`)
  }

  const handleLogout = async () => {
    if (logoutLoading) {
      console.log('[BotSelectionPage] handleLogout: выход уже выполняется, пропускаем')
      return // Предотвращаем повторные клики
    }
    
    console.log('[BotSelectionPage] handleLogout: начало выхода')
    try {
      setLogoutLoading(true)
      
      // Создаем промис с таймаутом
      const logoutPromise = logout()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Таймаут выхода')), 5000)
      )
      
      // Ждем либо завершения logout, либо таймаута
      await Promise.race([logoutPromise, timeoutPromise])
      console.log('[BotSelectionPage] handleLogout: выход успешно выполнен')
    } catch (err) {
      // Игнорируем ошибки - все равно делаем logout локально
      console.warn('[BotSelectionPage] handleLogout: ошибка при выходе (игнорируем)', {
        error: err.message || err
      })
    } finally {
      // Всегда редиректим на login, даже если запрос завис
      console.log('[BotSelectionPage] handleLogout: редирект на /login')
      setLogoutLoading(false)
      navigate('/login', { replace: true })
    }
  }

  // Если идет проверка авторизации или обработка авторизации, показываем загрузку
  if (authLoading || authProcessingRef.current) {
    return <LoadingOverlay text="Загрузка ботов..." />
  }

  if (loading) {
    return (
      <>
        <div className="min-h-screen" />
        <LoadingOverlay text="Загрузка ботов..." />
      </>
    )
  }

  // Если пользователь не загружен, показываем загрузку
  if (!user) {
    return <LoadingOverlay />
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
              Добро пожаловать, {user?.first_name || 'Пользователь'}! Выберите бота для просмотра аналитики
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {logoutLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Выход...</span>
              </>
            ) : (
              <>
            <LogOut size={18} />
                <span>Выйти</span>
              </>
            )}
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
              onClick={() => loadUserBots(true)}
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