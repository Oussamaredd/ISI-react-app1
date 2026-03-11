import { MAP_TILE_ALLOWED_ORIGINS } from "./mapConfig";

const MAP_SERVICE_WORKER_FILE = "ecotrack-map-sw.js";
const MAP_SERVICE_WORKER_CONFIG_EVENT = "ECOTRACK_CONFIGURE_TILE_CACHE";

let hasRegisteredMapServiceWorker = false;

const getBasePath = () => {
  const basePath = import.meta.env.BASE_URL || "/";
  return basePath.endsWith("/") ? basePath : `${basePath}/`;
};

const postTileCacheConfig = (serviceWorker: ServiceWorker | null) => {
  if (!serviceWorker || MAP_TILE_ALLOWED_ORIGINS.length === 0) {
    return;
  }

  serviceWorker.postMessage({
    type: MAP_SERVICE_WORKER_CONFIG_EVENT,
    origins: MAP_TILE_ALLOWED_ORIGINS,
  });
};

const configureRegistration = async (registration: ServiceWorkerRegistration) => {
  postTileCacheConfig(registration.active ?? registration.waiting ?? registration.installing ?? null);

  if ("serviceWorker" in navigator) {
    const readyRegistration = await navigator.serviceWorker.ready;
    postTileCacheConfig(
      readyRegistration.active ?? readyRegistration.waiting ?? readyRegistration.installing ?? null,
    );
  }
};

/**
 * Registers the agent offline cache service worker once for the current browser session.
 *
 * @remarks
 * The service worker caches same-origin app shell assets plus approved tile origins as progressive
 * enhancement only. The live API remains network-first and the agent experience still works
 * without service worker support.
 */
export const registerMapServiceWorker = () => {
  if (
    hasRegisteredMapServiceWorker ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  hasRegisteredMapServiceWorker = true;

  const register = async () => {
    try {
      const basePath = getBasePath();
      const registration = await navigator.serviceWorker.register(`${basePath}${MAP_SERVICE_WORKER_FILE}`, {
        scope: basePath,
      });

      await configureRegistration(registration);
    } catch {
      // Offline caching is progressive enhancement; the map remains usable without registration.
    }
  };

  if (document.readyState === "complete") {
    void register();
    return;
  }

  window.addEventListener(
    "load",
    () => {
      void register();
    },
    { once: true },
  );
};
