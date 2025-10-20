import React from 'react'
import { useNavigate } from 'react-router-dom'

const AccountSwitchGuide = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text">Как сменить Telegram аккаунт</h1>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            Назад к логину
          </button>
        </div>

        <div className="glass-card relative p-6 space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-white/80">
            <li>
              Откройте служебный чат Telegram <span className="text-white">service notifications</span>
              (вас в него перекидывало при первой авторизации).
            </li>
            <li>
              Найдите сообщение про вход на <span className="text-white">127.0.0.1</span> и нажмите кнопку
              <span className="text-emerald-400"> Отключить</span>.
            </li>
            <li>
              Вернитесь на страницу логина и нажмите «Login with Telegram» —
              теперь сможете авторизоваться под другим аккаунтом (по номеру телефона).
            </li>
            <li>
              При необходимости добавьте/обновите скриншоты ниже.
            </li>
          </ol>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-white/60">
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
              Скрин 1
            </div>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
              Скрин 2
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSwitchGuide

