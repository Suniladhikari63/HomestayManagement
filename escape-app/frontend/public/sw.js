/* Escape Home — Service Worker (PWA) */
const CACHE = 'escape-home-v2'
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

// Fetch: network-first, fall back to cache (offline support)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip non-http(s) requests (e.g. chrome-extension)
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful same-origin responses
        if (response && response.ok && event.request.url.indexOf('/rest/v1/') === -1) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline: try cache first, fall back to index.html for navigations
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          if (event.request.mode === 'navigate') return caches.match('/')
          return new Response('', { status: 408 })
        })
      })
  )
})

