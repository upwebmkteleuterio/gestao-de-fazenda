const CACHE_NAME = 'farmnexus-shell-v1';
const APP_SHELL = '/';
const ASSET_DESTINATIONS = new Set(['script', 'style', 'font', 'image', 'manifest']);

const cacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch(APP_SHELL);

  if (!shellResponse.ok) {
    return;
  }

  const shellHtml = await shellResponse.clone().text();
  await cache.put(APP_SHELL, shellResponse);

  const assetUrls = Array.from(shellHtml.matchAll(/(?:src|href)="([^"]+)"/g))
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.href);

  await Promise.all(assetUrls.map((url) => cache.add(url).catch(() => undefined)));
};

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET'
    || url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(APP_SHELL)),
    );
    return;
  }

  if (!ASSET_DESTINATIONS.has(request.destination)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse ?? fetch(request).then((response) => {
      if (response.ok) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
      }
      return response;
    })),
  );
});
