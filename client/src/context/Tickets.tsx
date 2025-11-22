// client/src/context/Tickets.tsx
import React, { createContext, useState, ReactNode, useEffect, useMemo, useContext } from "react";

type Ticket = {
  id: number;
  title: string;
  price: number;
};

export type TicketsContextType = {
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, "id">) => void;
  deleteTicket: (id: number) => void;
  currentPage: "list" | "create";
  setCurrentPage: (page: "list" | "create") => void;
};

export const TicketsContext = createContext<TicketsContextType | null>(null);

// Add this custom hook at the bottom of src/context/Tickets.tsx
export const useTickets = (): TicketsContextType => {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error("useTickets must be used within a TicketsProvider");
  }
  return context;
};

export const TicketsProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentPage, setCurrentPage] = useState<"list" | "create">("list");

  const API_URL = "http://localhost:5000/api/tickets";

  // Fetch tickets from backend
const fetchTickets = async () => {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    // Ensure price is a number
    const ticketsWithNumbers = data.map((t: any) => ({
      id: t.id,
      title: t.name,       // map backend field to frontend field
      price: Number(t.price),
    }));

    setTickets(ticketsWithNumbers);
  } catch (err) {
    console.error("Failed to fetch tickets:", err);
  }
};

  useEffect(() => {
    fetchTickets();
  }, []);

  // Add ticket to backend
  const addTicket = async (ticket: Omit<Ticket, "id">) => {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ticket.title, price: ticket.price }),
      });
      const data = await res.json();

      // Map backend response to your frontend Ticket type
      setTickets((prev) => [...prev, { id: data.id, title: data.name, price: Number(data.price) }]);
      
      setCurrentPage("list"); // switch back to list after creation
    } catch (err) {
      console.error("Failed to add ticket:", err);
    }
  };

  // Delete ticket from backend
  const deleteTicket = async (id: number) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete ticket:", err);
    }
  };

   // 🔥 Memoize the context value
  const value = useMemo(
    () => ({
      tickets,
      addTicket,
      deleteTicket,
      currentPage,
      setCurrentPage,
    }),
    [tickets, currentPage] // Only changes when these values change
  );

  return (
    <TicketsContext.Provider value={value}>
      {children}
    </TicketsContext.Provider>
  );
};
