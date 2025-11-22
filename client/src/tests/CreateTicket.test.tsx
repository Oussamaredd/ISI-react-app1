// client/src/tests/CreateTicket.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import CreateTicket from "../components/CreateTicket";
import { TicketsContext } from "../context/Tickets";

test("submits a new ticket", () => {
  const addTicket = vi.fn();

  render(
    <TicketsContext.Provider
      value={{
        tickets: [],
        addTicket,
        deleteTicket: vi.fn(),
        currentPage: "create",
        setCurrentPage: vi.fn(),
      }}
    >
      <CreateTicket />
    </TicketsContext.Provider>
  );

  fireEvent.change(screen.getByPlaceholderText(/ticket name/i), {
    target: { value: "New Ticket" },
  });

  fireEvent.change(screen.getByPlaceholderText(/price/i), {
    target: { value: "20" },
  });

  fireEvent.click(screen.getByText(/add ticket/i));

  expect(addTicket).toHaveBeenCalledWith({
    title: "New Ticket",
    price: 20,
  });
});
