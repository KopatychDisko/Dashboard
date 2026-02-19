import React from 'react'
import { Check } from 'lucide-react'
import SegmentsFilter from '../SegmentsFilter'

const FunnelFilter = React.memo(({ 
  segments = [],
  selectedSegments = [],
  tempSelectedSegments = [],
  onSegmentsChange,
  onApply,
  loading = false
}) => {
  const isApplyDisabled = loading || (
    JSON.stringify([...tempSelectedSegments].sort()) === JSON.stringify([...selectedSegments].sort())
  )

  if (!segments || segments.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <SegmentsFilter
        segments={segments}
        selectedSegments={tempSelectedSegments}
        onSelectionChange={onSegmentsChange}
        label="Фильтр:"
      />
      <button
        onClick={onApply}
        disabled={isApplyDisabled}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-400 to-blue-400 hover:from-emerald-500 hover:to-blue-500 rounded-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check size={16} />
        Применить
      </button>
    </div>
  )
})

FunnelFilter.displayName = 'FunnelFilter'

export default FunnelFilter

