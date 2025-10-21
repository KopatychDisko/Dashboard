import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { analyticsAPI } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import LoadingOverlay from '../components/LoadingOverlay'
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
      <>
        <div className="min-h-screen" />
        <LoadingOverlay text="Загрузка аналитики..." />
      </>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card relative p-6 sm:p-10 text-center max-w-md w-full mx-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-red-500/20 flex items-center justify-center text-xl sm:text-2xl">
            ❌
          </div>
          <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Ошибка загрузки</h2>
          <p className="text-white/70 text-sm sm:text-base mb-4 sm:mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <button
              onClick={() => navigate('/bots')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              Назад к ботам
            </button>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-lg sm:rounded-xl font-semibold hover:from-emerald-500 hover:to-blue-500 transition-all text-sm sm:text-base w-full sm:w-auto"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/bots')}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold gradient-text">
                📊 Дашбоард бота
              </h1>
              <p className="text-sm sm:text-base text-white/70">
                {botId} • Последнее обновление: {new Date().toLocaleTimeString('ru-RU')}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 rounded-lg sm:rounded-xl p-1">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setPeriod(days)}
                  className={`px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-xs sm:text-sm transition-all ${
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
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl transition-colors text-xs sm:text-sm w-full sm:w-auto"
            >
              <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
              Экспорт
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-lg sm:rounded-xl font-semibold hover:from-emerald-500 hover:to-blue-500 transition-all disabled:opacity-50 text-xs sm:text-sm w-full sm:w-auto"
            >
              <RefreshCw size={16} className={`sm:w-[18px] sm:h-[18px] ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>

        {analytics && (
          <>
            {/* User Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
              {/* Активные пользователи сегодня */}
              <div className="glass-card relative p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center">
                    <Activity size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="mb-1 sm:mb-2">
                  <p className="text-white/60 text-xs sm:text-sm uppercase tracking-wide mb-0.5 sm:mb-1">
                    Активных сегодня
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {analytics.metrics.active_today?.toLocaleString('ru-RU') || '0'}
                  </p>
                </div>
              </div>

              {/* Всего пользователей */}
              <div className="glass-card relative p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center">
                    <Users size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="mb-1 sm:mb-2">
                  <p className="text-white/60 text-xs sm:text-sm uppercase tracking-wide mb-0.5 sm:mb-1">
                    Всего пользователей
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {analytics.metrics.total_users?.toLocaleString('ru-RU') || '0'}
                  </p>
                </div>
              </div>

              {/* Новые пользователи */}
              <div className="glass-card relative p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center">
                    <Users size={20} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="mb-1 sm:mb-2">
                  <p className="text-white/60 text-xs sm:text-sm uppercase tracking-wide mb-0.5 sm:mb-1">
                    Новые пользователи
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {analytics.metrics.new_users?.toLocaleString('ru-RU') || '0'}
                  </p>
                </div>
                <p className="text-white/50 text-xs sm:text-sm">
                  за {analytics.metrics.period_days || 7} дней
                </p>
              </div>
            </div>
            
            {/* Activity Feed */}
            <div className="glass-card relative p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 gradient-text">
                💸 Последние события
              </h3>
              
              <div className="space-y-2 sm:space-y-3">
                {events.length > 0 ? (
                  events.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border-l-2 sm:border-l-4 border-blue-400"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm sm:text-base mb-0.5 sm:mb-1 truncate">
                          {event.title}
                        </p>
                        <p className="text-white/70 text-xs sm:text-sm line-clamp-2">
                          {event.description}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-white/60 text-xs sm:text-sm whitespace-nowrap">
                          {getTimeAgo(event.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8 text-white/50 text-sm sm:text-base">
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