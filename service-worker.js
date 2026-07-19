const CACHE_NAME = 'lesovik-pro-v18';

// Полный список всех страниц, инструментов и калькуляторов сайта "Лесовик"
const ASSETS = [
  '/',
  '/index.html',
  '/busol.html',         // Электронная буссоль
  '/mdo.html',           // Материально-денежная оценка (МДО)
  '/journal.html',       // Журнал полевой съемки
  '/height.html',        // Высотомер
  '/diameter.html',      // Мерная вилка / Диаметры
  '/photo.html',         // Фотофиксация делянок
  '/wood-calc.html',     // Кубатурник / Калькулятор древесины
  '/fire.html',          // Расчет пожарной безопасности / ущерба
  '/beton-calc.html',    // Калькулятор бетона
  '/credit-calc.html',   // Кредитный калькулятор
  '/fence-calc.html',    // Калькулятор забора
  '/garden-calc.html',   // Калькулятор грядок / огорода
  '/greenhouse-calc.html', // Калькулятор теплиц
  '/well-calc.html',     // Калькулятор колодца
  '/microgreen-calc.html', // Калькулятор микрозелени
  '/weather.html',       // Страница погоды (базовая разметка)
  '/logo.jpeg',          // Иконка / Логотип сайта
  '/manifest.json'       // Манифест приложения
];

// 1. Установка: скачиваем ВСЕ файлы в память смартфона
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Кешируем все калькуляторы Лесовика...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Активация: чистим старый кэш, если ты обновишь код в будущем
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Удаляем старый кэш:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Работа в тайге (офлайн): перехватываем запросы и отдаем файлы из памяти устройства
self.addEventListener('fetch', (event) => {
  // Исключаем внешние сторонние запросы (Яндекс.Метрику, рекламу или сторонние API погоды), 
  // чтобы они не ломали приложение в лесу
  if (
    event.request.url.includes('mc.yandex.ru') || 
    event.request.url.includes('weatherapi.com') ||
    event.request.url.includes('google-analytics.com')
  ) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Если файл есть в памяти телефона — отдаем его мгновенно. 
      // Если файла нет (например, новая страница, которую забыли вписать) — пробуем скачать из сети.
      return cachedResponse || fetch(event.request);
    })
  );
});
