const CACHE_NAME = 'profe-vale-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/LogoProfeVale.png',
  '/formacion/index.html',
  '/recursos/index.html',
  '/chat/index.html',
  '/AppMicrobitRF/index.html',
  '/AppMicrobitTeachable/index.html',
  '/AppMicrobitFlechas/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});