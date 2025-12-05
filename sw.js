const CACHE_NAME = 'sopa-letras-v16';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './funcionalidad.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './palabras.json'
];

// 1. INSTALACIÓN: Guardamos los archivos estáticos
self.addEventListener('install', (e) => {
  // Esta línea fuerza al SW nuevo a activarse rápido
  self.skipWaiting();

  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVACIÓN: Limpiamos cachés viejas si actualizas la versión
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. FETCH: Interceptamos las peticiones
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // Si está en caché (offline), lo devolvemos
      if (response) {
        return response;
      }
      // Si no, lo pedimos a internet
      return fetch(e.request).then((networkResponse) => {
        // Opcional: Podríamos cachear dinámicamente las librerías de Firebase aquí
        // para que también funcionen offline la próxima vez.
        return networkResponse;
      }).catch(() => {
        // Si falla internet y no está en caché, no hacemos nada (o mostramos error)
      });
    })
  );
});