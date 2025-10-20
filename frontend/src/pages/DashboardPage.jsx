import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { analyticsAPI } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import MetricsGrid from '../components/dashboard/MetricsGrid'
import RevenueChart from '../components/dashboard/RevenueChart'
import FunnelChart from '../components/dashboard/FunnelChart'
import { ArrowLeft, RefreshCw, Calendar, Download, Users, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

// Функция для форматирования времени относительно МСК
const getTimeAgo = (timestamp) => {
  try {
    const eventDate = new Date(timestamp)
    return formatDistanceToNow(eventDate, { 
      addSuffix: true, 
      locale: ru 
    })
  } catch (e) {
    return 'недавно'
  }
}

const DashboardPage = () => {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [events, setEvents] = useState([])
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
      
      // Загружаем последние события
      const eventsResponse = await analyticsAPI.getRecentEvents(botId, 10)
      if (eventsResponse.data.success) {
        setEvents(eventsResponse.data.events || [])
      }
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
            {/* User Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Активные пользователи сегодня */}
              <div className="glass-card relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center">
                    <Activity size={24} className="text-white" />
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-white/60 text-sm uppercase tracking-wide mb-1">
                    Активных сегодня
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.metrics.active_today?.toLocaleString('ru-RU') || '0'}
                  </p>
                </div>
              </div>

              {/* Всего пользователей */}
              <div className="glass-card relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center">
                    <Users size={24} className="text-white" />
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-white/60 text-sm uppercase tracking-wide mb-1">
                    Всего пользователей
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.metrics.total_users?.toLocaleString('ru-RU') || '0'}
                  </p>
                </div>
              </div>

              {/* Новые пользователи */}
              <div className="glass-card relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center">
                    <Users size={24} className="text-white" />
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-white/60 text-sm uppercase tracking-wide mb-1">
                    Новые пользователи
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.metrics.new_users?.toLocaleString('ru-RU') || '0'}
                  </p>
                </div>
                <p className="text-white/50 text-sm">
                  за {analytics.metrics.period_days || 7} дней
                </p>
              </div>
            </div>
            
            {/* Activity Feed */}
            <div className="glass-card relative p-6">
              <h3 className="text-xl font-bold mb-4 gradient-text">
                💸 Последние события
              </h3>
              
              <div className="space-y-3">
                {events.length > 0 ? (
                  events.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-xl border-l-4 border-blue-400"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-white mb-1">
                          {event.title}
                        </p>
                        <p className="text-white/70 text-sm">
                          {event.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-sm">
                          {getTimeAgo(event.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <p>Нет событий</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage