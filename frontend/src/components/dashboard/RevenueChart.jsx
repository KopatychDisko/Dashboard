import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const RevenueChart = ({ data = [] }) => {
  // Преобразуем данные для графика с проверкой на пустые данные
  const chartData = data.length > 0 ? data.map(item => ({
    date: format(new Date(item.date), 'dd MMM', { locale: ru }),
    revenue: item.revenue,
    orders: item.orders_count
  })) : [
    // Заглушка с примерными данными для демонстрации
    { date: '10 дек', revenue: 15000, orders: 5 },
    { date: '11 дек', revenue: 18000, orders: 7 },
    { date: '12 дек', revenue: 12000, orders: 4 },
    { date: '13 дек', revenue: 22000, orders: 8 },
    { date: '14 дек', revenue: 25000, orders: 9 },
    { date: '15 дек', revenue: 19000, orders: 6 },
    { date: '16 дек', revenue: 28000, orders: 10 }
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-emerald-400">
              Выручка: ₽{payload[0].value.toLocaleString('ru-RU')}
            </p>
            <p className="text-blue-400">
              Заказов: {payload[0].payload.orders}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="glass-card relative p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold gradient-text mb-2">
          📊 Выручка по дням
        </h3>
        <p className="text-white/60 text-sm">
          Динамика доходов за выбранный период
        </p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.7)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.7)"
              fontSize={12}
              tickFormatter={(value) => `₽${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="revenue" 
              fill="url(#revenueGradient)"
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4aa" stopOpacity={1} />
                <stop offset="100%" stopColor="#00c6fb" stopOpacity={0.8} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm text-white/60">
        <span>
          Общая выручка: ₽{chartData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('ru-RU')}
        </span>
        <span>
          Всего заказов: {chartData.reduce((sum, item) => sum + item.orders, 0)}
        </span>
      </div>
    </div>
  )
}

export default RevenueChart