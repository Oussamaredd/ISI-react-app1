// src/tests/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { beforeEach } from "vitest";

const suiteLocalMockedModules = [
  "../context/ToastContext",
  "../hooks/adminHooks",
  "../hooks/useAgentTours",
  "../hooks/useAuth",
  "../hooks/useCitizen",
  "../hooks/useLandingSectionScroll",
  "../hooks/useNavbarScrollState",
  "../hooks/usePlanning",
  "../hooks/usePlanningRealtimeSocket",
  "../hooks/usePlanningRealtimeStream",
  "../hooks/useTickets",
  "../monitoring/sentry",
  "../services/api",
  "../services/authApi",
  "../services/authRedirect",
  "../utils/errorHandlers",
  "socket.io-client",
];

// When split suites reuse the same Vitest worker, hoisted file-level mocks can
// leak into the next file unless we clear them before each suite starts.
vi.resetModules();
for (const moduleId of suiteLocalMockedModules) {
  vi.doUnmock(moduleId);
}

afterEach(() => {
  cleanup();
  try {
    vi.runOnlyPendingTimers();
  } catch {
    // No-op when a test stayed on real timers.
  }
  try {
    vi.useRealTimers();
  } catch {
    // No-op when fake timers were not enabled.
  }
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

globalThis.jest = vi as unknown as typeof jest;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    )
  };
});

// Default global fetch mock (can be overridden per test)
const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request | undefined)?.url ?? "";

  const makeResponse = (ok: boolean, status: number, body: any) =>
    ({
      ok,
      status,
      json: async () => body,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    } as Response);

  if (url.includes("/auth/status") || url.includes("/auth/me") || url.endsWith("/me")) {
    return makeResponse(false, 401, { authenticated: false });
  }

  if (url.includes("/api/tickets")) {
    return makeResponse(true, 200, []);
  }

  return makeResponse(true, 200, {});
});

beforeEach(() => {
  mockFetch.mockClear();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

