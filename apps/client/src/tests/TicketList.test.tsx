// client/src/tests/TicketList.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import TicketList from "../components/TicketList";
import { TicketsContext } from "../context/Tickets";
import type { TicketsContextType } from "../context/Tickets"; // ⬅️ IMPORTANT
import { vi } from "vitest"; // ⬅️ ensure vi is imported

test("renders ticket list and deletes a ticket", () => {
  const deleteTicket = vi.fn();

  const mockContext: TicketsContextType = {
    tickets: [{ id: 1, title: "Test Ticket", price: 10 }],
    addTicket: vi.fn(),
    deleteTicket,
    currentPage: "list",           // now correctly treated as "list"
    setCurrentPage: vi.fn(),       // correctly typed callback
  };

  render(
    <TicketsContext.Provider value={mockContext}>
      <TicketList />
    </TicketsContext.Provider>
  );

  expect(screen.getByText(/test ticket/i)).toBeInTheDocument();

  fireEvent.click(screen.getByText(/delete/i));

  expect(deleteTicket).toHaveBeenCalledWith(1);
});
