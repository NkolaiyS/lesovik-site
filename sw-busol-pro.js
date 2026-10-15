/**
 * ============================================================================
 * SERVICE WORKER — АВТОНОМНЫЙ ОФФЛАЙН-КЕШ «ЛЕСОВИК PRO» (v3.2.2)
 * (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
 * ============================================================================
 */

const PRO_CACHE = 'busol-pro-v3.2.2';

// Базовые локальные ресурсы приложения
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
  '/jszip.min.js',        // Локальный JSZip
  '/xlsx.mini.min.js',    // Локальный SheetJS
  '/busol-pro.webmanifest',
  '/height.webmanifest',
  '/diameter.webmanifest',
  '/bitterlich.webmanifest',
  '/journal.webmanifest',
  '/mdo.webmanifest'
];

// 1. Поштучная надежная предзагрузка в кэш
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRO_CACHE).then(async (cache) => {
      console.log('[Lesovik PRO SW] Старт автономной фиксации файлов...');
      for (const asset of PRO_ASSETS) {
        try {
          const response = await fetch(asset, { cache: 'reload' });
          if (response.ok) {
            await cache.put(asset, response);
          } else {
            console.warn(`[Lesovik PRO SW] Файл недоступен (код ${response.status}): ${asset}`);
          }
        } catch (err) {
          console.warn(`[Lesovik PRO SW] Ошибка предзагрузки ресурса: ${asset}`, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// 2. Активация и полная очистка устаревших версий
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== PRO_CACHE).map((key) => {
          console.log(`[Lesovik PRO SW] Очистка старого кэша: ${key}`);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Хелпер таймаута для нестабильной мобильной связи в лесу
function fetchWithTimeout(request, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Лесной таймаут сети')), timeoutMs);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// 3. Интеллектуальный перехват запросов
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Пропускаем мимо кэша стороннюю аналитику и рекламные трекеры
  if (
    url.hostname.includes('mc.yandex.ru') ||
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('an.yandex.ru') ||
    url.hostname.includes('mail.ru') ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // А. СТРАТЕГИЯ ДЛЯ HTML: Мгновенно из кэша, если оффлайн; иначе Network с таймаутом 1.5с
  if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith((async () => {
      // 1. Если телефон уже в режиме офлайна — отдаём кэш без секундных ожиданий
      if (!navigator.onLine) {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        return caches.match('/busol-pro.html', { ignoreSearch: true });
      }

      // 2. Если связь формально есть (в т.ч. «Е») — ждём сеть максимум 1.5 сек
      try {
        const networkResponse = await fetchWithTimeout(req, 1500);
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(PRO_CACHE).then((cache) => cache.put(req, copy));
        }
        return networkResponse;
      } catch (err) {
        // Связь оборвалась или зависла — мгновенный откат на кэш
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        return caches.match('/busol-pro.html', { ignoreSearch: true });
      }
    })());
    return;
  }

  // Б. СТРАТЕГИЯ ДЛЯ СТАТИКИ (JS, CSS, манифесты, иконки): Cache-First
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetchWithTimeout(req, 2000)
        .then((networkResponse) => {
          // Кэшируем на лету только успешные ответы собственного домена
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            req.method === 'GET' &&
            url.origin === self.location.origin
          ) {
            const copy = networkResponse.clone();
            caches.open(PRO_CACHE).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response('', { status: 408, statusText: 'Offline target not found' });
        });
    })
  );
});
