import { afterEach, describe, expect, it, vi } from "vitest";

const setDocumentReadyState = (state: DocumentReadyState) => {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    value: state,
  });
};

describe("registerMapServiceWorker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    setDocumentReadyState("complete");
  });

  it("registers the service worker once and posts the tile-cache config", async () => {
    setDocumentReadyState("complete");

    const activeWorker = {
      postMessage: vi.fn(),
    };
    const registration = {
      active: activeWorker,
      waiting: null,
      installing: null,
    };

    vi.stubGlobal("navigator", {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    });

    const { registerMapServiceWorker } = await import("../lib/registerMapServiceWorker");

    registerMapServiceWorker();
    registerMapServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/ecotrack-map-sw.js", {
      scope: "/",
    });
    expect(activeWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ECOTRACK_CONFIGURE_TILE_CACHE",
        origins: expect.any(Array),
      }),
    );
  });
});
