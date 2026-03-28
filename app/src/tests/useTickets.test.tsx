import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import {
  useAddComment,
  useCreateTicket,
  useCurrentUser,
  useDashboard,
  useDeleteComment,
  useDeleteTicket,
  useTicketComments,
  useTicketDetails,
  useTickets,
} from "../hooks/useTickets";
import { apiClient } from "../services/api";

vi.mock("../services/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.delete).mockReset();
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

  test("normalizes array responses and serializes filters", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce([
      {
        id: 7,
        name: "Needs pickup",
        support_category: "waste",
        requester_id: "user-1",
      },
    ]);

    const { result } = renderHook(() => useTickets({ status: "open", page: 2, empty: "" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.total).toBe(1);
    });

    expect(result.current.data?.tickets?.[0]).toEqual(
      expect.objectContaining({
        title: "Needs pickup",
        supportCategory: "waste",
        requesterId: "user-1",
      }),
    );
    expect(apiClient.get).toHaveBeenCalledWith("/api/tickets?status=open&page=2");
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

  test("loads ticket details and comments only when identifiers are provided", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        id: "ticket-1",
        title: "Overflow alert",
        status: "open",
      })
      .mockResolvedValueOnce({
        comments: [{ id: 1, body: "Checked" }],
      });

    const { result: detailsResult } = renderHook(() => useTicketDetails("ticket-1"), {
      wrapper: createWrapper(),
    });
    const { result: commentsResult } = renderHook(() => useTicketComments("ticket-1", 3), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(detailsResult.current.data?.title).toBe("Overflow alert");
      expect(commentsResult.current.data?.comments).toHaveLength(1);
    });

    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/api/tickets/ticket-1");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/api/tickets/ticket-1/comments?page=3");

    const { result: disabledDetailsResult } = renderHook(() => useTicketDetails(null), {
      wrapper: createWrapper(),
    });
    expect(disabledDetailsResult.current.fetchStatus).toBe("idle");
  });

  test("supports comment mutations and ticket deletion", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 11, body: "New note" });
    vi.mocked(apiClient.delete)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const addCommentResult = renderHook(() => useAddComment(), {
      wrapper: createWrapper(),
    }).result;
    const deleteCommentResult = renderHook(() => useDeleteComment(), {
      wrapper: createWrapper(),
    }).result;
    const deleteTicketResult = renderHook(() => useDeleteTicket(), {
      wrapper: createWrapper(),
    }).result;

    await act(async () => {
      await addCommentResult.current.addComment({ ticketId: "ticket-1", body: "New note" });
      await deleteCommentResult.current.deleteComment({ ticketId: "ticket-1", commentId: 11 });
      await deleteTicketResult.current.mutateAsync("ticket-1");
    });

    expect(apiClient.post).toHaveBeenCalledWith("/api/tickets/ticket-1/comments", {
      body: "New note",
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/tickets/ticket-1/comments/11");
    expect(apiClient.delete).toHaveBeenCalledWith("/api/tickets/ticket-1");
  });

  test("skips dashboard requests when disabled", async () => {
    const { result } = renderHook(() => useDashboard(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(apiClient.get).not.toHaveBeenCalled();
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
