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
const FALLBACK_PAGE = '/';

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
        return response || fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(FALLBACK_PAGE);
          }
        });
      })
  );
});
