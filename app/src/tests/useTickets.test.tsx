import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useCreateTicket, useCurrentUser, useHotels, useTickets } from "../hooks/useTickets";
import { apiClient } from "../services/api";

vi.mock("../services/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
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

describe("useTickets", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  test("fetches ticket list", async () => {
    const mockTickets = {
      tickets: [
        { id: 1, name: "Test Ticket", status: "OPEN" },
        { id: 2, title: "Another Ticket", status: "COMPLETED" },
      ],
      total: 2,
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockTickets);

    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.tickets).toHaveLength(2);
    });

    expect(result.current.data?.tickets?.[0].title).toBe("Test Ticket");
    expect(apiClient.get).toHaveBeenCalledWith("/api/tickets");
  });

  test("fetches hotels", async () => {
    const mockHotels = [
      { id: "1", name: "Hotel A" },
      { id: "2", name: "Hotel B" },
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockHotels);

    const { result } = renderHook(() => useHotels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockHotels);
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/hotels");
  });

  test("creates a ticket", async () => {
    const payload = { name: "New Ticket", description: "Needs attention", priority: "low" };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ id: "3" });

    const { result } = renderHook(() => useCreateTicket(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(apiClient.post).toHaveBeenCalledWith("/api/tickets", payload);
  });
});

describe("useCurrentUser", () => {
  test("returns fallback state without provider", () => {
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
