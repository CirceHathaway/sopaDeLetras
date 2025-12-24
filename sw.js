const CACHE_NAME = 'sopa-letras-v21';
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

// 1. INSTALACIÓN
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVACIÓN
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

// 3. FETCH
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // Si está en caché (offline), lo devolvemos
      if (response) {
        return response;
      }
      
      // Si no, lo pedimos a internet
      return fetch(e.request).catch((err) => {
        // Si falla internet y no está en caché:
        // Si es una navegación HTML, podríamos devolver una página offline genérica.
        // Si es un script (como firebase), simplemente fallará silenciosamente
        // y el código JS manejará el error (como hicimos en funcionalidad.js).
        // console.log("Fetch fallido offline:", e.request.url);
      });
    })
  );
});