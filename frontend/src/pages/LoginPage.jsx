import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

const TELEGRAM_SCRIPT_ID = 'telegram-login-script'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(true)
  const widgetInitializedRef = useRef(false)

  // Обрабатываем редирект после авторизации
  useEffect(() => {
    console.log('[LoginPage] useEffect: проверка редиректа', {
      hasUser: !!user,
      telegram_id: user?.telegram_id,
      locationSearch: location.search
    })
    
    // Если есть параметры авторизации в URL, всегда редиректим на /bots для обработки
    const params = new URLSearchParams(location.search)
    const hasAuthParams = params.get('id') && params.get('hash') && params.get('first_name')
    
    if (hasAuthParams) {
      console.log('[LoginPage] useEffect: обнаружены параметры авторизации, редирект на /bots')
      // Редиректим на /bots с параметрами для обработки там
      navigate(`/bots?${location.search}`, { replace: true })
      return
    }

    // Если пользователь уже авторизован и нет параметров авторизации, редиректим на /bots
    if (user && user.telegram_id) {
      console.log('[LoginPage] useEffect: пользователь авторизован, редирект на /bots')
      navigate('/bots', { replace: true })
    }
  }, [user, navigate, location.search])

  useEffect(() => {
    // Если виджет уже инициализирован, не пересоздаем его
    if (widgetInitializedRef.current) {
      return
    }

    let isComponentMounted = true
    let checkWidgetInterval = null
    let initTimeout = null
    let resizeTimeout = null
    loadingRef.current = true

    const initTelegramWidget = () => {
      if (typeof window === 'undefined') return

      const container = document.getElementById('telegram-login-container')
      if (!container) {
        if (import.meta.env.DEV) {
        console.warn('Telegram container not found: #telegram-login-container')
        }
        return
      }

      // Очищаем только старый скрипт, но не контейнер
      const prevScript = document.getElementById(TELEGRAM_SCRIPT_ID)
      if (prevScript) prevScript.remove()

      // Создаем новый скрипт
      const script = document.createElement('script')
      script.id = TELEGRAM_SCRIPT_ID
      script.src = `https://telegram.org/js/telegram-widget.js?22`
      script.async = true
      script.setAttribute(
        'data-telegram-login',
        import.meta.env.VITE_TELEGRAM_BOT_USERNAME
      )

      if (!import.meta.env.VITE_TELEGRAM_BOT_USERNAME) {
        setError('Не задан VITE_TELEGRAM_BOT_USERNAME. Скопируйте frontend/.env.example в frontend/.env')
        loadingRef.current = false
        setLoading(false)
        return
      }
      
      // Адаптивный размер виджета в зависимости от устройства
      const isMobile = window.innerWidth <= 768
      const widgetSize = isMobile ? 'medium' : 'large'
      
      script.setAttribute('data-size', widgetSize)
      script.setAttribute('data-radius', '12')
      script.setAttribute('data-request-access', 'write')
      
      const authUrl = import.meta.env.VITE_AUTH_URL
      
      if (!authUrl || !authUrl.includes('/bots')) {
        setError('Не задан VITE_AUTH_URL. Скопируйте frontend/.env.example в frontend/.env')
        loadingRef.current = false
        setLoading(false)
        return
      }

      script.setAttribute('data-auth-url', authUrl)
      
      script.onerror = (e) => {
        if (isComponentMounted) {
          setError('Не удалось загрузить Telegram виджет. Проверьте подключение и CSP.')
          loadingRef.current = false
          setLoading(false)
        }
        
        if (import.meta.env.DEV) {
          console.error('Telegram widget load error:', e)
        }
      }

      script.onload = () => {
        let checkCount = 0
        let iframeFound = false
        
        // Проверяем появление iframe виджета
        checkWidgetInterval = setInterval(() => {
          checkCount++
          const container = document.getElementById('telegram-login-container')
          
          if (!container) return
          
          // Ищем iframe
          const iframe = container.querySelector('iframe') || 
                        container.querySelector('iframe[src*="oauth.telegram.org"]') ||
                        document.querySelector(`iframe[id*="telegram-login"]`)
          
          if (iframe && !iframeFound) {
            iframeFound = true
            
            // Принудительно убираем все обводки у iframe
            const removeStyles = () => {
              iframe.style.border = 'none'
              iframe.style.outline = 'none'
              iframe.style.boxShadow = 'none'
              iframe.style.webkitBoxShadow = 'none'
              iframe.style.mozBoxShadow = 'none'
              iframe.style.borderRadius = '0'
            }
            
            removeStyles()
            
            // Следим за изменениями стилей и убираем их
            const observer = new MutationObserver(() => {
              removeStyles()
            })
            
            observer.observe(iframe, {
              attributes: true,
              attributeFilter: ['style', 'class']
            })
            
            // Убираем обводку через небольшие интервалы (на случай если стили применяются позже)
            const styleInterval = setInterval(() => {
              if (iframe.parentNode) {
                removeStyles()
              } else {
                clearInterval(styleInterval)
                observer.disconnect()
              }
            }, 100)
            
            // Останавливаем через 5 секунд
            setTimeout(() => {
              clearInterval(styleInterval)
              observer.disconnect()
            }, 5000)
            
            if (isComponentMounted && loadingRef.current) {
              clearInterval(checkWidgetInterval)
              loadingRef.current = false
              setLoading(false)
            }
          }
        }, 50)

        // Таймаут на инициализацию - 10 секунд
        initTimeout = setTimeout(() => {
          if (checkWidgetInterval) clearInterval(checkWidgetInterval)
          
          if (isComponentMounted && loadingRef.current) {
            const container = document.getElementById('telegram-login-container')
            const iframe = container?.querySelector('iframe')
            
            if (iframe) {
              loadingRef.current = false
              setLoading(false)
            } else {
              setError('Не удалось загрузить Telegram виджет. Проверьте настройки домена в BotFather.')
              loadingRef.current = false
              setLoading(false)
            }
          }
        }, 10000)
      }

      container.appendChild(script)
    }

    // Обработчик изменения размера окна для адаптивности
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      
      resizeTimeout = setTimeout(() => {
        const currentIsMobile = window.innerWidth <= 768
        const container = document.getElementById('telegram-login-container')
        const iframe = container?.querySelector('iframe')
        
        if (iframe) {
          // Получаем текущий размер из src iframe
          const currentSize = iframe.src.includes('size=large') ? 'large' : 'medium'
          const newSize = currentIsMobile ? 'medium' : 'large'
          
          // Пересоздаем виджет только если размер изменился
          if (currentSize !== newSize) {
            widgetInitializedRef.current = false
            const script = document.getElementById(TELEGRAM_SCRIPT_ID)
            if (script) script.remove()
            if (container) container.innerHTML = ''
            
            // Пересоздаем виджет с новым размером
            setTimeout(() => {
              if (isComponentMounted) {
                initTelegramWidget()
                widgetInitializedRef.current = true
              }
            }, 100)
          }
        }
      }, 300) // Debounce 300ms
    }

    // Инициализируем виджет
    initTelegramWidget()
    widgetInitializedRef.current = true
    
    // Добавляем обработчик resize
    window.addEventListener('resize', handleResize)

    // Cleanup функция
    return () => {
      isComponentMounted = false
      if (checkWidgetInterval) clearInterval(checkWidgetInterval)
      if (initTimeout) clearTimeout(initTimeout)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      
      // Убираем обработчик resize
      window.removeEventListener('resize', handleResize)
      
      // НЕ удаляем скрипт при cleanup, чтобы виджет не пересоздавался
      // Виджет будет удален только при полном размонтировании компонента
      
      // Сбрасываем флаг инициализации только при размонтировании
      widgetInitializedRef.current = false
    }
  }, []) // Пустой массив - виджет создается только один раз при монтировании

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="glass-card relative p-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-4xl">
              📊
            </div>

            <h1 className="text-3xl font-bold mb-3 gradient-text">Добро пожаловать</h1>

            <p className="text-white/70 text-lg">Войдите через Telegram для доступа к дашборду</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-center">
              {error}
            </div>
          )}

          <div className="bg-gradient-to-r from-emerald-400/10 to-blue-400/10 rounded-xl p-8 mb-6">
            <div 
              id="telegram-login-container" 
              className="flex justify-center min-h-[46px] sm:min-h-[52px] items-center w-full transition-all duration-300"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => navigate('/account-switch')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm"
            >
              Хочу поменять Telegram аккаунт — как это сделать?
            </button>
          </div>

          <div className="mt-8">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <div>
                  <p className="text-white font-semibold mb-1">Безопасный вход</p>
                  <p className="text-white/60 text-sm">Используем официальный Telegram Widget</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <div>
                  <p className="text-white font-semibold mb-1">Без регистрации</p>
                  <p className="text-white/60 text-sm">Вход в один клик через ваш Telegram аккаунт</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <div>
                  <p className="text-white font-semibold mb-1">Мгновенный доступ</p>
                  <p className="text-white/60 text-sm">Сразу после авторизации попадете в дашборд</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage