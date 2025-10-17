import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import LoadingSpinner from '../components/LoadingSpinner'

const TELEGRAM_SCRIPT_ID = 'telegram-login-script'

const LoginPage = () => {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const handlerRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const container = document.getElementById('telegram-login-container')
    if (!container) {
      console.warn('Telegram container not found: #telegram-login-container')
      return
    }

    // Если скрипт уже есть — не добавляем заново
    const existing = document.getElementById(TELEGRAM_SCRIPT_ID)
    if (!existing) {
      const script = document.createElement('script')
      script.id = TELEGRAM_SCRIPT_ID
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.async = true
      script.setAttribute(
        'data-telegram-login',
        import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'DashBoardMetricksBot'
      )
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-radius', '12')
      script.setAttribute('data-request-access', 'write')
      script.setAttribute('data-userpic', 'false')
      // Telegram widget вызывает глобальную onTelegramAuth(user)
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')

      script.onerror = (e) => {
        setError('Не удалось загрузить Telegram виджет. Проверьте подключение и CSP.')
        console.error('Telegram widget load error:', e)
      }

      container.appendChild(script)
    }

    // Определяем глобальную функцию авторизации и сохраняем ссылку для очистки
    const onTelegramAuth = async (telegramUser) => {
      setLoading(true)
      setError('')

      try {
        // ВАЖНО: всегда валидируйте hash на бэкенде (используя бот-токен)
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
          setSuccess(true)
          // перенаправление/сохранение токенов обрабатывается в useAuth
        } else {
          setError(result?.error || 'Ошибка авторизации')
        }
      } catch (err) {
        setError('Не удалось войти через Telegram. Попробуйте снова.')
        console.error('Auth error:', err)
      } finally {
        setLoading(false)
      }
    }

    // Сохраняем ссылку на обработчик, чтобы корректно удалить при cleanup
    handlerRef.current = onTelegramAuth
    window.onTelegramAuth = handlerRef.current

    return () => {
      // Очищаем только свой обработчик
      try {
        if (window.onTelegramAuth && window.onTelegramAuth === handlerRef.current) {
          delete window.onTelegramAuth
        }
      } catch (e) {
        // В некоторых окружениях delete может бросать — на всякий случай fallback
        if (window.onTelegramAuth && window.onTelegramAuth === handlerRef.current) {
          window.onTelegramAuth = undefined
        }
      }

      // Очищаем содержимое контейнера (виджет)
      if (container) {
        container.innerHTML = ''
      }
      // Скрипт оставляем в DOM (ускорит повторное монтирование), но если хочется — можно удалить:
      // const s = document.getElementById(TELEGRAM_SCRIPT_ID); if (s) s.remove();
    }
  }, [login])

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="glass-card relative p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-4xl">
              ✓
            </div>

            <h2 className="text-2xl font-bold mb-3 gradient-text">Успешно!</h2>

            <p className="text-white/70 mb-6">Перенаправление на страницу выбора ботов...</p>

            <LoadingSpinner size="sm" />
          </div>
        </div>
      </div>
    )
  }

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

          <div className="border-t border-white/10 pt-6">
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

        <p className="text-center text-white/50 text-sm mt-6">
          Нажимая "Login with Telegram", вы соглашаетесь с условиями использования
        </p>
      </div>
    </div>
  )
}

export default LoginPage