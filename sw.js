/**
 * sw.js — Service Worker de Mi Billetera Lite
 * Estrategia: Cache First, Network Fallback para el App Shell.
 *
 * Para publicar una nueva versión, cambia CACHE_VERSION: la fase "activate"
 * borrará automáticamente las cachés anteriores.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `billetera-shell-${CACHE_VERSION}`;

// Archivos estáticos necesarios para renderizar la interfaz (App Shell).
// Rutas relativas para que funcione también en subcarpetas (GitHub Pages).
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/app.js',
  './manifest.json',
  './icons/favicon.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
];

// ---------- INSTALL: precachear el App Shell ----------
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando', CACHE_NAME);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // activar de inmediato la nueva versión
  );
});

// ---------- ACTIVATE: limpiar cachés antiguas ----------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando', CACHE_NAME);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('billetera-shell-') && key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] Borrando caché antigua:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim()) // tomar control de las pestañas abiertas
  );
});

// ---------- FETCH: Cache First, Network Fallback ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Sólo peticiones GET del mismo origen
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      // 1) Si está en caché, se sirve desde ahí
      if (cached) return cached;

      // 2) Si no, se busca en la red (y se guarda una copia para la próxima vez)
      return fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copia = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          }
          return response;
        })
        .catch(() => {
          // 3) Sin red y sin caché: para navegaciones devolvemos el App Shell
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Sin conexión' });
        });
    })
  );
});
