import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const UserGrowthChart = ({ data = [], period = 7 }) => {
  // Генерируем данные для демонстрации если нет реальных данных
  const generateMockData = () => {
    const mockData = []
    const now = new Date()
    
    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      // Имитируем рост пользователей с небольшими колебаниями
      const baseUsers = 100 + (period - 1 - i) * 15
      const dailyGrowth = Math.floor(Math.random() * 25) + 5
      const totalUsers = baseUsers + dailyGrowth
      
      mockData.push({
        date: date.toISOString(),
        total_users: totalUsers,
        new_users: dailyGrowth,
        active_users: Math.floor(totalUsers * 0.3) + Math.floor(Math.random() * 20)
      })
    }
    
    return mockData
  }

  // Преобразуем данные для графика
  const chartData = data.length > 0 ? data.map(item => ({
    date: format(new Date(item.date), 'dd MMM', { locale: ru }),
    total_users: item.total_users || 0,
    new_users: item.new_users || 0,
    active_users: item.active_users || 0,
    fullDate: item.date
  })) : generateMockData().map(item => ({
    date: format(new Date(item.date), 'dd MMM', { locale: ru }),
    total_users: item.total_users,
    new_users: item.new_users,
    active_users: item.active_users,
    fullDate: item.date
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-emerald-400">
              Всего пользователей: {payload[0].payload.total_users.toLocaleString('ru-RU')}
            </p>
            <p className="text-blue-400">
              Новых: +{payload[0].payload.new_users.toLocaleString('ru-RU')}
            </p>
            <p className="text-purple-400">
              Активных: {payload[0].payload.active_users.toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const totalGrowth = chartData.length > 1 
    ? chartData[chartData.length - 1].total_users - chartData[0].total_users 
    : 0

  const growthPercentage = chartData.length > 1 && chartData[0].total_users > 0
    ? ((totalGrowth / chartData[0].total_users) * 100).toFixed(1)
    : 0

  return (
    <div className="glass-card relative p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold gradient-text mb-2">
          📈 Рост пользователей
        </h3>
        <p className="text-white/60 text-sm">
          Динамика роста аудитории за {period} дней
        </p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#00d4aa" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="newUsersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.7)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.7)"
              fontSize={12}
              tickFormatter={(value) => value.toLocaleString('ru-RU')}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Основная область - общее количество пользователей */}
            <Area
              type="monotone"
              dataKey="total_users"
              stroke="#00d4aa"
              strokeWidth={3}
              fill="url(#userGrowthGradient)"
            />
            
            {/* Линия новых пользователей */}
            <Line
              type="monotone"
              dataKey="new_users"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-white/60 mb-1">Общий рост</p>
          <p className="text-emerald-400 font-bold text-lg">
            +{totalGrowth.toLocaleString('ru-RU')}
          </p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-white/60 mb-1">Прирост</p>
          <p className="text-emerald-400 font-bold text-lg">
            {growthPercentage > 0 ? '+' : ''}{growthPercentage}%
          </p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-white/60 mb-1">Средний прирост/день</p>
          <p className="text-blue-400 font-bold text-lg">
            +{Math.round(totalGrowth / period).toLocaleString('ru-RU')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default UserGrowthChart
