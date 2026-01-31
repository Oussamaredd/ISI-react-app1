// client/src/components/TicketList.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useTickets, Ticket } from "../hooks/useTickets";

interface TicketItemProps {
  ticket: Ticket;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const formatStatus = (status: Ticket["status"]) => (status || "open").toString().toUpperCase();
const formatPriority = (priority: Ticket["priority"]) =>
  (priority || "medium").toString().toUpperCase();

function TicketItem({ ticket, onDelete, isDeleting }: TicketItemProps) {
  const status = formatStatus(ticket.status);
  const priority = formatPriority(ticket.priority);
  const statusColor = status === "OPEN" ? "orange" : "#2e7d32";
  const priorityColor =
    priority === "HIGH" ? "#dc3545" : priority === "LOW" ? "#6c757d" : "#0d6efd";
  const isOpen = status === "OPEN";

  return (
    <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <strong>{ticket.title}</strong>
            <span style={{ color: priorityColor, fontWeight: 600 }}>Priority: {priority}</span>
            <em style={{ color: statusColor }}>Status: {status}</em>
          </div>
          {ticket.hotelId && (
            <span style={{ marginLeft: "0.25rem", color: "#666" }}>Hotel: {ticket.hotelId}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {isOpen && (
            <Link
              to={`/tickets/${ticket.id}/treat`}
              style={{
                padding: "0.25rem 0.5rem",
                background: "#007bff",
                color: "white",
                textDecoration: "none",
                borderRadius: "3px",
                fontSize: "0.8rem",
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
              transition: "all 0.2s ease",
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
  const { data, isLoading, error } = useTickets();
  const tickets = (data as any)?.tickets || data || [];

  if (isLoading) {
    return <div>Loading tickets...</div>;
  }

  if (error) {
    return <div>Error loading tickets: {error.message}</div>;
  }

  return (
    <div>
      {tickets.length === 0 ? (
        <p>
          No tickets yet. <Link to="/tickets/create">Create your first ticket!</Link>
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {tickets.map((ticket: Ticket) => (
            <TicketItem
              key={ticket.id}
              ticket={ticket}
              onDelete={(id) => {
                void id; // TODO: wire delete mutation
              }}
              isDeleting={false}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
