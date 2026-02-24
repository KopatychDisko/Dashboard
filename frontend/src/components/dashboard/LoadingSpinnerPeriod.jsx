import React from 'react'

const LoadingSpinnerPeriod = React.memo(() => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-emerald-400 rounded-full animate-spin"></div>
      </div>
      <p className="text-white/70 text-sm animate-pulse">Загрузка метрик...</p>
    </div>
  )
})

LoadingSpinnerPeriod.displayName = 'LoadingSpinnerPeriod'

export default LoadingSpinnerPeriod





