// client/src/components/TreatTicket.tsx
import React, { useEffect } from "react";
import { useTickets } from "../context/Tickets";

export default function TreatTicket() {
  const {
    tickets,
    hotels,
    refreshTickets,
    refreshHotels,
    assignTicketToHotel,
    treatedTicketId,
    setTreatedTicketId,
    setCurrentPage,
  } = useTickets();

  useEffect(() => {
    refreshTickets();
    refreshHotels();
  }, [refreshTickets, refreshHotels]);

  if (!treatedTicketId) {
    return <div>No ticket selected for treatment.</div>;
  }

  const ticket = tickets.find((t) => t.id === treatedTicketId);
  if (!ticket) return <div>Ticket not found.</div>;

  const handleAssign = async (hotelId: number) => {
    await assignTicketToHotel(ticket.id, hotelId);
    setTreatedTicketId(null);
    setCurrentPage("list");
  };

  return (
    <div>
      <p>
        <strong>{ticket.title}</strong> — {ticket.price} €
      </p>
      <p>Status: {ticket.status}</p>

      <h3>Hotels</h3>
      {hotels.length === 0 ? (
        <p>No hotels found.</p>
      ) : (
        <ul>
          {hotels.map((h) => (
            <li key={h.id} style={{ marginBottom: "0.5rem" }}>
              {h.name} —{" "}
              {h.isAvailable ? (
                <>
                  <span>Available</span>{" "}
                  <button onClick={() => handleAssign(h.id)}>
                    Assign this hotel
                  </button>
                </>
              ) : (
                <span>Unavailable</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => {
          setTreatedTicketId(null);
          setCurrentPage("list");
        }}
      >
        Back to tickets
      </button>
    </div>
  );
}
