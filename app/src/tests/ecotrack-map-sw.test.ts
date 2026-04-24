// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

type CacheStore = Map<string, Response>;
type WaitUntilBucket = Promise<unknown>[];

const serviceWorkerSource = fs.readFileSync(
  path.resolve(process.cwd(), "public/ecotrack-map-sw.js"),
  "utf8",
);

const createCacheHarness = () => {
  const cacheStores = new Map<string, CacheStore>();

  return {
    cacheStores,
    caches: {
      open: vi.fn(async (cacheName: string) => {
        let store = cacheStores.get(cacheName);
        if (!store) {
          store = new Map();
          cacheStores.set(cacheName, store);
        }

        return {
          match: vi.fn(async (request: Request | URL | string) => {
            const key = typeof request === "string" ? request : request instanceof URL ? request.href : request.url;
            return store?.get(key);
          }),
          put: vi.fn(async (request: Request | URL | string, response: Response) => {
            const key = typeof request === "string" ? request : request instanceof URL ? request.href : request.url;
            store?.set(key, response.clone());
          }),
        };
      }),
      keys: vi.fn(async () => Array.from(cacheStores.keys())),
      delete: vi.fn(async (cacheName: string) => cacheStores.delete(cacheName)),
    },
  };
};

const createServiceWorkerHarness = () => {
  const handlers = new Map<string, (event: any) => void>();
  const { caches, cacheStores } = createCacheHarness();
  const fetchMock = vi.fn();
  const skipWaiting = vi.fn();
  const clientsClaim = vi.fn();

  const context = vm.createContext({
    URL,
    Request,
    Response,
    fetch: fetchMock,
    caches,
    console,
    self: {
      location: new URL("https://app.ecotrack.test/"),
      registration: {
        scope: "https://app.ecotrack.test/",
      },
      clients: {
        claim: clientsClaim,
      },
      skipWaiting,
      addEventListener: (type: string, handler: (event: any) => void) => {
        handlers.set(type, handler);
      },
    },
  });

  new vm.Script(serviceWorkerSource).runInContext(context);

  return {
    cacheStores,
    clientsClaim,
    fetchMock,
    handlers,
    skipWaiting,
  };
};

const runLifecycleEvent = async (
  handler: ((event: any) => void) | undefined,
  eventOverrides: Record<string, unknown> = {},
) => {
  if (!handler) {
    throw new Error("Missing lifecycle handler");
  }

  const waitUntilPromises: WaitUntilBucket = [];

  handler({
    waitUntil: (promise: Promise<unknown>) => {
      waitUntilPromises.push(promise);
    },
    ...eventOverrides,
  });

  await Promise.all(waitUntilPromises);
};

describe("ecotrack service worker cache policy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pre-caches the app shell during install and cleans stale caches on activate", async () => {
    const harness = createServiceWorkerHarness();
    harness.cacheStores.set("legacy-cache", new Map());
    harness.fetchMock.mockResolvedValue(new Response("<html>ok</html>", { status: 200 }));

    await runLifecycleEvent(harness.handlers.get("install"));
    await runLifecycleEvent(harness.handlers.get("activate"));

    const shellCache = harness.cacheStores.get("ecotrack-app-shell-v2");
    expect(shellCache).toBeDefined();
    expect(Array.from(shellCache?.keys() ?? [])).toEqual(
      expect.arrayContaining([
        "https://app.ecotrack.test/",
        "https://app.ecotrack.test/login",
        "https://app.ecotrack.test/app/agent/tour",
      ]),
    );
    expect(harness.skipWaiting).toHaveBeenCalled();
    expect(harness.clientsClaim).toHaveBeenCalled();
    expect(harness.cacheStores.has("legacy-cache")).toBe(false);
  });

  it("serves cached app shell content when navigation requests fail offline", async () => {
    const harness = createServiceWorkerHarness();
    const shellCache = new Map<string, Response>();
    shellCache.set("https://app.ecotrack.test/", new Response("<html>cached shell</html>", { status: 200 }));
    harness.cacheStores.set("ecotrack-app-shell-v2", shellCache);
    harness.fetchMock.mockRejectedValue(new Error("offline"));

    let resolveNavigationResponse: ((response: Response) => void) | undefined;
    const navigationResponsePromise = new Promise<Response>((resolve) => {
      resolveNavigationResponse = resolve;
    });
    const navigationRequest = {
      url: "https://app.ecotrack.test/app/agent/tour",
      method: "GET",
      mode: "navigate",
    };

    harness.handlers.get("fetch")?.({
      request: navigationRequest,
      respondWith: async (responsePromise: Promise<Response>) => {
        resolveNavigationResponse?.(await responsePromise);
      },
    });

    expect(await (await navigationResponsePromise).text()).toContain("cached shell");
  });

  it("does not intercept Vite dev asset requests", async () => {
    const harness = createServiceWorkerHarness();
    const respondWith = vi.fn();

    harness.handlers.get("fetch")?.({
      request: {
        url: "https://app.ecotrack.test/node_modules/.vite/deps/@tanstack_react-query.js?v=abc123",
        method: "GET",
        mode: "cors",
        destination: "script",
      },
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });
});
