const CACHE_NAME = 'teachable-machine-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  '../style.css',
  '../LogoProfeVale.png'
];

// Instalar el service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar las peticiones de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si el archivo está en cache, lo devuelve
        if (response) {
          return response;
        }
        
        // Si no está en cache, lo busca en la red
        return fetch(event.request);
      }
    )
  );
});

// Actualizar el service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});