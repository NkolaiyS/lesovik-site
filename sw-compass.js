const CACHE_NAME = 'lesovik-compass-v3-7';
const ASSETS_TO_CACHE = [
  '/compass.html',
  '/compass.webmanifest',
  '/logo.jpeg',
  'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap'
];

// Установка Service Worker и кэширование ресурсов
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Активация и удаление старых версий кэша компаса (не трогая буссоли)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('lesovik-compass-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Стратегия: Сначала сеть, при отсутствии связи (в глухом лесу) — отдача из кэша
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы метрики и рекламы
  if (event.request.url.includes('mc.yandex.ru') || event.request.url.includes('yandex.ru/ads')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/compass.html');
          }
        });
      })
  );
});
