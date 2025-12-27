import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered:', registration.scope)
        
        // Проверяем обновления каждые 60 секунд
        setInterval(() => {
          registration.update()
        }, 60000)
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error)
      })
    
    // Обработка обновлений Service Worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] New Service Worker activated, reloading page...')
      window.location.reload()
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)