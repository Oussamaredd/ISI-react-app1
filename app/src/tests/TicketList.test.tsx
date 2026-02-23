// client/src/tests/TicketList.test.tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach, expect, test, describe } from "vitest";
import TicketList from "../components/TicketList";
import { renderWithProviders } from "./test-utils";

const { mockUseTickets, mockDeleteTicket } = vi.hoisted(() => ({
  mockUseTickets: vi.fn(),
  mockDeleteTicket: vi.fn(),
}));

vi.mock("../hooks/useTickets", () => ({
  useTickets: (...args: unknown[]) => mockUseTickets(...args),
  useDeleteTicket: () => ({
    mutateAsync: mockDeleteTicket,
    isPending: false,
  }),
}));

describe("TicketList", () => {
  beforeEach(() => {
    mockUseTickets.mockReturnValue({
      data: { tickets: [] },
      isLoading: false,
      error: null,
    });
    mockDeleteTicket.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders ticket list", async () => {
    renderWithProviders(<TicketList />);

    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();
  });

  test("calls delete mutation when deleting a ticket", async () => {
    mockUseTickets.mockReturnValue({
      data: {
        tickets: [
          {
            id: "ticket-1",
            title: "Leaky sink",
            status: "open",
            priority: "high",
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<TicketList />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteTicket).toHaveBeenCalledWith("ticket-1");
    });
  });
});
