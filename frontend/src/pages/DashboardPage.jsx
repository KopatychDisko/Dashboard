import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { analyticsAPI } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import LoadingOverlay from '../components/LoadingOverlay'
import { ArrowLeft, Download, Users, Activity } from 'lucide-react'
import SegmentsFilter from '../components/SegmentsFilter'
import MetricCard from '../components/dashboard/MetricCard'
import SectionHeader from '../components/dashboard/SectionHeader'
import SegmentsTable from '../components/dashboard/SegmentsTable'
import FunnelTable from '../components/dashboard/FunnelTable'
import PeriodFilter from '../components/dashboard/PeriodFilter'
import EventCard from '../components/dashboard/EventCard'
import LoadingSpinnerPeriod from '../components/dashboard/LoadingSpinnerPeriod'
import { convertAnalyticsToCSV, downloadCSV } from '../utils/csvExport'

// ОПТИМИЗАЦИЯ: Lazy loading для тяжелых компонентов графиков
const MetricsGrid = React.lazy(() => import('../components/dashboard/MetricsGrid'))
const RevenueChart = React.lazy(() => import('../components/dashboard/RevenueChart'))
const FunnelChart = React.lazy(() => import('../components/dashboard/FunnelChart'))
const UserGrowthChart = React.lazy(() => import('../components/dashboard/UserGrowthChart'))
const SegmentsPieChart = React.lazy(() => import('../components/dashboard/SegmentsPieChart'))
const FunnelPieChart = React.lazy(() => import('../components/dashboard/FunnelPieChart'))


const DashboardPage = () => {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [detailedMetrics, setDetailedMetrics] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLimit, setEventsLimit] = useState(5) // Лимит отображаемых событий
  const [allEventsLoaded, setAllEventsLoaded] = useState(false) // Все события загружены
  const [loading, setLoading] = useState(true)
  const [loadingPeriodMetrics, setLoadingPeriodMetrics] = useState(false) // Загрузка только метрик за период
  const [selectedSegments, setSelectedSegments] = useState([]) // Выбранные сегменты для фильтрации общих метрик
  const [selectedSegmentsPeriod, setSelectedSegmentsPeriod] = useState([]) // Выбранные сегменты для фильтрации метрик за период
  const [tempPeriod, setTempPeriod] = useState(7) // Временное значение периода до применения
  const [tempSelectedSegmentsPeriod, setTempSelectedSegmentsPeriod] = useState([]) // Временное значение сегментов до применения
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(7)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Ref для хранения интервала polling
  const pollingIntervalRef = useRef(null)
  const REFRESH_INTERVAL = 30000 // 30 секунд

  // Константы для периодов
  const PERIOD_OPTIONS = [1, 7, 14, 30]

  // Мемоизация фильтрованных сегментов
  const filteredSegments = useMemo(() => {
    if (!detailedMetrics?.general_metrics?.segments) return []
    if (selectedSegments.length === 0) return detailedMetrics.general_metrics.segments
    return detailedMetrics.general_metrics.segments.filter(
      s => selectedSegments.includes(s.segment || 'Без сегмента')
    )
  }, [detailedMetrics?.general_metrics?.segments, selectedSegments])

  const loadAnalytics = useCallback(async (silent = false, periodOnly = false) => {
    // Используем ref для получения актуального периода в polling
    const currentPeriod = periodOnly ? period : currentPeriodRef.current
    try {
      if (!silent) {
        if (periodOnly) {
          setLoadingPeriodMetrics(true)
        } else {
          setLoading(true)
        }
      }
      setError('')
      
      if (periodOnly) {
        // Загружаем только метрики за период
        const [dashboardResponse, detailedResponse] = await Promise.all([
          analyticsAPI.getDashboardAnalytics(botId, currentPeriod),
          analyticsAPI.getDetailedMetrics(botId, currentPeriod)
        ])
        
        setAnalytics(dashboardResponse.data)
        // Обновляем только period_metrics и user_growth_chart
        setDetailedMetrics(prev => ({
          ...prev,
          period_metrics: detailedResponse.data.period_metrics,
          user_growth_chart: detailedResponse.data.user_growth_chart,
          active_today: detailedResponse.data.active_today,
          period_days: detailedResponse.data.period_days
        }))
      } else {
        // Загружаем все метрики
        const [dashboardResponse, detailedResponse, eventsResponse] = await Promise.all([
          analyticsAPI.getDashboardAnalytics(botId, currentPeriod),
          analyticsAPI.getDetailedMetrics(botId, currentPeriod),
          analyticsAPI.getRecentEvents(botId, 5)
        ])
        
        setAnalytics(dashboardResponse.data)
        
        // При polling (silent=true) НЕ обновляем метрики за период, чтобы не перезаписывать выбранный пользователем период
        if (silent) {
          // Обновляем только общие метрики и события, но НЕ метрики за период
          setDetailedMetrics(prev => ({
            ...prev,
            general_metrics: detailedResponse.data.general_metrics,
            funnel_breakdown: detailedResponse.data.funnel_breakdown,
            // НЕ обновляем period_metrics, user_growth_chart, active_today, period_days
          }))
        } else {
          // При обычной загрузке обновляем все метрики
          setDetailedMetrics(detailedResponse.data)
        }
        
        if (eventsResponse.data.success) {
          const loadedEvents = eventsResponse.data.events || []
          setEvents(loadedEvents)
          // Если загружено меньше чем запрошено (5), значит все события загружены
          // Если загружено ровно 5, возможно есть еще - кнопка покажется
          setAllEventsLoaded(loadedEvents.length < 5)
          // Сбрасываем лимит только при обычной загрузке (не при polling), чтобы сохранить раскрытие событий
          if (!silent) {
            setEventsLimit(5)
          }
        }
      }
      
      // Обновляем время последнего обновления
      setLastUpdate(new Date())
    } catch (err) {
      // Используем обработанную ошибку из interceptor
      const errorMessage = err.processedError?.message || err.response?.data?.detail || 'Не удалось загрузить аналитику'
      
      if (!silent) {
        setError(errorMessage)
      }
      
      // Логируем только в development
      if (import.meta.env.DEV) {
        console.error('Ошибка загрузки аналитики:', err)
      }
    } finally {
      if (!silent) {
        if (periodOnly) {
          setLoadingPeriodMetrics(false)
        } else {
          setLoading(false)
        }
      }
    }
  }, [botId, period])

  // Обработчик применения фильтров
  const handleApplyFilters = useCallback(() => {
    setPeriod(tempPeriod)
    setSelectedSegmentsPeriod(tempSelectedSegmentsPeriod)
    // Загрузка произойдет в useEffect ниже
  }, [tempPeriod, tempSelectedSegmentsPeriod])

  // Загрузка дополнительных событий
  const loadMoreEvents = useCallback(async () => {
    try {
      const newLimit = eventsLimit + 5
      const previousEventsCount = events.length
      const response = await analyticsAPI.getRecentEvents(botId, newLimit)
      if (response.data.success) {
        const loadedEvents = response.data.events || []
        setEvents(loadedEvents)
        setEventsLimit(newLimit)
        // Если загружено меньше чем запрошено ИЛИ количество событий не увеличилось, значит все события загружены
        if (loadedEvents.length < newLimit || loadedEvents.length === previousEventsCount) {
          setAllEventsLoaded(true)
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки дополнительных событий:', err)
    }
  }, [botId, eventsLimit, events.length])

  // Ref для хранения актуального периода для polling
  const currentPeriodRef = useRef(period)
  
  // Обновляем ref при изменении периода
  useEffect(() => {
    currentPeriodRef.current = period
  }, [period])

  // При изменении периода или сегментов загружаем только метрики за период
  useEffect(() => {
    if (analytics && detailedMetrics) {
      loadAnalytics(false, true)
    }
  }, [period, selectedSegmentsPeriod])

  // Анимация только когда выбраны все сегменты (по умолчанию)
  const shouldAnimateSegmentsChart = selectedSegments.length === 0
  const shouldAnimateFunnelChart = true // Воронка всегда анимируется при первой загрузке

  useEffect(() => {
    // При смене бота загружаем все метрики и синхронизируем временные значения
    setTempPeriod(7)
    setTempSelectedSegmentsPeriod([])
    setPeriod(7)
    setSelectedSegmentsPeriod([])
    setEventsLimit(5) // Сбрасываем лимит событий
    setAllEventsLoaded(false) // Сбрасываем флаг загрузки всех событий
    currentPeriodRef.current = 7 // Обновляем ref
    loadAnalytics(false, false)

    // Очистка предыдущего интервала если есть
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Запускаем polling интервал
    pollingIntervalRef.current = setInterval(() => {
      loadAnalytics(true, false) // Тихая загрузка без loading overlay
    }, REFRESH_INTERVAL)

    // Останавливаем polling когда вкладка неактивна (Page Visibility API)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Останавливаем polling при неактивной вкладке
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      } else {
        // Перезапускаем polling при возврате на вкладку
        if (!pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(() => {
            loadAnalytics(true, false)
          }, REFRESH_INTERVAL)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup при размонтировании или изменении зависимостей
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [botId])

  const handleExport = useCallback(async () => {
    try {
      const response = await analyticsAPI.exportAnalytics(botId, period, 'csv')
      const csvContent = convertAnalyticsToCSV(response.data, period, botId)
      downloadCSV(csvContent, `analytics-${botId}-${period}days.csv`)
    } catch (err) {
      const errorMessage = err.processedError?.message || 'Не удалось экспортировать данные'
      setError(errorMessage)
      if (import.meta.env.DEV) {
        console.error('Ошибка экспорта:', err)
      }
    }
  }, [botId, period])

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
    <div className="min-h-screen p-3 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              onClick={() => navigate('/bots')}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft size={24} className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl emoji">📊</span>
                <h1 className="text-xl lg:text-3xl font-bold text-white">
                  Дашбоард бота
                </h1>
              </div>
              <p className="text-sm lg:text-base text-white/70">
                {botId}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-4">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-white/10 rounded-xl transition-colors text-sm w-full lg:w-auto"
            >
              <Download size={20} />
              Экспорт
            </button>
          </div>
        </div>

        {analytics && detailedMetrics && (
          <>
            {/* ============================================ */}
            {/* ОБЩИЕ МЕТРИКИ (ЗА ВСЕ ВРЕМЯ) */}
            {/* ============================================ */}
            <div className="mb-16 lg:mb-20">
              <SectionHeader
                emoji="📈"
                title="Общие метрики"
                description="Статистика за весь период работы бота"
                gradientFrom="#34d399"
                gradientTo="#60a5fa"
              />
              
              <div className="glass-card relative p-4 lg:p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6">
                <MetricCard
                  icon={Users}
                  label="Всего пользователей"
                  value={detailedMetrics.general_metrics?.total_users || 0}
                  gradientFrom="#60a5fa"
                  gradientTo="#22d3ee"
                  bgGradientFrom="rgba(59, 130, 246, 0.2)"
                  bgGradientTo="transparent"
                />
                
                <div className="metric-card p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-400 to-pink-400 flex items-center justify-center">
                        <Users size={20} className="text-white" />
                      </div>
                      <p className="text-white/60 text-sm font-medium">Заблокировали бота</p>
                    </div>
                    <p className="text-4xl font-bold text-red-400 mb-2">
                      {detailedMetrics.general_metrics?.blocked_users?.toLocaleString('ru-RU') || '0'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar flex-1">
                        <div 
                          className="progress-bar-fill bg-gradient-to-r from-red-400 to-pink-400"
                          style={{ width: `${Math.min(detailedMetrics.general_metrics?.blocked_percentage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-white/50 text-sm font-medium">
                        {detailedMetrics.general_metrics?.blocked_percentage?.toFixed(1) || '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Пользователи по сегментам */}
              {detailedMetrics.general_metrics?.segments && detailedMetrics.general_metrics.segments.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-blue-400 rounded-full"></div>
                      Пользователи по сегментам
                    </h3>
                    {/* Фильтр по сегментам */}
                    <SegmentsFilter
                      segments={detailedMetrics.general_metrics.segments}
                      selectedSegments={selectedSegments}
                      onSelectionChange={setSelectedSegments}
                      label="Фильтр:"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Круговая диаграмма */}
                    <div className="glass-card p-4 lg:p-6 relative overflow-hidden">
                      <Suspense fallback={<div className="h-96 flex items-center justify-center"><LoadingSpinner /></div>}>
                        <SegmentsPieChart 
                          data={detailedMetrics.general_metrics.segments}
                          selectedSegments={selectedSegments}
                          totalUsers={detailedMetrics.general_metrics.total_users}
                          isFirstLoad={shouldAnimateSegmentsChart}
                        />
                      </Suspense>
                    </div>
                    
                    {/* Таблица */}
                    <SegmentsTable segments={filteredSegments} />
                  </div>
                </div>
              )}
              
              {/* Разбивка пользователей по стадиям воронки */}
              {detailedMetrics.funnel_breakdown?.breakdown && detailedMetrics.funnel_breakdown.breakdown.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl emoji">🎯</span>
                    <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                    Разбивка пользователей по стадиям воронки
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Таблица слева */}
                    <FunnelTable breakdown={detailedMetrics.funnel_breakdown.breakdown} />
                    
                    {/* Круговая диаграмма справа */}
                    <div className="glass-card p-4 lg:p-6 relative overflow-hidden">
                      <Suspense fallback={<div className="h-96 flex items-center justify-center"><LoadingSpinner /></div>}>
                        <FunnelPieChart 
                          data={detailedMetrics.funnel_breakdown.breakdown}
                          isFirstLoad={shouldAnimateFunnelChart}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
            
            {/* ============================================ */}
            {/* МЕТРИКИ ЗА ПЕРИОД И РОСТ ПОЛЬЗОВАТЕЛЕЙ */}
            {/* ============================================ */}
            <div className="mb-16 lg:mb-20">
              <SectionHeader
                emoji="📅"
                title="Метрики за период"
                description="Динамика изменений с сравнением с предыдущим периодом"
                gradientFrom="#60a5fa"
                gradientTo="#a78bfa"
              />
              
              <div className="glass-card relative p-4 lg:p-6">
              {/* Фильтры по времени и сегментам */}
              <PeriodFilter
                period={period}
                tempPeriod={tempPeriod}
                onPeriodChange={setTempPeriod}
                selectedSegments={selectedSegmentsPeriod}
                tempSelectedSegments={tempSelectedSegmentsPeriod}
                onSegmentsChange={setTempSelectedSegmentsPeriod}
                segments={detailedMetrics.general_metrics?.segments || []}
                onApply={handleApplyFilters}
                loading={loadingPeriodMetrics}
              />
              
              {loadingPeriodMetrics ? (
                <LoadingSpinnerPeriod />
              ) : (
                <div className="fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
                {/* Новых пользователей */}
                <div className="metric-card p-6 relative overflow-hidden animate-slide-up">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center justify-center">
                        <Users size={20} className="text-white" />
                      </div>
                      <p className="text-white/60 text-sm font-medium">Новых пользователей</p>
                    </div>
                    <p className="text-4xl font-bold text-blue-400 mb-2">
                      {detailedMetrics.period_metrics?.new_users?.count?.toLocaleString('ru-RU') || '0'}
                    </p>
                    {detailedMetrics.period_metrics?.new_users?.diff_percentage !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                          detailedMetrics.period_metrics.new_users.diff_percentage >= 0 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {detailedMetrics.period_metrics.new_users.diff_percentage >= 0 ? '↑' : '↓'}
                          {Math.abs(detailedMetrics.period_metrics.new_users.diff_percentage).toFixed(1)}%
                        </div>
                        <span className="text-white/50 text-xs">от предыдущего периода</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Активных пользователей за период */}
                <div className="metric-card p-6 relative overflow-hidden slide-up">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                        <Activity size={20} className="text-white" />
                      </div>
                      <p className="text-white/60 text-sm font-medium">Активных за период</p>
                    </div>
                    <p className="text-4xl font-bold text-purple-400 mb-2">
                      {detailedMetrics.period_metrics?.active_users?.count?.toLocaleString('ru-RU') || '0'}
                    </p>
                    {detailedMetrics.period_metrics?.active_users?.diff_percentage !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                          detailedMetrics.period_metrics.active_users.diff_percentage >= 0 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {detailedMetrics.period_metrics.active_users.diff_percentage >= 0 ? '↑' : '↓'}
                          {Math.abs(detailedMetrics.period_metrics.active_users.diff_percentage).toFixed(1)}%
                        </div>
                        <span className="text-white/50 text-xs">от предыдущего периода</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Активных сегодня */}
                <div className="metric-card p-6 relative overflow-hidden slide-up">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center">
                        <Activity size={20} className="text-white" />
                      </div>
                      <p className="text-white/60 text-sm font-medium">Активных сегодня</p>
                    </div>
                    <p className="text-4xl font-bold text-green-400 mb-2">
                      {analytics.metrics.active_today?.toLocaleString('ru-RU') || '0'}
                    </p>
                    <p className="text-white/50 text-xs">пользователей сегодня</p>
                  </div>
                </div>
              </div>
              
              {/* График роста пользователей */}
              <div className="mt-6 slide-up">
                <Suspense fallback={<div className="h-96 flex items-center justify-center"><LoadingSpinner /></div>}>
                  <UserGrowthChart data={detailedMetrics.user_growth_chart || []} period={period} />
                </Suspense>
              </div>
              </div>
              )}
              </div>
            </div>
            
            {/* Разделитель */}
            {/* ============================================ */}
            {/* ПОСЛЕДНИЕ СОБЫТИЯ */}
            {/* ============================================ */}
            <div className="mb-16 lg:mb-20">
              <SectionHeader
                emoji="💸"
                title="Последние события"
                description="Активность и важные события бота"
                gradientFrom="#facc15"
                gradientTo="#fb923c"
              />
              
              <div className="glass-card relative p-4 lg:p-6">
                <div className="space-y-3">
                {events.length > 0 ? (
                  events.slice(0, eventsLimit).map((event, index) => (
                    <EventCard key={index} event={event} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-3xl emoji">📭</span>
                    </div>
                    <p className="text-white/50 text-base font-medium">Нет событий</p>
                  </div>
                )}
                {/* Показываем кнопку если есть еще события для загрузки */}
                {events.length >= eventsLimit && !allEventsLoaded && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={loadMoreEvents}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-medium"
                    >
                      Загрузить еще
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage