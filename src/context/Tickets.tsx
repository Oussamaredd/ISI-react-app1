import React, { createContext, useState, ReactNode } from "react";

type Ticket = {
  id: number;
  title: string;
  price: number;
};

type TicketsContextType = {
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, "id">) => void;
  deleteTicket: (id: number) => void;
  currentPage: "list" | "create";
  setCurrentPage: (page: "list" | "create") => void;
};

export const TicketsContext = createContext<TicketsContextType | null>(null);

export const TicketsProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentPage, setCurrentPage] = useState<"list" | "create">("list");

  const addTicket = (ticket: Omit<Ticket, "id">) => {
    setTickets((prev) => [...prev, { id: Date.now(), ...ticket }]);
    setCurrentPage("list"); // switch back to list after creation
  };

  const deleteTicket = (id: number) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <TicketsContext.Provider
      value={{ tickets, addTicket, deleteTicket, currentPage, setCurrentPage }}
    >
      {children}
    </TicketsContext.Provider>
  );
};
