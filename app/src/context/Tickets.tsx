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
import { API_BASE } from "../services/api";

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

export type TicketsContextType = {
  user: any;
  tickets: Ticket[];
  hotels: Hotel[];
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
const TICKETS_URL = `${API_BASE}/api/tickets`;
const HOTELS_URL = `${API_BASE}/api/hotels`;

export const TicketsProvider = ({ children, user }: { children: ReactNode; user: any }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);

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

  // Note: Most operations are now handled by React Query hooks
  // Keeping minimal context for backward compatibility during migration

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
      user,
      tickets,
      hotels,
      refreshTickets: loadTickets,
      refreshHotels: loadHotels,
    }),
    [
      user,
      tickets,
      hotels,
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
