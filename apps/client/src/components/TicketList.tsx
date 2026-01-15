// client/src/components/TicketList.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useTickets } from "../hooks/useTickets";
import { Ticket } from "../hooks/useTickets";

interface TicketItemProps {
  ticket: Ticket;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

function TicketItem({ ticket, onDelete, isDeleting }: TicketItemProps) {
  return (
    <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>{ticket.title}</strong> — ${ticket.price.toFixed(2)}{" "}
          — <em style={{ color: ticket.status === "OPEN" ? "orange" : "green" }}>
            Status: {ticket.status}
          </em>
          {ticket.hotel_name && (
            <span style={{ marginLeft: "1rem", color: "#666" }}>
              📍 {ticket.hotel_name}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {ticket.status === "OPEN" && (
            <Link 
              to={`/tickets/${ticket.id}/treat`}
              style={{
                padding: "0.25rem 0.5rem",
                background: "#007bff",
                color: "white",
                textDecoration: "none",
                borderRadius: "3px",
                fontSize: "0.8rem"
              }}
            >
              Treat
            </Link>
          )}
          <button 
            onClick={() => onDelete(ticket.id)}
            disabled={isDeleting}
            style={{
              padding: "0.25rem 0.5rem",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: isDeleting ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.background = "#c82333";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.background = "#dc3545";
              }
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function TicketList() {
  const { tickets, isLoading, error, deleteTicket, isDeleting } = useTickets();

  if (isLoading) {
    return <div>Loading tickets...</div>;
  }

  if (error) {
    return <div>Error loading tickets: {error.message}</div>;
  }

  return (
    <div>
      {tickets.length === 0 ? (
        <p>No tickets yet. <Link to="/tickets/create">Create your first ticket!</Link></p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {tickets.map((ticket) => (
            <TicketItem 
              key={ticket.id} 
              ticket={ticket} 
              onDelete={deleteTicket}
              isDeleting={isDeleting}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
