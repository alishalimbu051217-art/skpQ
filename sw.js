// SkpQ service worker — keeps things installable and gives basic
// offline resilience. Uses "network first" so pages always get fresh
// content (important since login state depends on Firebase), only
// falling back to a cached copy if the network request fails.

const CACHE_NAME = 'skpq-shell-v1';
const SHELL_FILES = [
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/cart.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests — let everything else
  // (Firebase, CDNs, camera streams) pass straight through untouched.
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
