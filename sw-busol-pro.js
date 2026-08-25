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
      console.log('[Lesovik PRO SW] Кэширование автономных инструментов PRO...');
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

// Хелпер таймаута: если сеть не ответила за 2.5 сек, принудительно отдаем кэш
function fetchWithTimeout(request, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Network timeout (Е-шка)')), timeoutMs);
    fetch(request).then(
      response => {
        clearTimeout(timer);
        resolve(response);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Игнорируем сетевые метрики и рекламу
  if (
    url.includes('mc.yandex.ru') ||
    url.includes('google-analytics') ||
    url.includes('yandex.ru/ads') ||
    url.includes('an.yandex.ru')
  ) {
    return;
  }

  event.respondWith(
    // 1. Сначала проверяем локальный кэш (с игнорированием ?key= и прочих GET-параметров)
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Если в кэше нет — идем в сеть, но с жестким таймаутом
      return fetchWithTimeout(event.request, 2500).catch(() => {
        // Если сеть зависла или недоступна, а запрашивается страница — открываем Буссоль PRO
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/busol-pro.html', { ignoreSearch: true });
        }
      });
    })
  );
});
