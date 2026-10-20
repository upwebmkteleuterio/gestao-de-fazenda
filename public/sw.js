const CACHE_NAME = 'farmnexus-shell-v1';
const APP_SHELL = '/';
const ASSET_DESTINATIONS = new Set(['script', 'style', 'font', 'image', 'manifest']);

// Guarda no cache os arquivos (com hash no nome) referenciados pelo HTML da versão atual.
// Sem isso, um deploy novo deixa o HTML atualizado no cache apontando para arquivos que
// nunca foram baixados, e o app não abre offline depois de um recarregamento.
const cacheShellAssets = async (cache, html) => {
  const assetUrls = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g))
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.href);

  await Promise.all(assetUrls.map((url) => cache.add(url).catch(() => undefined)));
};

const cacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch(APP_SHELL);

  if (!shellResponse.ok) {
    return;
  }

  const shellHtml = await shellResponse.clone().text();
  await cache.put(APP_SHELL, shellResponse);
  await cacheShellAssets(cache, shellHtml);
};

// Atualiza o HTML em cache junto com os arquivos que ele referencia (ver cacheShellAssets).
const refreshCachedShell = async (response) => {
  try {
    const html = await response.text();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(APP_SHELL, new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));
    await cacheShellAssets(cache, html);
  } catch {
    // O cache do shell é uma otimização: falhar aqui não pode interromper a navegação.
  }
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
            void refreshCachedShell(response.clone());
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
