import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTicketDetails } from "../hooks/useTickets";

const toDisplaySupportCategory = (supportCategory?: string | null) => {
  if (!supportCategory) {
    return "General Help";
  }

  return supportCategory
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export default function TreatTicket() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading: ticketLoading, error: ticketError } = useTicketDetails(id);

  if (!id) {
    return <div>Invalid ticket ID</div>;
  }

  if (ticketLoading) {
    return <div>Loading...</div>;
  }

  if (ticketError) {
    return <div>Error loading ticket: {ticketError.message}</div>;
  }

  if (!ticket) {
    return <div>Ticket not found.</div>;
  }

  const normalizedStatus = (ticket.status || "open").toString().toUpperCase();
  const normalizedPriority = (ticket.priority || "medium").toString().toUpperCase();

  return (
    <div>
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "1rem",
          borderRadius: "4px",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{ticket.title}</h2>
        <p style={{ margin: "0.25rem 0", fontSize: "1rem", color: "#666" }}>
          Priority: <strong>{normalizedPriority}</strong>
        </p>
        <p style={{ margin: "0.25rem 0" }}>
          Status:{" "}
          <span
            style={{
              padding: "0.25rem 0.5rem",
              borderRadius: "3px",
              fontSize: "0.9rem",
              backgroundColor: normalizedStatus === "OPEN" ? "#fff3cd" : "#d4edda",
              color: normalizedStatus === "OPEN" ? "#856404" : "#155724",
            }}
          >
            {normalizedStatus}
          </span>
        </p>
        <p style={{ margin: "0.25rem 0", color: "#666" }}>
          Support Category: {toDisplaySupportCategory(ticket.supportCategory)}
        </p>
      </div>

      <div
        style={{
          padding: "1rem",
          border: "1px solid #dbeafe",
          backgroundColor: "#eff6ff",
          borderRadius: "6px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Ticket treatment workflow</h3>
        <p style={{ marginBottom: "0.5rem" }}>
          Use ticket comments and activity history to coordinate support handling and resolution updates.
        </p>
        <Link to={`/app/tickets/${id}/details`} style={{ color: "#1d4ed8", textDecoration: "underline" }}>
          Open ticket details
        </Link>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link
          to="/app/tickets"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            display: "inline-block",
          }}
        >
          Back to Tickets
        </Link>
      </div>
    </div>
  );
}
