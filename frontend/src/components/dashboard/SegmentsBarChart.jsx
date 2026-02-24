import React, { useMemo, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = [
  { start: '#3b82f6', end: '#2563eb' }, // blue
  { start: '#8b5cf6', end: '#7c3aed' }, // purple
  { start: '#ec4899', end: '#db2777' }, // pink
  { start: '#10b981', end: '#059669' }, // emerald
  { start: '#f59e0b', end: '#d97706' }, // amber
  { start: '#06b6d4', end: '#0891b2' }, // cyan
  { start: '#84cc16', end: '#65a30d' }, // lime
  { start: '#f97316', end: '#ea580c' }, // orange
  { start: '#6366f1', end: '#4f46e5' }, // indigo
  { start: '#14b8a6', end: '#0d9488' }, // teal
]

const SegmentsBarChart = ({ data = [], selectedSegments = [], totalUsers = 0, isFirstLoad = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Сортируем по количеству пользователей (от большего к меньшему)
    const sortedData = [...data].sort((a, b) => (b.count || 0) - (a.count || 0))
    
    return sortedData.map((item, index) => {
      const colorIndex = index % COLORS.length
      const segmentName = item.segment || 'Без сегмента'
      const isSelected = selectedSegments.length === 0 || selectedSegments.includes(segmentName)
      
      return {
        name: segmentName.length > 15 ? segmentName.substring(0, 15) + '...' : segmentName,
        fullName: segmentName,
        value: item.count || 0,
        percentage: item.percentage || 0,
        color: COLORS[colorIndex].start,
        colorEnd: COLORS[colorIndex].end,
        isSelected: isSelected,
        opacity: isSelected ? 1 : 0.15
      }
    })
  }, [data, selectedSegments])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-white/50">
        <div className="text-center">
          <p className="text-lg mb-2">📊</p>
          <p>Нет данных для отображения</p>
        </div>
      </div>
    )
  }

  // Компонент Tooltip с отслеживанием hover
  const CustomTooltip = ({ active, payload }) => {
    useEffect(() => {
      if (active && payload && payload.length) {
        const data = payload[0].payload
        const index = chartData.findIndex(item => item.fullName === data.fullName)
        if (index !== -1) {
          setHoveredIndex(index)
        }
      } else {
        setHoveredIndex(null)
      }
    }, [active, payload, chartData])
    
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            ></div>
            <p className="text-white font-semibold text-base">{data.fullName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-blue-400 font-bold text-lg">
              {data.value?.toLocaleString('ru-RU') || 0} пользователей
            </p>
            <p className="text-white/70 text-sm">
              {data.percentage?.toFixed(1) || 0}% от общего
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Находим максимальное значение для масштабирования оси Y
  const maxValue = Math.max(...chartData.map(item => item.value), 0)
  const yAxisDomain = [0, Math.ceil(maxValue * 1.1)] // Добавляем 10% отступа сверху

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis
            dataKey="name"
            hide={true}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.5)"
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
            domain={yAxisDomain}
            allowDecimals={false}
            tickFormatter={(value) => Math.round(value)}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={false}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            isAnimationActive={isFirstLoad}
            animationDuration={800}
          >
            {chartData.map((entry, index) => {
              const isHovered = hoveredIndex === index
              return (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{
                    opacity: entry.opacity,
                    filter: isHovered && entry.isSelected 
                      ? `drop-shadow(0 0 12px ${entry.color}80)` 
                      : entry.isSelected 
                        ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' 
                        : 'none',
                    transition: 'filter 0.2s ease'
                  }}
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Легенда под диаграммой - показываем только выбранные сегменты */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {chartData
          .filter(item => item.isSelected)
          .map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-white/80 text-xs font-medium">{item.fullName}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default SegmentsBarChart

