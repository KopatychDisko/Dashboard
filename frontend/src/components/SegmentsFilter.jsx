import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

const SegmentsFilter = ({ 
  segments = [], 
  selectedSegments = [], 
  onSelectionChange,
  label = "Сегменты:",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggleAll = () => {
    if (selectedSegments.length === 0) {
      // Выбрать все
      onSelectionChange(segments.map(s => s.segment || 'Без сегмента'))
    } else {
      // Снять все
      onSelectionChange([])
    }
  }

  const handleToggleSegment = (segmentName) => {
    if (selectedSegments.includes(segmentName)) {
      onSelectionChange(selectedSegments.filter(s => s !== segmentName))
    } else {
      onSelectionChange([...selectedSegments, segmentName])
    }
  }

  const displayText = selectedSegments.length === 0 
    ? 'Все' 
    : selectedSegments.length === 1 
      ? selectedSegments[0] 
      : `Выбрано: ${selectedSegments.length}`

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-sm font-medium">{label}</span>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm min-w-[150px] justify-between"
          >
            <span className="text-white truncate">{displayText}</span>
            <ChevronDown 
              size={16} 
              className={`text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-2 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl z-50 min-w-[200px] max-w-[300px] max-h-[400px] overflow-y-auto">
              <div className="p-2">
                {/* Опция "Все" */}
                <button
                  onClick={handleToggleAll}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedSegments.length === 0
                      ? 'bg-gradient-to-r from-emerald-400/20 to-blue-400/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>Все</span>
                  {selectedSegments.length === 0 && (
                    <Check size={16} className="text-emerald-400" />
                  )}
                </button>

                {/* Разделитель */}
                {segments.length > 0 && (
                  <div className="h-px bg-white/10 my-2"></div>
                )}

                {/* Список сегментов */}
                {segments.map((segment) => {
                  const segmentName = segment.segment || 'Без сегмента'
                  const isSelected = selectedSegments.includes(segmentName)
                  return (
                    <button
                      key={segmentName}
                      onClick={() => handleToggleSegment(segmentName)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-400/20 to-blue-400/20 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{segmentName}</span>
                      {isSelected && (
                        <Check size={16} className="text-emerald-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Показываем выбранные сегменты как чипсы, если выбрано несколько */}
        {selectedSegments.length > 0 && selectedSegments.length <= 3 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedSegments.map((segmentName) => (
              <div
                key={segmentName}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-400/20 rounded-lg text-xs"
              >
                <span className="text-white">{segmentName}</span>
                <button
                  onClick={() => handleToggleSegment(segmentName)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SegmentsFilter




