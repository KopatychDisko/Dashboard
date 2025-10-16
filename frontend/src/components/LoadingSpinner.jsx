import React from 'react'

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-3 border-white/30 border-t-emerald-400 rounded-full animate-spin`}></div>
      {text && (
        <p className="text-white/70 text-sm">{text}</p>
      )}
    </div>
  )
}

export default LoadingSpinner