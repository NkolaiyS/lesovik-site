/* 
  Service Worker: Лесной Компас и Навигатор (Лесовик ПРО)
  Версия: v5.6 Ultra-Fast Offline & Cache-First Strategy
*/

const CACHE_NAME = 'lesovik-compass-v5-6';
const ASSETS_TO_CACHE = [
  '/',
  '/compass.html',
  '/compass.webmanifest',
  '/logo.jpeg',
  'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap'
];

// 1. Установка и мгновенный предкэш
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Активация и удаление старых версий
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

// 3. Обработка запросов с защитой от долгого висения на слабой связи (Edge/3G)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Пропускаем аналитику и рекламу напрямую, чтобы не блокировать интерфейс
  if (url.includes('mc.yandex.ru') || url.includes('yandex.ru/ads') || url.includes('an.yandex.ru')) {
    return;
  }

  // Для навигации (открытие страницы) используем таймаут: ждем сеть максимум 1200мс
  if (event.request.mode === 'navigate') {
    event.respondWith(
      new Promise((resolve) => {
        let isResolved = false;

        const timer = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            caches.match('/compass.html').then((cached) => {
              if (cached) resolve(cached);
            });
          }
        }, 1200);

        fetch(event.request)
          .then((networkResponse) => {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timer);
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              resolve(networkResponse);
            }
          })
          .catch(() => {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timer);
              caches.match('/compass.html').then((cached) => resolve(cached));
            }
          });
      })
    );
    return;
  }

  // Для шрифтов, картинок и стилей: сначала кэш, если нет — сеть
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
