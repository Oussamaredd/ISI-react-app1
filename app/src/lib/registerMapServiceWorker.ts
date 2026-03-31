import { MAP_TILE_ALLOWED_ORIGINS } from "./mapConfig";

const MAP_SERVICE_WORKER_FILE = "ecotrack-map-sw.js";
const MAP_SERVICE_WORKER_CONFIG_EVENT = "ECOTRACK_CONFIGURE_TILE_CACHE";
const APP_SHELL_REFRESH_SYNC_TAG = "ecotrack-refresh-shell";
const MANAGED_CACHE_PREFIXES = [
  "ecotrack-map-tiles",
  "ecotrack-app-shell",
  "ecotrack-app-static",
];
const SHOULD_DISABLE_MAP_SERVICE_WORKER = import.meta.env.DEV && !import.meta.env.TEST;

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

const isManagedServiceWorkerRegistration = (
  registration: ServiceWorkerRegistration,
  basePath: string,
) => {
  if (typeof window === "undefined") {
    return false;
  }

  const expectedScriptPath = new URL(`${basePath}${MAP_SERVICE_WORKER_FILE}`, window.location.origin).pathname;
  const scriptUrls = [
    registration.active?.scriptURL,
    registration.waiting?.scriptURL,
    registration.installing?.scriptURL,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return scriptUrls.some((scriptUrl) => {
    try {
      return new URL(scriptUrl).pathname === expectedScriptPath;
    } catch {
      return false;
    }
  });
};

const clearManagedCaches = async () => {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  try {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) =>
          MANAGED_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)),
        )
        .map((cacheName) => window.caches.delete(cacheName)),
    );
  } catch {
    // Dev cleanup should never block app bootstrap.
  }
};

const cleanupManagedServiceWorker = async (basePath: string) => {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => isManagedServiceWorkerRegistration(registration, basePath))
          .map((registration) => registration.unregister()),
      );
    } catch {
      // Browsers may reject service-worker inspection in some contexts.
    }
  }

  await clearManagedCaches();
};

export const cleanupDevServiceWorkerState = async () => {
  if (typeof window === "undefined" || !SHOULD_DISABLE_MAP_SERVICE_WORKER) {
    return;
  }

  await cleanupManagedServiceWorker(getBasePath());
};

const configureRegistration = async (registration: ServiceWorkerRegistration) => {
  postTileCacheConfig(registration.active ?? registration.waiting ?? registration.installing ?? null);

  const syncCapableRegistration = registration as ServiceWorkerRegistration & {
    sync?: {
      register: (tag: string) => Promise<void>;
    };
  };
  if (syncCapableRegistration.sync?.register) {
    try {
      await syncCapableRegistration.sync.register(APP_SHELL_REFRESH_SYNC_TAG);
    } catch {
      // Background sync support is optional across browsers.
    }
  }

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
    typeof window === "undefined"
  ) {
    return;
  }

  hasRegisteredMapServiceWorker = true;

  if (SHOULD_DISABLE_MAP_SERVICE_WORKER) {
    void cleanupDevServiceWorkerState();
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  const basePath = getBasePath();
  const register = async () => {
    try {
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
