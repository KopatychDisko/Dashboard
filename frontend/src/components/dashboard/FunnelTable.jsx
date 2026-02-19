import React from 'react'

const FunnelTable = React.memo(({ breakdown = [] }) => {
  if (!breakdown || breakdown.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="text-left py-3 px-4 text-white/80 text-sm font-semibold">Стадия</th>
            <th className="text-right py-3 px-4 text-white/80 text-sm font-semibold">Количество</th>
            <th className="text-right py-3 px-4 text-white/80 text-sm font-semibold">Процент</th>
            <th className="w-32 py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((stage, idx) => (
            <tr key={idx} className="table-row border-b border-white/5">
              <td className="py-3 px-4 text-white font-medium">
                {stage.stage || <span className="text-white/50 italic">Без стадии</span>}
              </td>
              <td className="py-3 px-4 text-right text-white font-semibold">
                {stage.count?.toLocaleString('ru-RU') || '0'}
              </td>
              <td className="py-3 px-4 text-right text-white/80 font-medium">
                {stage.percentage?.toFixed(1) || '0'}%
              </td>
              <td className="py-3 px-4">
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(stage.percentage || 0, 100)}%` }}
                  ></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

FunnelTable.displayName = 'FunnelTable'

export default FunnelTable



