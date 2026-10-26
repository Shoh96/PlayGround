const CACHE_NAME = 'lumen-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/core.js',
  './assets/js/data.js',
  './assets/js/game.js',
  './assets/js/online.js',
  './assets/js/results.js',
  './assets/js/screens.js',
  './assets/fonts/inter.woff2',
  './assets/fonts/cormorant.woff2',
  './assets/fonts/cormorant-italic.woff2',
  './assets/img/logo.svg',
  './assets/img/hero-window.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './vendor/peerjs.min.js',
  './assets/img/categories/acts.svg',
  './assets/img/categories/christmas.svg',
  './assets/img/categories/exodus.svg',
  './assets/img/categories/firsts.svg',
  './assets/img/categories/genesis.svg',
  './assets/img/categories/geography.svg',
  './assets/img/categories/gospels.svg',
  './assets/img/categories/heroes.svg',
  './assets/img/categories/judges.svg',
  './assets/img/categories/kings.svg',
  './assets/img/categories/miracles.svg',
  './assets/img/categories/names.svg',
  './assets/img/categories/numbers.svg',
  './assets/img/categories/parables.svg',
  './assets/img/categories/patriarchs.svg',
  './assets/img/categories/paul.svg',
  './assets/img/categories/prophets.svg',
  './assets/img/categories/psalms.svg',
  './assets/img/categories/revelation.svg',
  './assets/img/categories/women.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
