/**
 * Утилита для экспорта данных в CSV формат
 */

export const convertAnalyticsToCSV = (analytics, period, botId) => {
  if (!analytics) return ''
  
  const rows = []
  
  // Заголовок
  rows.push('Метрика,Значение')
  
  // Основные метрики
  if (analytics.metrics) {
    rows.push(`Активных сегодня,${analytics.metrics.active_today || 0}`)
    rows.push(`Всего пользователей,${analytics.metrics.total_users || 0}`)
    rows.push(`Новые пользователи,${analytics.metrics.new_users || 0}`)
    rows.push(`Период (дней),${analytics.metrics.period_days || period}`)
    
    if (analytics.metrics.total_sessions) {
      rows.push(`Всего сессий,${analytics.metrics.total_sessions}`)
    }
    if (analytics.metrics.total_revenue) {
      rows.push(`Общая выручка,${analytics.metrics.total_revenue}`)
    }
    if (analytics.metrics.conversion_rate) {
      rows.push(`Конверсия,${analytics.metrics.conversion_rate}%`)
    }
  }
  
  // Воронка продаж
  if (analytics.funnel && analytics.funnel.steps) {
    rows.push('')
    rows.push('Воронка продаж')
    rows.push('Этап,Пользователей')
    analytics.funnel.steps.forEach(step => {
      rows.push(`${step.stage || step.name || 'Неизвестно'},${step.users_count || 0}`)
    })
  }
  
  // Данные роста пользователей
  if (analytics.user_growth && analytics.user_growth.length > 0) {
    rows.push('')
    rows.push('Рост пользователей по дням')
    rows.push('Дата,Всего пользователей,Новых пользователей,Активных пользователей')
    analytics.user_growth.forEach(day => {
      const date = new Date(day.date).toLocaleDateString('ru-RU')
      rows.push(`${date},${day.total_users || 0},${day.new_users || 0},${day.active_users || 0}`)
    })
  }
  
  // Метаданные
  rows.push('')
  rows.push('Метаданные')
  rows.push(`ID бота,${botId}`)
  rows.push(`Период,${period} дней`)
  rows.push(`Дата экспорта,${new Date().toLocaleString('ru-RU')}`)
  
  return rows.join('\n')
}

export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob(['\ufeff' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}





