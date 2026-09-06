/**
 * ============================================================================
 * SERVICE WORKER — ЕДИНЫЙ ОФФЛАЙН-КЕШ ЭКОСИСТЕМЫ «ЛЕСОВИК PRO» (v3.2.0)
 * (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
 * ============================================================================
 */

const PRO_CACHE = 'busol-pro-v3.2.0';

const PRO_ASSETS = [
  '/',
  '/index.html',
  '/busol.html',
  '/busol-pro.html',
  '/height.html',
  '/diameter.html',
  '/bitterlich.html',
  '/journal.html',
  '/mdo.html',
  '/tools.html',
  '/lesovik-core.js',
  '/logo.jpeg',
  '/busol-pro.webmanifest',
  '/height.webmanifest',
  '/diameter.webmanifest',
  '/bitterlich.webmanifest',
  '/journal.webmanifest',
  '/mdo.webmanifest',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
];

// 1. Поштучное отказоустойчивое кэширование
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRO_CACHE).then(async (cache) => {
      console.log('[Lesovik PRO SW] Запуск надежного поштучного кэширования...');
      for (const asset of PRO_ASSETS) {
        try {
          const response = await fetch(asset, { cache: 'no-cache' });
          if (response.ok) {
            await cache.put(asset, response);
          }
        } catch (err) {
          console.warn(`[Lesovik PRO SW] Пропущен ресурс при кэшировании: ${asset}`, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// 2. Активация и удаление старых версий кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== PRO_CACHE).map(key => {
          console.log(`[Lesovik PRO SW] Удаление устаревшего кэша: ${key}`);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Хелпер таймаута для плохой сети в лесу (2 секунды)
function fetchWithTimeout(request, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Network timeout')), timeoutMs);
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

// 3. Перехват запросов (Cache-First для стабильного офлайна)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Игнорируем сетевые метрики и рекламу
  if (
    url.includes('mc.yandex.ru') ||
    url.includes('google-analytics') ||
    url.includes('yandex.ru/ads') ||
    url.includes('an.yandex.ru') ||
    url.includes('mail.ru')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetchWithTimeout(event.request, 2000).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(PRO_CACHE).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Если сети нет, а запрашивается HTML-страница — возвращаем Буссоль PRO
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/busol-pro.html', { ignoreSearch: true });
        }
      });
    })
  );
});
