import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const UserGrowthChart = React.memo(({ data = [], period = 7 }) => {
  // ОПТИМИЗАЦИЯ: Мемоизация преобразования данных - пересчитываем только при изменении data или period
  const chartData = useMemo(() => {
    if (data.length > 0) {
      const mapped = data.map(item => ({
        date: format(new Date(item.date), 'dd MMM', { locale: ru }),
        new_users: item.new_users || 0,
        active_users: item.active_users || 0,
        fullDate: item.date
      }))
      // Логирование для диагностики
      const totalActive = mapped.reduce((sum, item) => sum + item.active_users, 0)
      const totalNew = mapped.reduce((sum, item) => sum + item.new_users, 0)
      const maxActive = Math.max(...mapped.map(item => item.active_users), 0)
      const maxNew = Math.max(...mapped.map(item => item.new_users), 0)
      
      console.log('📊 UserGrowthChart data:', {
        original: data,
        mapped: mapped,
        totalActive,
        totalNew,
        maxActive,
        maxNew,
        hasActiveData: mapped.some(item => item.active_users > 0)
      })
      
      // Проверяем, есть ли данные об активных пользователях
      if (totalActive === 0 && totalNew > 0) {
        console.warn('⚠️ ВНИМАНИЕ: Активных пользователей нет, но новые пользователи есть!')
      }
      
      return mapped
    } else {
      // Генерируем mock данные внутри useMemo
      const mockData = []
      const now = new Date()
      for (let i = period - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dailyGrowth = Math.floor(Math.random() * 25) + 5
        const activeUsers = Math.floor(dailyGrowth * 3) + Math.floor(Math.random() * 20)
        mockData.push({
          date: date.toISOString(),
          new_users: dailyGrowth,
          active_users: activeUsers
        })
      }
      return mockData.map(item => ({
        date: format(new Date(item.date), 'dd MMM', { locale: ru }),
        new_users: item.new_users,
        active_users: item.active_users,
        fullDate: item.date
      }))
    }
  }, [data, period])
  
  // ОПТИМИЗАЦИЯ: Мемоизация вычислений для статистики
  const stats = useMemo(() => {
    const totalNewUsers = chartData.reduce((sum, item) => sum + item.new_users, 0)
    const totalActiveUsers = chartData.reduce((sum, item) => sum + item.active_users, 0)
    const avgNewUsers = totalNewUsers / period
    const avgActiveUsers = totalActiveUsers / period
    
    return { totalNewUsers, totalActiveUsers, avgNewUsers, avgActiveUsers }
  }, [chartData, period])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-blue-400">
              Новых: +{payload.find(p => p.dataKey === 'new_users')?.value?.toLocaleString('ru-RU') || 0}
            </p>
            <p className="text-purple-400">
              Активных: {payload.find(p => p.dataKey === 'active_users')?.value?.toLocaleString('ru-RU') || 0}
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
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl emoji">📈</span>
          <h3 className="text-xl font-bold text-white">
            Рост пользователей
          </h3>
        </div>
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
              yAxisId="left"
              stroke="rgba(255,255,255,0.7)"
              fontSize={12}
              allowDecimals={false}
              tickFormatter={(value) => Math.round(value).toLocaleString('ru-RU')}
              domain={[0, 'auto']}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="rgba(168,85,247,0.7)"
              fontSize={12}
              allowDecimals={false}
              tickFormatter={(value) => Math.round(value).toLocaleString('ru-RU')}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Область новых пользователей */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="new_users"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#newUsersGradient)"
              name="Новые пользователи"
            />
            
            {/* Линия активных пользователей */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="active_users"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ fill: '#a855f7', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: '#a855f7', strokeWidth: 2 }}
              name="Активные пользователи"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-white/60 mb-1">Всего новых</p>
          <p className="text-blue-400 font-bold text-lg">
            {stats.totalNewUsers.toLocaleString('ru-RU')}
          </p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-white/60 mb-1">Среднее новых/день</p>
          <p className="text-blue-400 font-bold text-lg">
            {Math.round(stats.avgNewUsers).toLocaleString('ru-RU')}
          </p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-white/60 mb-1">Всего активных</p>
          <p className="text-purple-400 font-bold text-lg">
            {stats.totalActiveUsers.toLocaleString('ru-RU')}
          </p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-white/60 mb-1">Среднее активных/день</p>
          <p className="text-purple-400 font-bold text-lg">
            {Math.round(stats.avgActiveUsers).toLocaleString('ru-RU')}
          </p>
        </div>
      </div>
    </div>
  )
})

UserGrowthChart.displayName = 'UserGrowthChart'

export default UserGrowthChart
