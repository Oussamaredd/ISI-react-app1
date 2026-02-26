import { afterEach, describe, expect, test, vi } from "vitest";

import { scrollPageToTop } from "../lib/scrollPageToTop";

describe("scrollPageToTop", () => {
  const originalScrollTo = window.scrollTo;
  const originalScrollingElement = Object.getOwnPropertyDescriptor(document, "scrollingElement");

  afterEach(() => {
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: originalScrollTo,
    });

    if (originalScrollingElement) {
      Object.defineProperty(document, "scrollingElement", originalScrollingElement);
    } else {
      Object.defineProperty(document, "scrollingElement", {
        configurable: true,
        value: null,
      });
    }
  });

  test("scrolls window and scrolling element with provided behavior", () => {
    const windowScrollTo = vi.fn();
    const rootScrollTo = vi.fn();

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: windowScrollTo,
    });

    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: { scrollTo: rootScrollTo },
    });

    scrollPageToTop("smooth");

    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });
    expect(rootScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });
  });

  test("falls back to document element and body when no scrolling element API exists", () => {
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: null,
    });

    document.documentElement.scrollTop = 42;
    document.documentElement.scrollLeft = 12;
    document.body.scrollTop = 9;
    document.body.scrollLeft = 4;

    scrollPageToTop();

    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.documentElement.scrollLeft).toBe(0);
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(0);
  });
});
