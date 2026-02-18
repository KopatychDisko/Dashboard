import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// Другая палитра для диаграммы воронки (отличается от SegmentsPieChart)
const COLORS = [
  { start: '#f59e0b', end: '#d97706' }, // amber
  { start: '#ef4444', end: '#dc2626' }, // red
  { start: '#10b981', end: '#059669' }, // emerald
  { start: '#06b6d4', end: '#0891b2' }, // cyan
  { start: '#8b5cf6', end: '#7c3aed' }, // purple
  { start: '#ec4899', end: '#db2777' }, // pink
  { start: '#f97316', end: '#ea580c' }, // orange
  { start: '#84cc16', end: '#65a30d' }, // lime
  { start: '#6366f1', end: '#4f46e5' }, // indigo
  { start: '#14b8a6', end: '#0d9488' }, // teal
]

const FunnelPieChart = ({ data = [], isFirstLoad = false }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map((item, index) => {
      const colorIndex = index % COLORS.length
      return {
        name: item.stage || 'Без стадии',
        value: item.count || 0,
        percentage: item.percentage || 0,
        color: COLORS[colorIndex].start,
        colorEnd: COLORS[colorIndex].end
      }
    })
  }, [data])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-white/50">
        <div className="text-center">
          <p className="text-lg mb-2">🎯</p>
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
            <p className="text-purple-400 font-bold text-lg">
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

    // Показываем только если процент больше 3%
    if (percentage < 3) return null

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
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient key={`gradient-${index}`} id={`funnel-gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
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
              innerRadius={0}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={2}
              isAnimationActive={isFirstLoad}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#funnel-gradient-${index})`}
                  style={{
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Легенда под диаграммой */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {chartData.map((entry, index) => (
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

export default FunnelPieChart

