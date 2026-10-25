const CACHE = 'scripture-showdown-v1';
const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/styles.css',
  '/js/app.js',
  '/js/engine.js',
  '/js/store.js',
  '/js/icons.js',
  '/js/ui.js',
  '/js/audio.js',
  '/js/online.js',
  '/js/data/questions.js',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/assets/hero.svg',
  '/assets/categories/creation.svg',
  '/assets/categories/crown.svg',
  '/assets/categories/flame.svg',
  '/assets/categories/harp.svg',
  '/assets/categories/lamp.svg',
  '/assets/categories/letter.svg',
  '/assets/categories/lion.svg',
  '/assets/categories/manger.svg',
  '/assets/categories/map.svg',
  '/assets/categories/red-sea.svg',
  '/assets/categories/scroll.svg',
  '/assets/categories/seven.svg',
  '/assets/categories/throne.svg',
  '/assets/categories/waves.svg',
  '/assets/categories/well.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('/index.html', copy)).catch(() => {});
          return response;
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
