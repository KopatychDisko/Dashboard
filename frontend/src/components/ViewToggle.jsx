import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BarChart3, MessageSquare } from 'lucide-react'

/**
 * Компонент переключения между Dashboard и Dialog History
 * @param {string} botId - ID текущего бота
 */
const ViewToggle = ({ botId }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isDashboard = location.pathname.includes('/dashboard')
  const isDialogHistory = location.pathname.includes('/dialog-history')
  
  const handleDashboardClick = () => {
    if (botId) {
      navigate(`/dashboard/${botId}`)
    }
  }
  
  const handleDialogHistoryClick = () => {
    if (botId) {
      navigate(`/dialog-history/${botId}`)
    }
  }
  
  if (!botId) return null
  
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
      <button
        onClick={handleDashboardClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          isDashboard
            ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-semibold'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <BarChart3 size={18} />
        <span className="text-sm">Dashboard</span>
      </button>
      
      <button
        onClick={handleDialogHistoryClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          isDialogHistory
            ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-semibold'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <MessageSquare size={18} />
        <span className="text-sm">История диалогов</span>
      </button>
    </div>
  )
}

export default ViewToggle


