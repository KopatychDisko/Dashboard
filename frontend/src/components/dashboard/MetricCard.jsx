import React from 'react'

const MetricCard = React.memo(({ 
  icon: Icon, 
  label, 
  value, 
  gradientFrom, 
  gradientTo, 
  bgGradientFrom, 
  bgGradientTo,
  subtitle,
  diffPercentage,
  valueColor = 'text-white'
}) => {
  return (
    <div className="metric-card p-6 relative overflow-hidden">
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl"
        style={{ 
          background: `linear-gradient(to bottom right, ${bgGradientFrom}, transparent)` 
        }}
      ></div>
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` 
            }}
          >
            <Icon size={20} className="text-white" />
          </div>
          <p className="text-white/60 text-sm font-medium">{label}</p>
        </div>
        <p className={`text-4xl font-bold ${valueColor} mb-2`}>
          {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
        </p>
        {subtitle && (
          <p className="text-white/50 text-xs">{subtitle}</p>
        )}
        {diffPercentage !== undefined && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
              diffPercentage >= 0 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {diffPercentage >= 0 ? '↑' : '↓'}
              {Math.abs(diffPercentage).toFixed(1)}%
            </div>
            <span className="text-white/50 text-xs">от предыдущего периода</span>
          </div>
        )}
      </div>
    </div>
  )
})

MetricCard.displayName = 'MetricCard'

export default MetricCard

