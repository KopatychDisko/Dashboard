import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

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

const SegmentsPieChart = ({ data = [], selectedSegments = [], totalUsers = 0, isFirstLoad = false }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map((item, index) => {
      const colorIndex = index % COLORS.length
      const segmentName = item.segment || 'Без сегмента'
      const isSelected = selectedSegments.length === 0 || selectedSegments.includes(segmentName)
      
      return {
        name: segmentName,
        value: item.count || 0,
        percentage: item.percentage || 0,
        color: COLORS[colorIndex].start,
        colorEnd: COLORS[colorIndex].end,
        isSelected: isSelected,
        opacity: isSelected ? 1 : 0.15 // Невыбранные сегменты делаем полупрозрачными
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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            ></div>
            <p className="text-white font-semibold text-base">{data.name}</p>
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

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const percentage = payload.percentage || 0

    // Показываем только если процент больше 3% И сегмент выбран
    if (percentage < 3 || !payload.isSelected) return null

    return (
      <g>
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-bold"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
          }}
        >
          {`${percentage.toFixed(1)}%`}
        </text>
      </g>
    )
  }

  return (
    <div className="relative">
      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.colorEnd} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={110}
              innerRadius={45}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={3}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={2}
              isAnimationActive={isFirstLoad}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#gradient-${index})`}
                  style={{
                    filter: entry.isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'none',
                    opacity: entry.opacity
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Легенда под диаграммой - показываем только выбранные сегменты */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {chartData.filter(entry => entry.isSelected).map((entry, index) => (
          <div 
            key={`legend-${index}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer group border border-white/10"
          >
            <div 
              className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
              style={{ 
                backgroundColor: entry.color,
                boxShadow: `0 0 8px ${entry.color}60`
              }}
            ></div>
            <span className="text-white/90 text-xs font-medium group-hover:text-white transition-colors">
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SegmentsPieChart

