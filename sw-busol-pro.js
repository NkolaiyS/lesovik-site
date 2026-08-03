const PRO_CACHE = 'busol-pro-v2.7.3';
const PRO_ASSETS = [
  '/busol-pro.html',
  '/lesovik-core.js',
  '/version.json',
  '/busol-pro.webmanifest',
  '/logo.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRO_CACHE).then((cache) => {
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
  if (
    event.request.url.includes('mc.yandex.ru') ||
    event.request.url.includes('google-analytics')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        return caches.match('/busol-pro.html');
      });
    })
  );
});
