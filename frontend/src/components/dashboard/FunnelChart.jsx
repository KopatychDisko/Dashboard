import React from 'react'
import { Users, ArrowDown } from 'lucide-react'

const FunnelChart = ({ data }) => {
  // Заглушка с примерными данными если данные не переданы
  const funnelSteps = data?.steps?.length > 0 ? data.steps : [
    {
      stage: 'introduction',
      users_count: 1247,
      percentage: 100,
      revenue: 0,
      avg_check: 0
    },
    {
      stage: 'interest',
      users_count: 811,
      percentage: 65,
      revenue: 150,
      avg_check: 150
    },
    {
      stage: 'consideration',
      users_count: 436,
      percentage: 35,
      revenue: 300,
      avg_check: 300
    },
    {
      stage: 'intent',
      users_count: 187,
      percentage: 15,
      revenue: 750,
      avg_check: 750
    },
    {
      stage: 'purchase',
      users_count: 52,
      percentage: 4.2,
      revenue: 2734,
      avg_check: 2734
    }
  ]

  const getStageTitle = (stage) => {
    const titles = {
      'introduction': 'Знакомство',
      'interest': 'Интерес',
      'consideration': 'Рассмотрение',
      'intent': 'Намерение',
      'purchase': 'Покупка'
    }
    return titles[stage] || stage
  }

  const getStageEmoji = (stage) => {
    const emojis = {
      'introduction': '👋',
      'interest': '👀',
      'consideration': '🤔',
      'intent': '💭',
      'purchase': '💰'
    }
    return emojis[stage] || '📊'
  }

  return (
    <div className="glass-card relative p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold gradient-text mb-2">
          🎯 Воронка продаж
        </h3>
        <p className="text-white/60 text-sm">
          Этапы конверсии пользователей
        </p>
      </div>
      
      <div className="space-y-4">
        {funnelSteps.map((step, index) => (
          <div key={step.stage}>
            <FunnelStep
              step={step}
              title={getStageTitle(step.stage)}
              emoji={getStageEmoji(step.stage)}
              isLast={index === funnelSteps.length - 1}
            />
            {index < funnelSteps.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowDown size={16} className="text-white/30" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">
            Общая конверсия:
          </span>
          <span className="text-emerald-400 font-bold">
            {funnelSteps[funnelSteps.length - 1]?.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

const FunnelStep = ({ step, title, emoji, isLast }) => {
  const maxWidth = 100 // максимальная ширина в процентах
  const width = Math.max(step.percentage, 10) // минимум 10% для видимости

  return (
    <div className="relative">
      <div 
        className="relative bg-gradient-to-r from-emerald-400/20 to-blue-400/20 rounded-xl p-4 transition-all duration-500 hover:from-emerald-400/30 hover:to-blue-400/30"
        style={{ 
          background: `linear-gradient(90deg, 
            rgba(0, 212, 170, ${step.percentage / 500}) 0%, 
            rgba(0, 198, 251, ${step.percentage / 500}) 100%)`
        }}
      >
        {/* Progress bar background */}
        <div 
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-400/10 to-blue-400/10 rounded-xl transition-all duration-1000"
          style={{ width: `${width}%` }}
        />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {emoji}
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">
                {title}
              </h4>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{step.users_count.toLocaleString('ru-RU')} чел</span>
                </div>
                {step.avg_check > 0 && (
                  <span>₽{step.avg_check.toLocaleString('ru-RU')}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">
              {step.percentage.toFixed(1)}%
            </div>
            {step.revenue > 0 && (
              <div className="text-sm text-white/60">
                ₽{step.revenue.toLocaleString('ru-RU')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FunnelChart