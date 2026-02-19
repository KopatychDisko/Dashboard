import { useState, useCallback, useEffect } from 'react'
import { analyticsAPI } from '../utils/api'

/**
 * Хук для управления фильтрацией и загрузкой данных воронки
 * @param {string} botId - ID бота
 * @param {number} period - Период для загрузки данных
 * @param {Function} setDetailedMetrics - Функция для обновления детальных метрик
 * @param {Function} setError - Функция для установки ошибки
 * @returns {Object} Объект с состоянием и методами для работы с фильтром воронки
 */
export const useFunnelFilter = (botId, period, setDetailedMetrics, setError) => {
  const [selectedSegments, setSelectedSegments] = useState([])
  const [tempSelectedSegments, setTempSelectedSegments] = useState([])
  const [loading, setLoading] = useState(false)

  // Загрузка данных воронки
  const loadFunnelBreakdown = useCallback(async () => {
    try {
      // Добавляем небольшую задержку для плавной анимации
      setLoading(true)
      setError('')
      
      // Небольшая задержка для плавного появления индикатора загрузки
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const detailedResponse = await analyticsAPI.getDetailedMetrics(
        botId, 
        period, 
        selectedSegments.length > 0 ? selectedSegments : null
      )
      
      // Небольшая задержка перед обновлением данных для плавности
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setDetailedMetrics(prev => ({
        ...prev,
        funnel_breakdown: detailedResponse.data.funnel_breakdown
      }))
    } catch (err) {
      setError('Ошибка загрузки воронки')
      if (import.meta.env.DEV) {
        console.error('Ошибка загрузки воронки:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [botId, period, selectedSegments, setDetailedMetrics, setError])

  // Обработчик применения фильтров
  const handleApplyFilters = useCallback(() => {
    setSelectedSegments(tempSelectedSegments)
    // Загрузка произойдет в useEffect ниже
  }, [tempSelectedSegments])

  // Перезагрузка воронки при изменении примененного фильтра
  useEffect(() => {
    // Загружаем только если setDetailedMetrics доступен (данные уже загружены)
    if (setDetailedMetrics) {
      loadFunnelBreakdown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSegments])

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    setSelectedSegments([])
    setTempSelectedSegments([])
  }, [])

  return {
    selectedSegments,
    tempSelectedSegments,
    setTempSelectedSegments,
    loading,
    handleApplyFilters,
    resetFilters
  }
}

