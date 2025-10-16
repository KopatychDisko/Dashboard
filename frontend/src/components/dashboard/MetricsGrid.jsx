import React from 'react'
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  ShoppingCart, 
  Repeat, 
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

const MetricsGrid = ({ metrics }) => {
  const metricCards = [
    {
      title: 'Общая выручка',
      value: `₽${metrics.total_revenue?.toLocaleString('ru-RU') || '0'}`,
      change: '+12.5%',
      changeType: 'positive',
      icon: DollarSign,
      iconBg: 'from-orange-400 to-red-400'
    },
    {
      title: 'Новые пользователи',
      value: metrics.new_users?.toLocaleString('ru-RU') || '0',
      change: '+8.3%',
      changeType: 'positive',
      icon: Users,
      iconBg: 'from-emerald-400 to-teal-400'
    },
    {
      title: 'Конверсия в продажу',
      value: `${metrics.conversion_rate || 0}%`,
      change: '+0.8%',
      changeType: 'positive',
      icon: TrendingUp,
      iconBg: 'from-blue-400 to-cyan-400'
    },
    {
      title: 'Средний чек',
      value: `₽${metrics.average_check?.toLocaleString('ru-RU') || '0'}`,
      change: '-3.2%',
      changeType: 'negative',
      icon: ShoppingCart,
      iconBg: 'from-purple-400 to-pink-400'
    },
    {
      title: 'LTV пользователя',
      value: `₽${metrics.ltv?.toLocaleString('ru-RU') || '0'}`,
      change: '+15.7%',
      changeType: 'positive',
      icon: Repeat,
      iconBg: 'from-yellow-400 to-orange-400'
    },
    {
      title: 'Активных сегодня',
      value: metrics.active_today?.toLocaleString('ru-RU') || '0',
      change: `+${Math.floor(Math.random() * 50) + 10}`,
      changeType: 'positive',
      icon: Activity,
      iconBg: 'from-green-400 to-emerald-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {metricCards.map((metric, index) => (
        <MetricCard key={metric.title} metric={metric} delay={index * 100} />
      ))}
    </div>
  )
}

const MetricCard = ({ metric, delay = 0 }) => {
  const IconComponent = metric.icon

  return (
    <div
      className="glass-card relative p-6 hover:scale-105 transition-all duration-300 fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${metric.iconBg} flex items-center justify-center`}>
          <IconComponent size={24} className="text-white" />
        </div>
        
        <div className={`flex items-center gap-1 text-sm ${
          metric.changeType === 'positive' ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {metric.changeType === 'positive' ? (
            <ArrowUp size={16} />
          ) : (
            <ArrowDown size={16} />
          )}
          <span>{metric.change}</span>
        </div>
      </div>
      
      <div className="mb-2">
        <p className="text-white/60 text-sm uppercase tracking-wide mb-1">
          {metric.title}
        </p>
        <p className="text-2xl font-bold text-white">
          {metric.value}
        </p>
      </div>
      
      <p className="text-white/50 text-sm">
        с прошлого периода
      </p>
    </div>
  )
}

export default MetricsGrid