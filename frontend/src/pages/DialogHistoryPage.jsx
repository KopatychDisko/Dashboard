import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { botsAPI } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import LoadingOverlay from '../components/LoadingOverlay'
import ViewToggle from '../components/ViewToggle'
import MessageFormatter from '../components/MessageFormatter'
import { formatSessionDate, formatMessageDate } from '../utils/dateFormatter'
import { ArrowLeft, Search, User, MessageSquare, ArrowUp, ArrowDown, Clock, Copy, Check } from 'lucide-react'

const DialogHistoryPage = () => {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [dialogHistory, setDialogHistory] = useState([])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDialog, setLoadingDialog] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Состояние для истории диалога
  const [fromStart, setFromStart] = useState(true) // По умолчанию читаем с начала
  const fromStartRef = useRef(true) // Ref для актуального значения
  const [messagesLimit, setMessagesLimit] = useState(50)
  const [messagesOffset, setMessagesOffset] = useState(0)
  const [totalMessages, setTotalMessages] = useState(0)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  
  // Состояние для отображения подтверждения копирования
  const [copiedField, setCopiedField] = useState(null)
  
  // Обновляем ref при изменении fromStart
  useEffect(() => {
    fromStartRef.current = fromStart
  }, [fromStart])
  
  // Функция копирования в буфер обмена
  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Ошибка копирования:', err)
    }
  }

  // Загрузка пользователей бота (загружаем всех сразу)
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Загружаем всех пользователей сразу (большой лимит)
      const response = await botsAPI.getBotUsers(botId, {
        limit: 1000,
        offset: 0
      })
      
      if (response.data.success) {
        const allUsers = response.data.users || []
        setUsers(allUsers)
      }
    } catch (err) {
      const errorInfo = err.processedError || {}
      const errorMessage = errorInfo.message || err.response?.data?.detail || 'Не удалось загрузить пользователей'
      setError(errorMessage)
      if (import.meta.env.DEV) {
        console.error('Ошибка загрузки пользователей:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [botId])

  // Загрузка истории диалога для выбранного пользователя
  const loadDialogHistory = useCallback(async (userId, reset = true, customFromStart = null) => {
    // Не очищаем ошибку сразу - даем время пользователю увидеть её
    if (reset) {
      setError('')
    }
    
    setLoadingDialog(true)
    
    try {
      // Используем переданное значение или актуальное из ref
      const currentFromStart = customFromStart !== null ? customFromStart : fromStartRef.current
      
      // Вычисляем offset для запроса
      const offsetToUse = reset ? 0 : messagesOffset
      const limitToUse = messagesLimit
      
      const response = await botsAPI.getUserDialogHistory(botId, userId, {
        from_start: currentFromStart,
        limit: limitToUse,
        offset: offsetToUse
      })
      
      if (import.meta.env.DEV) {
        console.log('Загружены сообщения:', {
          from_start: currentFromStart,
          offset: offsetToUse,
          limit: limitToUse,
          received: response.data.messages?.length || 0,
          total: response.data.total || 0,
          reset
        })
      }
      
      if (response.data.success) {
        const newMessages = response.data.messages || []
        const total = response.data.total || 0
        
        if (reset) {
          // При сбросе просто устанавливаем новые сообщения
          setDialogHistory(newMessages)
          setMessagesOffset(newMessages.length)
        } else {
          // При загрузке дополнительных сообщений
          if (currentFromStart) {
            // Читаем с начала - добавляем в конец (следующие сообщения)
            setDialogHistory(prev => [...prev, ...newMessages])
            setMessagesOffset(prev => prev + newMessages.length)
          } else {
            // Читаем с конца - добавляем в начало (более старые сообщения)
            setDialogHistory(prev => [...newMessages, ...prev])
            setMessagesOffset(prev => prev + newMessages.length)
          }
        }
        
        setSession(response.data.session)
        setTotalMessages(total)
        setHasMoreMessages((offsetToUse + newMessages.length) < total)
        
        // Очищаем ошибку только после успешной загрузки
        if (reset) {
          setError('')
        }
      } else {
        const errorMessage = 'Не удалось загрузить историю диалога'
        setError(errorMessage)
        setDialogHistory([])
        setSession(null)
        setTotalMessages(0)
        setHasMoreMessages(false)
      }
    } catch (err) {
      const errorInfo = err.processedError || {}
      const errorMessage = errorInfo.message || err.response?.data?.detail || 'Не удалось загрузить историю диалога'
      
      // Устанавливаем ошибку и не очищаем её автоматически
      setError(errorMessage)
      
      if (import.meta.env.DEV) {
        console.error('Ошибка загрузки истории диалога:', err)
      }
      
      // При ошибке не очищаем данные, если это не первая загрузка
      if (reset) {
        setDialogHistory([])
        setSession(null)
        setTotalMessages(0)
        setHasMoreMessages(false)
      }
    } finally {
      setLoadingDialog(false)
    }
  }, [botId, messagesLimit, messagesOffset])
  
  // Загрузка дополнительных сообщений
  const loadMoreMessages = () => {
    if (!loadingDialog && hasMoreMessages && selectedUser) {
      loadDialogHistory(selectedUser.telegram_id, false)
    }
  }
  
  // Обработчик изменения фильтра (с начала / с конца)
  const handleFilterChange = useCallback((newFromStart) => {
    if (!selectedUser) return
    
    if (import.meta.env.DEV) {
      console.log('Переключение фильтра:', { 
        old: fromStart, 
        new: newFromStart, 
        userId: selectedUser.telegram_id 
      })
    }
    
    // Обновляем состояние
    setFromStart(newFromStart)
    fromStartRef.current = newFromStart
    
    // Сбрасываем все данные и перезагружаем
    setMessagesOffset(0)
    setDialogHistory([])
    setTotalMessages(0)
    setHasMoreMessages(false)
    
    // Перезагружаем с новым фильтром
    loadDialogHistory(selectedUser.telegram_id, true, newFromStart)
  }, [selectedUser, fromStart, loadDialogHistory])

  // Фильтрация пользователей по поисковому запросу
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    
    const query = searchQuery.toLowerCase().trim()
    const queryWithoutAt = query.startsWith('@') ? query.slice(1) : query
    
    return users.filter(user => {
      // Поиск по имени
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const matchesName = fullName.includes(query) || 
                         user.first_name?.toLowerCase().includes(query) || 
                         user.last_name?.toLowerCase().includes(query)
      
      // Поиск по username (без учета @)
      const matchesUsername = user.username?.toLowerCase().includes(queryWithoutAt) || false
      
      // Поиск по telegram_id
      const matchesTelegramId = user.telegram_id?.toString().includes(query) || false
      
      return matchesName || matchesUsername || matchesTelegramId
    })
  }, [users, searchQuery])

  // Обработчик выбора пользователя
  const handleUserSelect = useCallback((user) => {
    setSelectedUser(user)
    setMessagesOffset(0)
    setDialogHistory([])
    setError('') // Очищаем ошибки при выборе нового пользователя
    loadDialogHistory(user.telegram_id, true)
  }, [loadDialogHistory])


  useEffect(() => {
    if (botId) {
      loadUsers()
    }
  }, [botId, loadUsers])

  if (loading && users.length === 0) {
    return (
      <>
        <div className="min-h-screen" />
        <LoadingOverlay text="Загрузка пользователей..." />
      </>
    )
  }

  return (
    <div className="min-h-screen p-2 sm:p-3 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <button
              onClick={() => navigate('/bots')}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl emoji">💬</span>
                <h1 className="text-lg sm:text-xl lg:text-3xl font-bold text-white">
                  История диалогов
                </h1>
              </div>
              <p className="text-xs sm:text-sm lg:text-base text-white/70">
                {botId}
              </p>
            </div>
          </div>
          
          <ViewToggle botId={botId} />
        </div>

        {error && (
          <div className="glass-card p-4 mb-6 bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Список пользователей */}
          <div className="lg:col-span-1">
            <div className="glass-card p-3 sm:p-4 lg:p-6">
              {/* Поиск */}
              <div className="relative mb-3 sm:mb-4">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={16} />
                <input
                  type="text"
                  placeholder="Поиск по имени, username или ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-emerald-400/50 transition-colors"
                />
              </div>

              {/* Список пользователей */}
              <div className="space-y-1.5 sm:space-y-2 max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  <>
                    {filteredUsers.map((user) => (
                      <button
                        key={user.telegram_id}
                        onClick={() => handleUserSelect(user)}
                        className={`w-full p-2 sm:p-2.5 lg:p-3 rounded-lg transition-all text-left ${
                          selectedUser?.telegram_id === user.telegram_id
                            ? 'bg-gradient-to-r from-emerald-400/20 to-blue-400/20 border border-emerald-400/30'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                            {user.first_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm sm:text-base truncate">
                              {user.first_name || 'Без имени'} {user.last_name || ''}
                            </p>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                              {user.username && (
                                <>
                                  <p className="text-white/50 text-[10px] sm:text-xs truncate">
                                    @{user.username}
                                  </p>
                                  <span className="text-white/30 text-[10px] sm:text-xs">•</span>
                                </>
                              )}
                              <p className="text-white/50 text-[10px] sm:text-xs truncate">
                                ID: {user.telegram_id}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/5 flex items-center justify-center">
                      <User size={20} className="sm:w-6 sm:h-6 text-white/50" />
                    </div>
                    <p className="text-white/50 text-xs sm:text-sm">
                      {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* История диалога */}
          <div className="lg:col-span-2">
            <div className="glass-card p-3 sm:p-4 lg:p-6">
              {selectedUser ? (
                <>
                  <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                          {selectedUser.first_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-base sm:text-lg truncate">
                            {selectedUser.first_name || 'Без имени'} {selectedUser.last_name || ''}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                            {selectedUser.username && (
                              <>
                                <p className="text-white/50 text-xs sm:text-sm truncate">@{selectedUser.username}</p>
                                <button
                                  onClick={() => copyToClipboard(selectedUser.username, 'username')}
                                  className="text-white/30 hover:text-white/60 transition-colors p-0.5 sm:p-1"
                                  title="Копировать username"
                                >
                                  {copiedField === 'username' ? (
                                    <Check size={12} className="sm:w-3.5 sm:h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                            <span className="text-white/30 text-xs sm:text-sm">•</span>
                            <span className="text-white/50 text-xs sm:text-sm truncate">ID: {selectedUser.telegram_id}</span>
                            <button
                              onClick={() => copyToClipboard(selectedUser.telegram_id?.toString() || '', 'user-id')}
                              className="text-white/30 hover:text-white/60 transition-colors p-0.5 sm:p-1"
                              title="Копировать User ID"
                            >
                              {copiedField === 'user-id' ? (
                                <Check size={12} className="sm:w-3.5 sm:h-3.5 text-emerald-400" />
                              ) : (
                                <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Фильтр направления чтения */}
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 rounded-lg p-0.5 sm:p-1">
                        <button
                          onClick={() => handleFilterChange(true)}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all text-[10px] sm:text-xs ${
                            fromStart
                              ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-semibold'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <ArrowUp size={12} className="sm:w-3.5 sm:h-3.5" />
                          <span>С начала</span>
                        </button>
                        <button
                          onClick={() => handleFilterChange(false)}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all text-[10px] sm:text-xs ${
                            !fromStart
                              ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-semibold'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <ArrowDown size={12} className="sm:w-3.5 sm:h-3.5" />
                          <span>С конца</span>
                        </button>
                      </div>
                    </div>
                    
                    {session && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-white/50 text-[10px] sm:text-xs flex-wrap">
                        <Clock size={10} className="sm:w-3 sm:h-3" />
                        <span>
                          Сессия создана: {formatSessionDate(session.created_at)}
                        </span>
                        {session.updated_at && session.updated_at !== session.created_at && (
                          <span>• Обновлена: {formatSessionDate(session.updated_at)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {loadingDialog && dialogHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <LoadingSpinner />
                      <p className="text-white/50 text-sm mt-4">Загрузка истории...</p>
                    </div>
                  ) : dialogHistory.length > 0 ? (
                    <>
                      <div className="space-y-2 sm:space-y-3 max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-420px)] lg:max-h-[calc(100vh-320px)] overflow-y-auto">
                        {dialogHistory.map((message, index) => {
                          const isUser = message.role === 'user'
                          
                          const messageDate = formatMessageDate(message.created_at)
                          
                          return (
                            <div
                              key={message.id || index}
                              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-2.5 lg:p-3 ${
                                  isUser
                                    ? 'bg-gradient-to-r from-emerald-400/20 to-blue-400/20 border border-emerald-400/30'
                                    : 'bg-white/5 border border-white/10'
                                }`}
                              >
                                <div className="text-white text-xs sm:text-sm break-words">
                                  <MessageFormatter 
                                    content={message.content || message.text || 'Сообщение'} 
                                  />
                                </div>
                                <p className="text-white/40 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
                                  {messageDate}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Кнопка загрузки дополнительных сообщений */}
                      {hasMoreMessages && (
                        <div className="flex justify-center mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
                          <button
                            onClick={loadMoreMessages}
                            disabled={loadingDialog}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white/70 text-xs sm:text-sm font-medium disabled:opacity-50"
                          >
                            {loadingDialog ? (
                              <>
                                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Загрузка...</span>
                              </>
                            ) : (
                              <>
                                <span>Загрузить еще</span>
                                <span className="text-white/50 text-[10px] sm:text-xs">
                                  ({totalMessages - dialogHistory.length} осталось)
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      
                      {/* Информация о количестве сообщений */}
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-[10px] sm:text-xs text-white/50">
                          <p>
                            Показано {dialogHistory.length} из {totalMessages} сообщений
                          </p>
                          <p>
                            Лимит загрузки: {messagesLimit} сообщений за раз
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 sm:py-20">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/5 flex items-center justify-center">
                        <MessageSquare size={20} className="sm:w-6 sm:h-6 text-white/50" />
                      </div>
                      <p className="text-white/50 text-xs sm:text-sm">История диалога пуста</p>
                      <p className="text-white/30 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
                        {session ? 'В этой сессии нет сообщений' : 'Сессия не найдена'}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 sm:py-20">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <MessageSquare size={20} className="sm:w-6 sm:h-6 text-white/50" />
                  </div>
                  <p className="text-white/50 text-xs sm:text-sm">Выберите пользователя для просмотра истории диалога</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DialogHistoryPage

