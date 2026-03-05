const TILE_CACHE_NAME = "ecotrack-map-tiles-v1";
const TILE_CACHE_EVENT = "ECOTRACK_CONFIGURE_TILE_CACHE";

let allowedTileOrigins = [];

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

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
  if (!isCacheableTileRequest(requestUrl)) {
    return;
  }

  event.respondWith(cacheTileResponse(event.request));
});
