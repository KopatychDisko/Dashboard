import React from 'react'

/**
 * Компонент для форматирования сообщений с поддержкой Markdown и HTML
 * Преобразует Markdown/HTML в читаемый формат как в Telegram
 */
const MessageFormatter = ({ content }) => {
  if (!content) return null

  // Функция для парсинга Markdown/HTML
  const formatMessage = (text) => {
    if (!text) return ''
    
    let formatted = String(text)

    // Сначала обрабатываем код блоки (чтобы не форматировать их содержимое)
    const codeBlocks = []
    formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
      const id = `__CODE_BLOCK_${codeBlocks.length}__`
      codeBlocks.push(`<pre class="bg-gray-800/50 rounded p-2 my-2 overflow-x-auto"><code class="text-sm text-gray-300">${escapeHtml(code.trim())}</code></pre>`)
      return id
    })

    // Обрабатываем inline код
    const inlineCode = []
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
      const id = `__INLINE_CODE_${inlineCode.length}__`
      inlineCode.push(`<code class="bg-gray-800/50 px-1.5 py-0.5 rounded text-yellow-400 text-sm font-mono">${escapeHtml(code)}</code>`)
      return id
    })

    // Убираем HTML теги, но сохраняем их содержимое
    formatted = formatted.replace(/<[^>]+>/g, '')
    
    // Обрабатываем ссылки [text](url) ПЕРЕД другими форматированиями
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">$1</a>')
    
    // Обрабатываем Markdown форматирование
    // **bold** или __bold__ (не внутри других форматирований)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    formatted = formatted.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
    
    // *italic* или _italic_ (но не если это часть **bold**)
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>')
    formatted = formatted.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic">$1</em>')
    
    // Восстанавливаем inline код
    inlineCode.forEach((code, index) => {
      formatted = formatted.replace(`__INLINE_CODE_${index}__`, code)
    })
    
    // Обрабатываем списки
    const lines = formatted.split('\n')
    const formattedLines = []
    let inList = false
    let listType = null // 'ul' или 'ol'
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      
      // Пропускаем код блоки
      if (line.includes('__CODE_BLOCK_')) {
        if (inList) {
          formattedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
          inList = false
          listType = null
        }
        formattedLines.push(line)
        continue
      }
      
      // Маркированный список
      const bulletMatch = line.match(/^[\s]*[-*•]\s+(.+)$/)
      // Нумерованный список
      const numberedMatch = line.match(/^[\s]*(\d+)[.)]\s+(.+)$/)
      
      if (bulletMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) {
            formattedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
          }
          formattedLines.push('<ul class="list-disc list-inside my-2 space-y-1 ml-2">')
          inList = true
          listType = 'ul'
        }
        formattedLines.push(`<li class="ml-2">${bulletMatch[1]}</li>`)
      } else if (numberedMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) {
            formattedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
          }
          formattedLines.push('<ol class="list-decimal list-inside my-2 space-y-1 ml-2">')
          inList = true
          listType = 'ol'
        }
        formattedLines.push(`<li class="ml-2">${numberedMatch[2]}</li>`)
      } else {
        if (inList) {
          formattedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
          inList = false
          listType = null
        }
        if (line.trim()) {
          formattedLines.push(line)
        } else {
          formattedLines.push('<br />')
        }
      }
    }
    
    if (inList) {
      formattedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
    }
    
    formatted = formattedLines.join('\n')
    
    // Восстанавливаем код блоки
    codeBlocks.forEach((block, index) => {
      formatted = formatted.replace(`__CODE_BLOCK_${index}__`, block)
    })
    
    // Переносы строк (но не внутри списков и код блоков)
    formatted = formatted.replace(/\n(?!<[uo]l|<\/[uo]l|<pre|<\/pre)/g, '<br />')
    
    return formatted
  }

  // Функция для экранирования HTML
  const escapeHtml = (text) => {
    if (typeof text !== 'string') return ''
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }

  const formattedContent = formatMessage(content)

  return (
    <div
      className="message-content text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: formattedContent }}
      style={{
        color: '#e5e7eb',
      }}
    />
  )
}

export default MessageFormatter

