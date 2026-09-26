const CACHE_NAME = 'proteinprice-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg'
]

// Instalação: armazena em cache os arquivos básicos
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
})

// Ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key)
        })
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: Network First com fallback para Cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignora requisições POST/PUT, extensões ou chamadas externas (Supabase, Mapbox, Photon, Google Auth)
  if (
    event.request.method !== 'GET' ||
    !url.origin.includes(self.location.origin) ||
    url.pathname.startsWith('/api')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html')
          }
        })
      })
  )
})
