import React, { useContext } from "react";
import { TicketsContext } from "../context/Tickets";

export default function TicketList() {
  const context = useContext(TicketsContext);
  if (!context) return null;

  const { tickets, deleteTicket } = context;

  return (
    <div>
      {tickets.length === 0 ? (
        <p>No tickets yet.</p>
      ) : (
        <ul>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <strong>{ticket.title}</strong> — ${ticket.price.toFixed(2)}{" "}
              <button onClick={() => deleteTicket(ticket.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
