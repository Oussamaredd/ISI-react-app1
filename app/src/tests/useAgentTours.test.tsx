import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useAgentTour } from "../hooks/useAgentTours";
import { apiClient } from "../services/api";

vi.mock("../services/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const AGENT_TOUR_CACHE_KEY = "ecotrack.agentTour.cache.v1";

describe("useAgentTour cache behavior", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    window.localStorage.removeItem(AGENT_TOUR_CACHE_KEY);
  });

  test("does not hydrate the agent view from cached seed fallback geometry before refetch completes", async () => {
    let resolveRequest: ((value: unknown) => void) | null = null;
    const liveTour = {
      id: "tour-1",
      routeGeometry: {
        source: "live",
        provider: "router.example.test",
      },
    };

    window.localStorage.setItem(
      AGENT_TOUR_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        data: {
          id: "tour-1",
          routeGeometry: {
            source: "fallback",
            provider: "seed",
          },
        },
      }),
    );
    vi.mocked(apiClient.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as Promise<any>,
    );

    const { result } = renderHook(() => useAgentTour(), {
      wrapper: createWrapper(),
    });

    // Regression lock: the page must not paint stale seed geometry while the live fetch is still pending.
    expect(result.current.data).toBeUndefined();
    expect(result.current.dataSource).toBe("none");
    expect(apiClient.get).toHaveBeenCalledWith("/api/tours/agent/me");

    resolveRequest?.(liveTour);

    await waitFor(() => {
      expect(result.current.data).toEqual(liveTour);
    });
    expect(result.current.dataSource).toBe("network");
    expect(JSON.parse(window.localStorage.getItem(AGENT_TOUR_CACHE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          routeGeometry: expect.objectContaining({
            source: "live",
            provider: "router.example.test",
          }),
        }),
      }),
    );
  });

  test("ignores cached seed fallback routes and surfaces the live fetch error", async () => {
    window.localStorage.setItem(
      AGENT_TOUR_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        data: {
          id: "tour-1",
          routeGeometry: {
            source: "fallback",
            provider: "seed",
          },
        },
      }),
    );
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("backend unavailable"));

    const { result } = renderHook(() => useAgentTour(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.dataSource).toBe("none");
  });

  test("reuses cached non-seed routes when the live fetch fails", async () => {
    const cachedTour = {
      id: "tour-1",
      routeGeometry: {
        source: "fallback",
        provider: "internal",
      },
    };

    window.localStorage.setItem(
      AGENT_TOUR_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        data: cachedTour,
      }),
    );
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("backend unavailable"));

    const { result } = renderHook(() => useAgentTour(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(cachedTour);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.dataSource).toBe("cache");
  });
});
