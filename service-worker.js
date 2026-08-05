/**
 * САНИТАРНЫЙ СКРИПТ: Удаление старого бесплатного кеша сайта
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('Удаление устаревшего бесплатного кеша:', key);
          return caches.delete(key);
        })
      );
    })
  );
  self.registration.unregister(); // Отключаем старый Service Worker
});
