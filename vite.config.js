import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function serviceWorkerPlugin() {
  return {
    name: 'scripture-quest-service-worker',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist')
      const outputFiles = walk(dist).filter((file) => !file.endsWith('/sw.js'))
      const files = outputFiles.map((file) => `/${relative(dist, file).split('\\').join('/')}`)
      const precache = Array.from(new Set(['/', '/index.html', ...files]))
      const fingerprint = createHash('sha256')
      for (const file of outputFiles) {
        fingerprint.update(relative(dist, file))
        fingerprint.update(readFileSync(file))
      }
      const version = fingerprint.digest('hex').slice(0, 10)
      const source = `const CACHE = 'scripture-quest-${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html', { ignoreVary: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
`
      writeFileSync(join(dist, 'sw.js'), source)
    },
  }
}

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  build: {
    target: 'es2020',
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 3000),
    strictPort: true,
    allowedHosts: true,
  },
})
