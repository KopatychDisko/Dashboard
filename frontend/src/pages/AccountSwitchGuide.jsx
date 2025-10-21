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

        <div className="space-y-6">
          {/* Шаг 1 */}
          <div className="glass-card relative p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                1
              </div>
              <h2 className="text-xl font-semibold text-white">Найдите служебный чат Telegram</h2>
            </div>
            <p className="text-white/80 mb-4">
              Откройте Telegram и найдите чат с уведомлениями о безопасности, в который пришло сообщение 
              о первом подключении к сайту.
            </p>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60">
              <img
                src="/assets/chat_telegram.png"
                alt="Служебный чат Telegram"
                className="object-contain max-h-full max-w-full"
              />
            </div>
          </div>

          {/* Шаг 2 */}
          <div className="glass-card relative p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                2
              </div>
              <h2 className="text-xl font-semibold text-white">Найдите сообщение о подключении</h2>
            </div>
            <p className="text-white/80 mb-4">
              В этом чате найдите сообщение о подключении к сайту <span className="text-white font-medium">dshb.lemifar.ru</span>.
            </p>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60">
              <img
                src="/assets/find_msg.png"
                alt="Сообщение о подключении к dshb.lemifar.ru"
                className="object-contain max-h-full max-w-full"
              />
            </div>
          </div>

          {/* Шаг 3 */}
          <div className="glass-card relative p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                3
              </div>
              <h2 className="text-xl font-semibold text-white">Нажмите кнопку "Отключить"</h2>
            </div>
            <p className="text-white/80 mb-4">
              Под сообщением о подключении нажмите кнопку <span className="text-red-400 font-medium">"Отключить"</span> 
              или <span className="text-red-400 font-medium">"Disconnect"</span>.
            </p>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60">
              <img
                src="/assets/btn.png"
                alt="Кнопка 'Отключить' под сообщением"
                className="object-contain max-h-full max-w-full"
              />
            </div>
          </div>

          {/* Шаг 4 */}
          <div className="glass-card relative p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                4
              </div>
              <h2 className="text-xl font-semibold text-white">Войдите под другим аккаунтом</h2>
            </div>
            <p className="text-white/80 mb-4">
              Вернитесь на сайт, нажмите "Войти через Telegram". В окне авторизации нажмите кнопку 
              <span className="text-yellow-400 font-medium"> "Выйти"</span>, затем введите номер телефона нужного аккаунта.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60">
                <img
                  src="./assets/exit.png"
                  alt="Выход из аккаунта"
                  className="object-contain max-h-full max-w-full"
                />
              </div>
              <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60">
                <img
                  src="/assets/end.png"
                  alt="Ввод номера телефона"
                  className="object-contain max-h-full max-w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSwitchGuide