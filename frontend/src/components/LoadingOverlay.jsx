import React from 'react'

const LoadingOverlay = ({ text = 'Загрузка...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-transparent backdrop-blur-sm" />

      <div className="relative glass-card p-8 rounded-2xl shadow-xl text-center w-[300px]">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
        </div>

        <p className="text-white font-semibold mb-1">{text}</p>
        <p className="text-white/60 text-sm">Пожалуйста, подождите…</p>

        <div className="mt-4 flex items-center justify-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:-0.2s]" />
          <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay


