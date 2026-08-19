/**
 * ============================================================================
 * SERVICE WORKER — ЕДИНЫЙ ОФФЛАЙН-КЕШ ЭКОСИСТЕМЫ «ЛЕСОВИК PRO» (v2.9.9)
 * (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
 * ============================================================================
 */

const PRO_CACHE = 'busol-pro-v2.9.9';

const PRO_ASSETS = [
  '/',
  '/index.html',
  '/busol-pro.html',
  '/height.html',
  '/diameter.html',
  '/bitterlich.html',
  '/journal.html',
  '/mdo.html',
  '/lesovik-core.js',
  '/version.json',
  '/logo.jpeg',
  '/busol-pro.webmanifest',
  '/height.webmanifest',
  '/diameter.webmanifest',
  '/bitterlich.webmanifest',
  '/journal.webmanifest',
  '/mdo.webmanifest',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRO_CACHE).then((cache) => {
      console.log('[Lesovik PRO SW] Кэширование 6 автономных инструментов PRO...');
      return cache.addAll(PRO_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== PRO_CACHE && key.startsWith('busol-pro')).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Игнорируем сетевые метрики и рекламу (пропускаем мимо кэша)
  if (
    url.includes('mc.yandex.ru') ||
    url.includes('google-analytics') ||
    url.includes('yandex.ru/ads') ||
    url.includes('an.yandex.ru')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Если сети нет и запрашивается страница — открываем строго Буссоль PRO
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/busol-pro.html');
        }
      });
    })
  );
});
