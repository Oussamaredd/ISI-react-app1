import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import CreateTicket from "../components/CreateTicket";
import { useCreateTicket } from "../hooks/useTickets";

vi.mock("../hooks/useTickets", async () => {
  const actual = await vi.importActual<typeof import("../hooks/useTickets")>(
    "../hooks/useTickets"
  );
  return {
    ...actual,
    useCreateTicket: vi.fn(),
  };
});

describe("CreateTicket", () => {
  test("submits a new ticket", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useCreateTicket).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    render(<CreateTicket />);

    fireEvent.change(screen.getByPlaceholderText(/ticket name/i), {
      target: { value: "New Ticket" },
    });
    fireEvent.change(screen.getByPlaceholderText(/ticket description/i), {
      target: { value: "Needs attention" },
    });
    fireEvent.change(screen.getByLabelText(/priority/i), {
      target: { value: "high" },
    });

    fireEvent.click(screen.getByText(/create ticket/i));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "New Ticket",
        description: "Needs attention",
        priority: "high",
      });
    });
  });
});
