const BUSOL_CACHE = 'busol-hns-v1.7'; // Повысим версию кэша, чтобы заставить браузер обновиться!
const BUSOL_ASSETS = [
  '/busol-mobile.html',
  '/logo.jpeg',
  '/busol.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(BUSOL_CACHE).then((cache) => {
      return cache.addAll(BUSOL_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== BUSOL_CACHE).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Игнорируем сторонние метрики и аналитику
  if (
    event.request.url.includes('mc.yandex.ru') ||
    event.request.url.includes('google-analytics')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Сначала отдаем из кэша (для работы в тайге)
      return cachedResponse || fetch(event.request).catch(() => {
        // Офлайн-фоллбэк (ИСПРАВЛЕНО на busol-mobile.html)
        return caches.match('/busol-mobile.html');
      });
    })
  );
});
