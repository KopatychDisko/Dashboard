import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

const getTimeAgo = (timestamp) => {
  try {
    const eventDate = new Date(timestamp)
    return formatDistanceToNow(eventDate, { 
      addSuffix: true, 
      locale: ru 
    })
  } catch (e) {
    return 'недавно'
  }
}

const EventCard = React.memo(({ event }) => {
  return (
    <div className="metric-card p-4 flex items-center justify-between border-l-4 border-blue-400 hover:border-blue-500 transition-all">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-base mb-1 truncate">
          {event.title}
        </p>
        <p className="text-white/70 text-sm line-clamp-2">
          {event.description}
        </p>
      </div>
      <div className="text-right ml-4 flex-shrink-0">
        <div className="px-3 py-1 bg-white/5 rounded-lg">
          <p className="text-white/70 text-xs font-medium whitespace-nowrap">
            {getTimeAgo(event.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
})

EventCard.displayName = 'EventCard'

export default EventCard




