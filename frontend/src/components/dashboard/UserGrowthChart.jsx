import React, { useMemo } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, BarChart, Bar, Cell } from 'recharts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const UserGrowthChart = React.memo(({ data = [], period = 7, uniqueActiveUsersPeriod = null }) => {
  // ОПТИМИЗАЦИЯ: Мемоизация преобразования данных - пересчитываем только при изменении data или period
  const chartData = useMemo(() => {
    if (data.length > 0) {
      return data.map(item => ({
        date: format(new Date(item.date), 'dd MMM', { locale: ru }),
        new_users: item.new_users || 0,
        active_users: item.active_users || 0,
        fullDate: item.date
      }))
    } else {
      const mockData = []
      const now = new Date()
      for (let i = period - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        mockData.push({
          date: date.toISOString(),
          new_users: Math.floor(Math.random() * 25) + 5,
          active_users: Math.floor(Math.random() * 60) + 15
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

  // Данные для столбчатого графика за 1 день — два столбца: "Новые" и "Активные"
  const barData = useMemo(() => {
    if (period !== 1) return []
    const totalNew = chartData.reduce((sum, item) => sum + item.new_users, 0)
    const totalActive = chartData.reduce((sum, item) => sum + item.active_users, 0)
    return [
      { name: 'Новые', value: totalNew, fill: 'url(#newUsersBarGradient)' },
      { name: 'Активные', value: totalActive, fill: 'url(#activeUsersBarGradient)' }
    ]
  }, [chartData, period])
  
  // ОПТИМИЗАЦИЯ: Мемоизация вычислений для статистики
  const stats = useMemo(() => {
    const totalNewUsers = chartData.reduce((sum, item) => sum + item.new_users, 0)
    // Для среднего активных/день используем сумму активных по дням (не уникальных!)
    // Потому что если пользователь был активен в 5 дней, он должен учитываться 5 раз при расчете среднего за день
    const totalActiveUsersByDays = chartData.reduce((sum, item) => sum + item.active_users, 0)
    const avgNewUsers = totalNewUsers / period
    const avgActiveUsers = totalActiveUsersByDays / period
    
    return { avgNewUsers, avgActiveUsers }
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

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">За сутки</p>
          <p className={data.payload.name === 'Новые' ? 'text-blue-400' : 'text-purple-400'}>
            {data.payload.name}: {data.value.toLocaleString('ru-RU')}
          </p>
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
          Динамика роста аудитории за {period} {period === 1 ? 'день' : period < 5 ? 'дня' : 'дней'}
        </p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {period === 1 ? (
            // Для одного дня — два столбца: Новые и Активные
            <BarChart
              data={barData}
              margin={{ top: 20, right: 40, left: 40, bottom: 5 }}
              barCategoryGap="30%"
            >
              <defs>
                <linearGradient id="newUsersBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="activeUsersBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.7)"
                fontSize={13}
                tickLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
                allowDecimals={false}
                tickFormatter={(value) => Math.round(value).toLocaleString('ru-RU')}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                barSize={60}
                label={{ position: 'top', fill: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold' }}
              >
                {barData.map((entry, index) => (
                  <Cell key={index} fill={index === 0 ? 'url(#newUsersBarGradient)' : 'url(#activeUsersBarGradient)'} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            // Для нескольких дней используем комбинированный график с областями
            <ComposedChart
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
                <linearGradient id="activeUsersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
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
                stroke="rgba(255,255,255,0.7)"
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
              
              {/* Область активных пользователей */}
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="active_users"
                stroke="#a855f7"
                strokeWidth={3}
                fill="url(#activeUsersGradient)"
                name="Активные пользователи"
                dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2 }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {period > 1 && (
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <p className="text-white/60 mb-1">Среднее новых/день</p>
            <p className="text-blue-400 font-bold text-lg">
              {Math.round(stats.avgNewUsers).toLocaleString('ru-RU')}
            </p>
          </div>
          
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <p className="text-white/60 mb-1">Среднее активных/день</p>
            <p className="text-purple-400 font-bold text-lg">
              {Math.round(stats.avgActiveUsers).toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
})

UserGrowthChart.displayName = 'UserGrowthChart'

export default UserGrowthChart
