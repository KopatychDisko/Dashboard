import React from 'react'
import { Check } from 'lucide-react'
import SegmentsFilter from '../SegmentsFilter'

const PERIOD_OPTIONS = [1, 7, 14, 30]

const PeriodFilter = React.memo(({ 
  period, 
  tempPeriod, 
  onPeriodChange, 
  selectedSegments = [],
  tempSelectedSegments = [],
  onSegmentsChange,
  segments = [],
  onApply,
  loading = false
}) => {
  const isApplyDisabled = loading || (
    tempPeriod === period && 
    JSON.stringify([...tempSelectedSegments].sort()) === JSON.stringify([...selectedSegments].sort())
  )

  return (
    <div className="flex flex-row items-center gap-4 mb-6 pb-4 border-b border-white/10 flex-wrap">
      {/* Фильтр по времени */}
      <div className="flex items-center gap-3">
        <span className="text-white/70 text-sm font-medium">Период:</span>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
          {PERIOD_OPTIONS.map((days) => (
            <button
              key={days}
              onClick={() => onPeriodChange(days)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                tempPeriod === days
                  ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {days === 1 ? 'Сутки' : `${days}д`}
            </button>
          ))}
        </div>
      </div>
      
      {/* Фильтр по сегментам */}
      {segments.length > 0 && (
        <SegmentsFilter
          segments={segments}
          selectedSegments={tempSelectedSegments}
          onSelectionChange={onSegmentsChange}
          label="Сегменты:"
        />
      )}
      
      {/* Кнопка применения */}
      <button
        onClick={onApply}
        disabled={isApplyDisabled}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-400 to-blue-400 hover:from-emerald-500 hover:to-blue-500 rounded-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
      >
        <Check size={16} />
        Применить
      </button>
    </div>
  )
})

PeriodFilter.displayName = 'PeriodFilter'

export default PeriodFilter

