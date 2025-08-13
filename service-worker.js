/* sw.js — instant‑update PWA + offline support
   - Updates immediately (skipWaiting + clients.claim)
   - Network‑first for same‑origin GET; falls back to cache offline
   - Precache core shell for first‑run offline
   - Bump VERSION to force a new cache (or just change this file when deploying)
*/
const VERSION = 'v1.0.0';                   // <- bump on deploy
const CACHE_NAME = `flashcards-${VERSION}`;
const CORE_ASSETS = [
  './',              // GitHub Pages: serves index.html
  './index.html',
  './manifest.json', // if you add it
  // optional: add icon files if you have them, e.g. './icons/icon-192.png'
];

// Install: precache core
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

// Activate: clean old caches + take control
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Fetch: network‑first for same‑origin GET; cache fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GETs from same origin
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Prefer fresh network; if it fails (offline), return cache
  event.respondWith((async () => {
    try {
      // For HTML, force reload from network to pick up latest index.html
      const isHTML = req.headers.get('accept')?.includes('text/html');
      const fresh = await fetch(req, { cache: isHTML ? 'reload' : 'no-store' });
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(()=>{});
      return fresh;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      // final fallback: cached index.html if available
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
      throw new Error('Offline and not cached');
    }
  })());
});
