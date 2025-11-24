// client/src/context/Tickets.tsx
import React, {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";

type TicketStatus = "OPEN" | "COMPLETED";

export type Ticket = {
  id: number;
  title: string;
  price: number;
  status: TicketStatus;
  hotelId?: number | null;
};

export type Hotel = {
  id: number;
  name: string;
  isAvailable: boolean;
};

export type Page = "list" | "create" | "treat";

export type TicketsContextType = {
  tickets: Ticket[];
  hotels: Hotel[];
  addTicket: (ticket: Omit<Ticket, "id" | "status" | "hotelId">) => Promise<void>;
  deleteTicket: (id: number) => Promise<void>;
  assignTicketToHotel: (ticketId: number, hotelId: number) => Promise<void>;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  treatedTicketId: number | null;
  setTreatedTicketId: (id: number | null) => void;
  refreshTickets: () => Promise<void>;
  refreshHotels: () => Promise<void>;
};

export const TicketsContext = createContext<TicketsContextType | null>(null);

export const useTickets = () => {
  const ctx = useContext(TicketsContext);
  if (!ctx) throw new Error("useTickets must be used within a TicketsProvider");
  return ctx;
};

// ---- API constants ----
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000";
const TICKETS_URL = `${API_BASE}/api/tickets`;
const HOTELS_URL = `${API_BASE}/api/hotels`;

export const TicketsProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>("list");
  const [treatedTicketId, setTreatedTicketId] = useState<number | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch(TICKETS_URL, { credentials: "include" });
      if (res.status === 401) {
        setTickets([]);
        return;
      }
      if (!res.ok) throw new Error(`tickets ${res.status}`);
      const json = await res.json();
      const data = Array.isArray(json) ? json : [];
      setTickets(
        data.map(
          (t: any): Ticket => ({
            id: Number(t.id),
            title: t.name ?? t.title ?? "Untitled",
            price: Number(t.price ?? 0),
            status: (t.status ?? "OPEN") as TicketStatus,
            hotelId: t.hotel_id ?? null,
          })
        )
      );
    } catch (e) {
      console.error("Failed to fetch tickets:", e);
      setTickets([]);
    }
  }, []);

  const loadHotels = useCallback(async () => {
    try {
      const res = await fetch(HOTELS_URL, { credentials: "include" });
      if (res.status === 401) {
        setHotels([]);
        return;
      }
      if (!res.ok) throw new Error(`hotels ${res.status}`);
      const json = await res.json();
      const data = Array.isArray(json) ? json : [];
      setHotels(
        data.map(
          (h: any): Hotel => ({
            id: Number(h.id),
            name: h.name ?? "Unnamed hotel",
            isAvailable: Boolean(h.is_available),
          })
        )
      );
    } catch (e) {
      console.error("Failed to fetch hotels:", e);
      setHotels([]);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    loadHotels();
  }, [loadTickets, loadHotels]);

  const addTicket = useCallback(
    async (ticket: Omit<Ticket, "id" | "status" | "hotelId">) => {
      try {
        const res = await fetch(TICKETS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: ticket.title, price: ticket.price }),
        });
        if (res.status === 401) {
          setTickets([]);
          setCurrentPage("list");
          return;
        }
        if (!res.ok) throw new Error(`add ticket ${res.status}`);
        const data = await res.json();
        setTickets((prev) => [
          ...prev,
          {
            id: Number(data.id),
            title: data.name ?? ticket.title,
            price: Number(data.price ?? ticket.price),
            status: (data.status ?? "OPEN") as TicketStatus,
            hotelId: data.hotel_id ?? null,
          },
        ]);
        setCurrentPage("list");
      } catch (e) {
        console.error("Failed to add ticket:", e);
      }
    },
    []
  );

  const deleteTicket = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${TICKETS_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        setTickets([]);
        return;
      }
      if (!res.ok) throw new Error(`delete ticket ${res.status}`);
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Failed to delete ticket:", e);
    }
  }, []);

  const assignTicketToHotel = useCallback(
    async (ticketId: number, hotelId: number) => {
      try {
        const res = await fetch(`${TICKETS_URL}/${ticketId}/assign-hotel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ hotelId }),
        });
        if (res.status === 401) {
          setTickets([]);
          setHotels([]);
          return;
        }
        if (!res.ok) throw new Error(`assign failed ${res.status}`);
        await loadTickets();
        await loadHotels();
      } catch (e) {
        console.error("Failed to assign ticket:", e);
      }
    },
    [loadTickets, loadHotels]
  );

  // 👇 This fixes the "value changes every render" warning
  const value = useMemo<TicketsContextType>(
    () => ({
      tickets,
      hotels,
      addTicket,
      deleteTicket,
      assignTicketToHotel,
      currentPage,
      setCurrentPage,
      treatedTicketId,
      setTreatedTicketId,
      refreshTickets: loadTickets,
      refreshHotels: loadHotels,
    }),
    [
      tickets,
      hotels,
      addTicket,
      deleteTicket,
      assignTicketToHotel,
      currentPage,
      treatedTicketId,
      loadTickets,
      loadHotels,
    ]
  );

  return (
    <TicketsContext.Provider value={value}>
      {children}
    </TicketsContext.Provider>
  );
};
