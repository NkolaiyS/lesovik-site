/**
 * ============================================================================
 * SERVICE WORKER — АВТОНОМНЫЙ ОФФЛАЙН-КЕШ «ЛЕСОВИК PRO» (v3.2.3)
 * (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
 * ============================================================================
 *
 * Стратегии:
 *  • HTML-страницы (навигация): сеть с таймаутом 1.5 с → при медленной связи отдаётся кэш,
 *    а запрос доводится до конца в фоне и обновляет кэш. Если кэша нет — ждём сеть без лимита.
 *  • Статика (script / style / image / font / manifest) своего домена:
 *      – тяжёлые неизменяемые файлы (JSZip, SheetJS, логотип): cache-first;
 *      – остальное (lesovik-core.js, манифесты, CSS): stale-while-revalidate (мгновенно из кэша + фоновое обновление).
 *  • Всё остальное (POST, fetch/XHR к API, лицензии, чужие домены, аналитика, Range) — НЕ перехватывается.
 *
 * ВАЖНО: при каждом релизе увеличивайте VERSION.
 */
'use strict';

const VERSION = 'v3.2.3';
const CACHE_PREFIX = 'busol-pro-';
const PRO_CACHE = CACHE_PREFIX + VERSION;

const NAV_TIMEOUT_MS = 1500;
const START_PAGE = '/busol-pro.html';

// Без этих файлов приложение офлайн не заработает — если не скачались, установка отменяется,
// а прежняя рабочая версия воркера остаётся активной.
const CRITICAL_ASSETS = [
  '/busol-pro.html',
  '/lesovik-core.js',
  '/busol-pro.webmanifest'
];

// Остальное докачивается «по возможности»: недоступный файл не ломает установку.
const OPTIONAL_ASSETS = [
  '/',
  '/index.html',
  '/busol.html',
  '/height.html',
  '/diameter.html',
  '/bitterlich.html',
  '/journal.html',
  '/mdo.html',
  '/tools.html',
  '/logo.jpeg',
  '/jszip.min.js',
  '/xlsx.mini.min.js',
  '/height.webmanifest',
  '/diameter.webmanifest',
  '/bitterlich.webmanifest',
  '/journal.webmanifest',
  '/mdo.webmanifest'
];

// Тяжёлые файлы, которые не меняются между релизами — не перекачиваем на мобильной связи
const CACHE_FIRST_PATHS = new Set(['/jszip.min.js', '/xlsx.mini.min.js', '/logo.jpeg']);

// Только эти типы запросов считаются «статикой». API-запросы (fetch/XHR, destination === '') идут мимо кэша.
const STATIC_DESTINATIONS = new Set(['script', 'style', 'image', 'font', 'manifest']);

const MATCH_OPTS = { ignoreVary: true };

// Ключ кэша = адрес без ?query и #hash
function cacheKey(url) {
  return url.origin + url.pathname;
}

// Ответ после редиректа (response.redirected) нельзя отдавать на навигацию — пересоздаём «чистый» ответ
async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

function putInCache(key, response) {
  return caches.open(PRO_CACHE)
    .then((cache) => cache.put(key, response))
    .catch((err) => console.warn('[Lesovik PRO SW] Не удалось записать в кэш:', key, err));
}

function offlineResponse() {
  const html =
    '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Нет связи</title></head>' +
    '<body style="font-family:sans-serif;padding:28px;text-align:center;line-height:1.5">' +
    '<h2>Нет связи, а эта страница не сохранена в памяти</h2>' +
    '<p><a href="' + START_PAGE + '">Открыть электронную буссоль</a></p>' +
    '</body></html>';
  return new Response(html, {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// 1. Установка: критичные файлы обязательны, остальные — по возможности
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRO_CACHE);

    const store = async (asset) => {
      const response = await fetch(asset, { cache: 'reload' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${asset}`);
      await cache.put(asset, await cleanResponse(response));
    };

    try {
      await Promise.all(CRITICAL_ASSETS.map(store));
    } catch (err) {
      console.error('[Lesovik PRO SW] Критичный файл не скачан, установка отменена:', err);
      await caches.delete(PRO_CACHE);
      throw err; // установка провалена — прежняя версия воркера продолжает работать
    }

    await Promise.all(OPTIONAL_ASSETS.map((asset) =>
      store(asset).catch((err) => console.warn('[Lesovik PRO SW] Необязательный файл пропущен:', asset, err.message || err))
    ));

    await self.skipWaiting();
  })());
});

// 2. Активация: чистим только СВОИ старые версии кэша
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== PRO_CACHE)
        .map((key) => {
          console.log(`[Lesovik PRO SW] Очистка старого кэша: ${key}`);
          return caches.delete(key);
        })
    );
    await self.clients.claim();
  })());
});

// Запасной вариант для страницы, если нет ни сети, ни кэша
async function navigationFallback(url) {
  const cached = await caches.match(cacheKey(url), MATCH_OPTS);
  if (cached) return cached;

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const start = await caches.match(url.origin + START_PAGE, MATCH_OPTS);
    if (start) return start;
  }
  return offlineResponse();
}

// 3а. HTML: сеть с таймаутом, при медленной связи — кэш, а запрос дорабатывает в фоне
function handleNavigation(event, url) {
  // Телефон точно офлайн — отдаём кэш сразу, без ожиданий
  if (self.navigator && self.navigator.onLine === false) {
    return navigationFallback(url);
  }

  const key = cacheKey(url);
  let cacheWrite = Promise.resolve();

  const networkPromise = fetch(event.request).then((response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      cacheWrite = putInCache(key, response.clone());
    }
    return response;
  });
  // Держим воркер живым, пока запрос и запись в кэш не завершатся (даже если ответ уже отдан из кэша)
  event.waitUntil(networkPromise.then(() => cacheWrite, () => {}));

  return (async () => {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), NAV_TIMEOUT_MS);
    });

    try {
      const response = await Promise.race([networkPromise, timeout]);
      clearTimeout(timer);
      if (response && response.status < 500) return response;
    } catch (err) {
      clearTimeout(timer);
    }

    // Сеть медленная, оборвалась или сервер вернул 5xx
    const cached = await caches.match(key, MATCH_OPTS);
    if (cached) return cached;

    // Кэша нет — дожидаемся сети без ограничения по времени
    try {
      return await networkPromise;
    } catch (err) {
      return navigationFallback(url);
    }
  })();
}

// 3б. Статика: cache-first для тяжёлых файлов, stale-while-revalidate для остального
function handleStatic(event, url) {
  const key = cacheKey(url);
  const cacheFirst = CACHE_FIRST_PATHS.has(url.pathname);

  return (async () => {
    const cached = await caches.match(key, MATCH_OPTS);
    if (cached && cacheFirst) return cached;

    let cacheWrite = Promise.resolve();
    const networkPromise = fetch(event.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        cacheWrite = putInCache(key, response.clone());
      }
      return response;
    });
    event.waitUntil(networkPromise.then(() => cacheWrite, () => {}));

    if (cached) return cached; // мгновенно из кэша, обновление придёт в фоне

    // Кэша нет — ждём сеть сколько потребуется (обрыв по таймауту только ломает загрузку)
    try {
      return await networkPromise;
    } catch (err) {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;            // POST и прочее — напрямую
  if (req.headers.has('range')) return;        // частичные запросы (медиа) — напрямую

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDN, шрифты, аналитика — мимо воркера

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(event, url));
    return;
  }

  if (STATIC_DESTINATIONS.has(req.destination)) {
    event.respondWith(handleStatic(event, url));
    return;
  }
  // Остальное (fetch/XHR к API, лицензии и т.п.) — не перехватываем
});
