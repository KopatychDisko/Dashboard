import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { analyticsAPI } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import MetricsGrid from '../components/dashboard/MetricsGrid'
import RevenueChart from '../components/dashboard/RevenueChart'
import FunnelChart from '../components/dashboard/FunnelChart'
import { ArrowLeft, RefreshCw, Calendar, Download } from 'lucide-react'

const DashboardPage = () => {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState(7)

  useEffect(() => {
    loadAnalytics()
  }, [botId, period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await analyticsAPI.getDashboardAnalytics(botId, period)
      setAnalytics(response.data)
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err)
      setError('Не удалось загрузить аналитику')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }

  const handleExport = async () => {
    try {
      const response = await analyticsAPI.exportAnalytics(botId, period, 'json')
      
      // Создаем и скачиваем файл
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `analytics-${botId}-${period}days.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Ошибка экспорта:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка аналитики..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card relative p-10 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center text-2xl">
            ❌
          </div>
          <h2 className="text-xl font-bold mb-3">Ошибка загрузки</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/bots')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              Назад к ботам
            </button>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-xl font-semibold hover:from-emerald-500 hover:to-blue-500 transition-all"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/bots')}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">
                📊 Дашбоард бота
              </h1>
              <p className="text-white/70">
                {botId} • Последнее обновление: {new Date().toLocaleTimeString('ru-RU')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setPeriod(days)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    period === days
                      ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {days}д
                </button>
              ))}
            </div>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              <Download size={18} />
              Экспорт
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-xl font-semibold hover:from-emerald-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>
        </div>

        {analytics && (
          <>
            {/* Metrics Grid */}
            <MetricsGrid metrics={analytics.metrics} />
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <RevenueChart data={analytics.revenue_by_days} />
              </div>
              <div>
                <FunnelChart data={analytics.funnel} />
              </div>
            </div>
            
            {/* Activity Feed */}
            <div className="glass-card relative p-6">
              <h3 className="text-xl font-bold mb-4 gradient-text">
                💸 Последние события
              </h3>
              
              <div className="space-y-3">
                {[
                  {
                    type: 'purchase',
                    title: 'Новая покупка',
                    description: 'Пользователь @user_1234 купил премиум пакет',
                    amount: '+₽4,990',
                    time: '2 мин назад',
                    positive: true
                  },
                  {
                    type: 'upsell',
                    title: 'Апсейл',
                    description: 'Пользователь @alex_92 добавил дополнительную услугу',
                    amount: '+₽1,200',
                    time: '15 мин назад',
                    positive: true
                  },
                  {
                    type: 'referral',
                    title: 'Реферальный бонус',
                    description: '@maria_k привела нового клиента',
                    amount: '+₽500',
                    time: '1 час назад',
                    positive: true
                  },
                  {
                    type: 'refund',
                    title: 'Возврат',
                    description: '@user_567 запросил возврат средств',
                    amount: '-₽1,500',
                    time: '3 часа назад',
                    positive: false
                  }
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border-l-4 border-emerald-400"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-white mb-1">
                        {activity.title}
                      </p>
                      <p className="text-white/70 text-sm">
                        {activity.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-sm mb-1">
                        {activity.time}
                      </p>
                      <p className={`font-bold text-lg ${
                        activity.positive ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {activity.amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage