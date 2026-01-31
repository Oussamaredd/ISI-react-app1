import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useDashboard } from "../hooks/useTickets";
import { apiClient } from "../services/api";

vi.mock("../services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
  API_BASE: "http://localhost:3001",
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

describe("useDashboard", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  test("fetches dashboard data", async () => {
    const mockDashboardData = {
      summary: {
        total: 100,
        open: 30,
        completed: 70,
      },
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockDashboardData);

    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockDashboardData);
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/dashboard");
  });

  test("handles errors", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Failed"));

    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
