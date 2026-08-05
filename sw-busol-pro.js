/**
 * ============================================================================
 * SERVICE WORKER — ЕДИНЫЙ ОФЛАЙН-КЕШ ЭКОСИСТЕМЫ «ЛЕСОВИК PRO» (v2.9.2)
 * (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
 * ============================================================================
 */

const PRO_CACHE = 'busol-pro-v2.9.2';

// Единый полный список всех 6 модулей и зависимостей для работы в тайге
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
  // Автономная библиотека Excel (SheetJS)
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRO_CACHE).then((cache) => {
      console.log('Lesovik PRO v2.9.2: Загрузка всех 6 приложений в офлайн-кеш...');
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
  // Игнорируем сетевые метрики и рекламу при отсутствии сети
  if (
    event.request.url.includes('mc.yandex.ru') ||
    event.request.url.includes('google-analytics') ||
    event.request.url.includes('yandex.ru/ads')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Если файл есть в кеше телефона — отдаем моментально без интернета
      if (cachedResponse) {
        return cachedResponse;
      }
      // 2. Если файла нет в кеше — пробуем сетевой запрос
      return fetch(event.request).catch(() => {
        // Если сети нет и запрашивается HTML страница — открываем Главную Буссоль
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/busol-pro.html');
        }
      });
    })
  );
});
