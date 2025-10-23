import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import LoadingSpinner from '../components/LoadingSpinner'

const TELEGRAM_SCRIPT_ID = 'telegram-login-script'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isComponentMounted = true
    let checkWidgetInterval = null
    let initTimeout = null

    const initTelegramWidget = () => {
      if (typeof window === 'undefined') return

      const container = document.getElementById('telegram-login-container')
      if (!container) {
        console.warn('Telegram container not found: #telegram-login-container')
        return
      }

      // Очищаем только старый скрипт, но не контейнер
      const prevScript = document.getElementById(TELEGRAM_SCRIPT_ID)
      if (prevScript) prevScript.remove()

      // Создаем новый скрипт
      const script = document.createElement('script')
      script.id = TELEGRAM_SCRIPT_ID
      script.src = `https://telegram.org/js/telegram-widget.js?22&ts=${Date.now()}`
      script.async = true
      console.log('Creating new Telegram widget')
      
      script.setAttribute(
        'data-telegram-login',
        import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'DashBoardMetricksBot'
      )
      script.setAttribute('data-size', 'medium')
      script.setAttribute('data-radius', '12')
      script.setAttribute('data-request-access', 'write')
      script.setAttribute('data-userpic', 'false')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')

      // Определяем глобальную функцию авторизации
      window.onTelegramAuth = async (telegramUser) => {
        console.log('Telegram auth triggered:', telegramUser)
        if (!isComponentMounted) return

        try {
          const result = await login({
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            username: telegramUser.username || null,
            photo_url: telegramUser.photo_url || null,
            auth_date: telegramUser.auth_date,
            hash: telegramUser.hash
          })

          if (result?.success) {
            navigate('/bots')
          } else {
            setError(result?.error || 'Ошибка авторизации')
          }
        } catch (err) {
          console.error('Auth error:', err)
          setError('Не удалось войти через Telegram. Попробуйте снова.')
        }
      }
      
      script.onerror = (e) => {
        console.error('Telegram widget load error:', e)
        if (isComponentMounted) {
          setError('Не удалось загрузить Telegram виджет. Проверьте подключение и CSP.')
          setLoading(false)
        }
      }

      script.onload = () => {
        console.log('Telegram widget script loaded')
        
        // Проверяем инициализацию виджета и появление iframe
        checkWidgetInterval = setInterval(() => {
          const container = document.getElementById('telegram-login-container')
          const iframe = container?.querySelector('iframe')
          const isWidgetReady = window.Telegram && window.Telegram.Login && window.Telegram.Login.auth
          
          console.log('Checking widget:', { 
            hasIframe: !!iframe, 
            isWidgetReady,
            containerContent: container?.innerHTML 
          })
          
          if (iframe && isWidgetReady) {
            console.log('Telegram widget fully initialized with iframe')
            if (isComponentMounted) {
              clearInterval(checkWidgetInterval)
              setLoading(false)
              
              // Дополнительная проверка работоспособности виджета
              if (typeof window.onTelegramAuth !== 'function') {
                console.warn('Reinitializing onTelegramAuth handler')
                window.onTelegramAuth = async (telegramUser) => {
                  console.log('Telegram auth triggered:', telegramUser)
                  if (!isComponentMounted) return
                  
                  try {
                    const result = await login({
                      telegram_id: telegramUser.id,
                      first_name: telegramUser.first_name,
                      last_name: telegramUser.last_name || null,
                      username: telegramUser.username || null,
                      photo_url: telegramUser.photo_url || null,
                      auth_date: telegramUser.auth_date,
                      hash: telegramUser.hash
                    })

                    if (result?.success) {
                      navigate('/bots')
                    } else {
                      setError(result?.error || 'Ошибка авторизации')
                    }
                  } catch (err) {
                    console.error('Auth error:', err)
                    setError('Не удалось войти через Telegram. Попробуйте снова.')
                  }
                }
              }
            }
          }
        }, 100)

        // Увеличиваем таймаут до 10 секунд
        initTimeout = setTimeout(() => {
          if (checkWidgetInterval) clearInterval(checkWidgetInterval)
          if (isComponentMounted && loading) {
            const container = document.getElementById('telegram-login-container')
            const iframe = container?.querySelector('iframe')
            const isWidgetReady = window.Telegram && window.Telegram.Login && window.Telegram.Login.auth
            
            console.error('Widget initialization timeout:', {
              hasIframe: !!iframe,
              isWidgetReady,
              containerContent: container?.innerHTML
            })
            
            setError('Не удалось инициализировать Telegram виджет. Попробуйте перезагрузить страницу.')
            setLoading(false)
          }
        }, 10000)
      }

      container.appendChild(script)
    }

    // Инициализируем виджет
    initTelegramWidget()

    // Cleanup функция
    return () => {
      isComponentMounted = false
      if (checkWidgetInterval) clearInterval(checkWidgetInterval)
      if (initTimeout) clearTimeout(initTimeout)
      
      // Удаляем только скрипт, но не чистим контейнер
      const script = document.getElementById(TELEGRAM_SCRIPT_ID)
      if (script) script.remove()
    }
  }, [loading, login, navigate])

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
            <div id="telegram-login-container" className="flex justify-center min-h-[46px] items-center">
              {loading && <LoadingSpinner text="Авторизация..." />}
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