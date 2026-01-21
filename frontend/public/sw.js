// Service Worker для кеширования статических ресурсов и API-ответов
const CACHE_VERSION = 'v1.0.0'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const API_CACHE = `api-${CACHE_VERSION}`

// Статические ресурсы для кеширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// API endpoints для кеширования (только GET запросы)
const CACHEABLE_API_PATTERNS = [
  /\/api\/analytics\/.*\/dashboard/,
  /\/api\/analytics\/.*\/metrics/,
  /\/api\/analytics\/.*\/funnel/,
  /\/api\/bots\/.*/
]

// Время жизни кеша для API (в миллисекундах)
const API_CACHE_TTL = 30 * 1000 // 30 секунд для аналитики

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', CACHE_VERSION)
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  
  // Активируем новый Service Worker сразу
  self.skipWaiting()
})

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', CACHE_VERSION)
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем старые кеши
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Берем контроль над всеми страницами
  return self.clients.claim()
})

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return
  }
  
  // Пропускаем chrome-extension и другие не-HTTP(S) запросы
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Стратегия для статических ресурсов (CSS, JS, изображения)
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }
  
  // Стратегия для API запросов
  if (isCacheableAPI(request.url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE))
    return
  }
  
  // Для остальных запросов используем Network First
  event.respondWith(networkFirst(request))
})

// Проверка, является ли ресурс статическим
function isStaticAsset(url) {
  return (
    url.includes('/assets/') ||
    url.includes('.js') ||
    url.includes('.css') ||
    url.includes('.png') ||
    url.includes('.jpg') ||
    url.includes('.jpeg') ||
    url.includes('.svg') ||
    url.includes('.woff') ||
    url.includes('.woff2') ||
    url.includes('.ttf')
  )
}

// Проверка, можно ли кешировать API запрос
function isCacheableAPI(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url))
}

// Стратегия Cache First (для статических ресурсов)
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    
    if (cached) {
      return cached
    }
    
    const response = await fetch(request)
    
    // Кешируем только успешные ответы
    if (response.ok) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.error('[SW] Cache First error:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Стратегия Network First с кешем (для API)
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName)
  
  try {
    // Пытаемся получить из сети
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Клонируем response для кеширования (нужно до чтения body)
      const responseClone = networkResponse.clone()
      
      // Читаем body для кеширования
      const responseBody = await responseClone.arrayBuffer()
      
      // Создаем новый Response с timestamp в заголовке
      const headers = new Headers(responseClone.headers)
      headers.set('X-Cached-At', Date.now().toString())
      
      const cacheResponse = new Response(responseBody, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      })
      
      // Кешируем ответ
      cache.put(request, cacheResponse)
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    // Пытаемся получить из кеша
    const cached = await cache.match(request)
    
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('X-Cached-At') || '0')
      const age = Date.now() - cachedAt
      
      // Если кеш свежий (меньше TTL), используем его
      if (cachedAt > 0 && age < API_CACHE_TTL) {
        // Читаем body из кеша
        const cachedBody = await cached.arrayBuffer()
        
        // Создаем новый Response с информацией о кеше
        const headers = new Headers(cached.headers)
        headers.set('X-From-Cache', 'true')
        headers.set('X-Cache-Age', age.toString())
        
        return new Response(cachedBody, {
          status: cached.status,
          statusText: cached.statusText,
          headers: headers
        })
      } else if (cachedAt === 0) {
        // Старый формат кеша без timestamp - используем как есть
        return cached
      }
    }
    
    // Если нет в кеше или кеш устарел, возвращаем ошибку
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Нет подключения к интернету и данные не найдены в кеше' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Стратегия Network First (для остальных запросов)
async function networkFirst(request) {
  try {
    return await fetch(request)
  } catch (error) {
    console.error('[SW] Network First error:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(STATIC_CACHE)
    caches.delete(API_CACHE)
  }
})

