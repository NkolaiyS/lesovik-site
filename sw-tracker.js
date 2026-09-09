// Service Worker для автономного Навигатора Охотника и Рыбака
const CACHE_NAME = 'lesovik-taktik-v8-0';
const ASSETS_TO_CACHE = [
  '/tracker.html',
  '/tracker.webmanifest',
  '/logo.jpeg',
  'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap'
];

// Установка: предварительное кеширование интерфейса
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW Tracker] Кеширование полевых ресурсов...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Активация: очистка устаревших кешей
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW Tracker] Удален старый кеш:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов (Стратегия: Сначала кеш, затем сеть с сохранением)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Не кешируем рекламные сети Яндекса и VK, чтобы не нарушать учет показов
  if (
    requestUrl.hostname.includes('yandex.ru') ||
    requestUrl.hostname.includes('an.yandex.ru') ||
    requestUrl.hostname.includes('ad.mail.ru') ||
    requestUrl.hostname.includes('mc.yandex.ru')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Кешируем только успешные GET-запросы собственного источника
        if (
          event.request.method === 'GET' &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Если сеть оборвалась в тайге и запрашивается страница — отдаем tracker.html из кеша
        if (event.request.mode === 'navigate') {
          return caches.match('/tracker.html');
        }
      });
    })
  );
});
