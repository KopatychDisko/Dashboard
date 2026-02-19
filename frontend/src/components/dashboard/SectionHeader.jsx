import React from 'react'

const SectionHeader = React.memo(({ emoji, title, description, gradientFrom, gradientTo }) => {
  return (
    <div className="section-header">
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-1.5 h-10 rounded-full shadow-lg"
          style={{ 
            background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
            boxShadow: `0 4px 12px ${gradientFrom}50`
          }}
        ></div>
        <span className="text-4xl emoji">{emoji}</span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white">{title}</h2>
      </div>
      {description && (
        <p className="text-white/50 text-sm ml-6">{description}</p>
      )}
    </div>
  )
})

SectionHeader.displayName = 'SectionHeader'

export default SectionHeader


