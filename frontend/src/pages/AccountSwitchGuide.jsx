import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ImageModal = ({ isOpen, onClose, imageSrc, alt }) => {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8 cursor-pointer animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-4 shadow-2xl animate-scaleIn"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '100%' }}
      >
        <div className="relative aspect-video">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full rounded-lg object-contain bg-black/20"
          />
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 text-white/90 hover:text-white bg-black/50 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center transition-all hover:scale-110 hover:rotate-90 duration-300 text-sm"
          >
            ✕
          </button>
        </div>
        <p className="text-white/60 text-center mt-3 text-sm">{alt}</p>
      </div>
    </div>
  )
}

const AccountSwitchGuide = () => {
  const [modalImage, setModalImage] = useState(null)
  
  const navigate = useNavigate()

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Мобильная версия */}
        <div className="flex lg:hidden items-center mb-8">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all group"
          >
            <svg 
              className="w-5 h-5 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Назад</span>
          </button>
          
          <h1 className="text-xl font-bold gradient-text mx-auto">
            Как сменить аккаунт
          </h1>
        </div>

        {/* Десктопная версия */}
        <div className="hidden lg:flex items-center justify-between mb-10">
          <h1 className="text-2xl font-bold gradient-text">
            Как сменить Telegram аккаунт
          </h1>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
          >
            <span>Вернуться к логину</span>
            <svg 
              className="w-5 h-5 transition-transform group-hover:translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60 overflow-hidden">
              <picture>
                <source
                  srcSet="/assets/chat_telegram.png"
                  type="image/png"
                  media="(min-width: 1024px)"
                />
                <source
                  srcSet="/assets/chat_telegram.png"
                  type="image/png"
                  media="(max-width: 1023px)"
                />
                <img
                  src="/assets/chat_telegram.png"
                  alt="Служебный чат Telegram"
                  className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setModalImage({ src: "/assets/chat_telegram.png", alt: "Служебный чат Telegram" })}
                  loading="lazy"
                  decoding="async"
                  fetchpriority="high"
                />
              </picture>
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
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60 overflow-hidden">
              <picture>
                <source
                  srcSet="/assets/find_msg.png"
                  type="image/png"
                  media="(min-width: 1024px)"
                />
                <source
                  srcSet="/assets/find_msg.png"
                  type="image/png"
                  media="(max-width: 1023px)"
                />
                <img
                  src="/assets/find_msg.png"
                  alt="Сообщение о подключении к dshb.lemifar.ru"
                  className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setModalImage({ src: "/assets/find_msg.png", alt: "Сообщение о подключении к dshb.lemifar.ru" })}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
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
              Под сообщением о подключении нажмите кнопку <span className="text-red-400 font-medium">"Отключить" </span>или<span className="text-red-400 font-medium"> "Disconnect"</span>.
            </p>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60 overflow-hidden">
              <picture>
                <source
                  srcSet="/assets/btn.png"
                  type="image/png"
                  media="(min-width: 1024px)"
                />
                <source
                  srcSet="/assets/btn.png"
                  type="image/png"
                  media="(max-width: 1023px)"
                />
                <img
                  src="/assets/btn.png"
                  alt="Кнопка 'Отключить' под сообщением"
                  className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setModalImage({ src: "/assets/btn.png", alt: "Кнопка 'Отключить' под сообщением" })}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </div>
          </div>

          {/* Шаг 4 */}
          <div className="glass-card relative p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                4
              </div>
              <h2 className="text-xl font-semibold text-white">Выйдите из текущего аккаунта</h2>
            </div>
            <p className="text-white/80 mb-4">
              Вернитесь на сайт, нажмите "Войти через Telegram". В окне авторизации найдите и нажмите кнопку 
              <span className="text-yellow-400 font-medium"> "Выйти"</span>.
            </p>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60 overflow-hidden">
              <picture>
                <source
                  srcSet="/assets/exit.png"
                  type="image/png"
                  media="(min-width: 1024px)"
                />
                <source
                  srcSet="/assets/exit.png"
                  type="image/png"
                  media="(max-width: 1023px)"
                />
                <img
                  src="/assets/exit.png"
                  alt="Выход из аккаунта"
                  className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setModalImage({ src: "/assets/exit.png", alt: "Выход из аккаунта" })}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </div>
          </div>

          {/* Шаг 5 */}
          <div className="glass-card relative p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                5
              </div>
              <h2 className="text-xl font-semibold text-white">Войдите под другим аккаунтом</h2>
            </div>
            <p className="text-white/80 mb-4">
              После выхода введите номер телефона того аккаунта Telegram, под которым хотите войти в систему.
            </p>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/60 overflow-hidden">
              <picture>
                <source
                  srcSet="/assets/end.png"
                  type="image/png"
                  media="(min-width: 1024px)"
                />
                <source
                  srcSet="/assets/end.png"
                  type="image/png"
                  media="(max-width: 1023px)"
                />
                <img
                  src="/assets/end.png"
                  alt="Ввод номера телефона"
                  className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setModalImage({ src: "/assets/end.png", alt: "Ввод номера телефона" })}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>
      
      {/* Модальное окно для увеличенного просмотра */}
      <ImageModal
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        imageSrc={modalImage?.src}
        alt={modalImage?.alt}
      />
    </div>
  )
}

export default AccountSwitchGuide