const TILE_CACHE_NAME = "ecotrack-map-tiles-v2";
const APP_SHELL_CACHE_NAME = "ecotrack-app-shell-v1";
const STATIC_ASSET_CACHE_NAME = "ecotrack-app-static-v1";
const TILE_CACHE_EVENT = "ECOTRACK_CONFIGURE_TILE_CACHE";
const CACHE_NAMES = [TILE_CACHE_NAME, APP_SHELL_CACHE_NAME, STATIC_ASSET_CACHE_NAME];
const APP_SHELL_PATHS = [".", "./login", "./app", "./app/agent/tour", "./app/dashboard"];

let allowedTileOrigins = [];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EcoTrack offline</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0f172a;
        color: #e2e8f0;
        font-family: "Segoe UI", sans-serif;
      }
      main {
        max-width: 28rem;
        padding: 2rem;
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 1.25rem;
        background: rgba(15, 23, 42, 0.92);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
      }
      p {
        margin: 0;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Offline mode</h1>
      <p>
        EcoTrack cannot reach the network right now. Cached tour data and previously loaded map
        tiles remain available, but live API updates will resume after connectivity returns.
      </p>
    </main>
  </body>
</html>`;

const isCacheableTileRequest = (url) =>
  allowedTileOrigins.includes(url.origin) && /\.(png|jpg|jpeg|webp)$/i.test(url.pathname);

const isTrustedMessageSource = (source) => {
  if (!source || typeof source.url !== "string") {
    return false;
  }

  try {
    return new URL(source.url).origin === self.location.origin;
  } catch {
    return false;
  }
};

const isApiRequest = (url) => url.origin === self.location.origin && url.pathname.startsWith("/api/");

const isStaticAssetRequest = (request, url) =>
  request.method === "GET" &&
  url.origin === self.location.origin &&
  !isApiRequest(url) &&
  ["script", "style", "font", "image"].includes(request.destination);

const isNavigationRequest = (request, url) =>
  request.mode === "navigate" &&
  request.method === "GET" &&
  url.origin === self.location.origin &&
  !isApiRequest(url);

const cacheTileResponse = async (request) => {
  const cache = await caches.open(TILE_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && (networkResponse.ok || networkResponse.type === "opaque")) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error("Tile request failed and no cached tile was available.");
  }
};

const precacheAppShell = async () => {
  const cache = await caches.open(APP_SHELL_CACHE_NAME);

  await Promise.allSettled(
    APP_SHELL_PATHS.map(async (relativePath) => {
      const requestUrl = new URL(relativePath, self.registration.scope);
      const response = await fetch(requestUrl, { cache: "no-store" });
      if (response.ok) {
        await cache.put(requestUrl, response.clone());
      }
    }),
  );
};

const cleanupOldCaches = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(async (cacheName) => {
      if (!CACHE_NAMES.includes(cacheName)) {
        await caches.delete(cacheName);
      }
    }),
  );
};

const cacheStaticAssetResponse = async (request) => {
  const cache = await caches.open(STATIC_ASSET_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })
    .catch(() => null);

  if (cachedResponse) {
    void networkResponsePromise;
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error("Static asset request failed and no cached asset was available.");
};

const handleNavigationRequest = async (request) => {
  const cache = await caches.open(APP_SHELL_CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const cachedResponse =
      (await cache.match(request)) ||
      (await cache.match(new URL(".", self.registration.scope)));

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(OFFLINE_FALLBACK_HTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
      status: 200,
    });
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (!isTrustedMessageSource(event.source)) {
    return;
  }

  if (event.data?.type !== TILE_CACHE_EVENT || !Array.isArray(event.data.origins)) {
    return;
  }

  allowedTileOrigins = event.data.origins.filter(
    (origin) => typeof origin === "string" && origin.length > 0,
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (isCacheableTileRequest(requestUrl)) {
    event.respondWith(cacheTileResponse(event.request));
    return;
  }

  if (isStaticAssetRequest(event.request, requestUrl)) {
    event.respondWith(cacheStaticAssetResponse(event.request));
    return;
  }

  if (isNavigationRequest(event.request, requestUrl)) {
    event.respondWith(handleNavigationRequest(event.request));
  }
});
