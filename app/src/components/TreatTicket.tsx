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
  const {
    data: ticket,
    isLoading: ticketLoading,
    error: ticketError,
  } = useTicketDetails(id);

  if (!id) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-error">
        <p>Invalid ticket ID.</p>
      </section>
    );
  }

  if (ticketLoading) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-loading">
        <p>Loading ticket...</p>
      </section>
    );
  }

  if (ticketError) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-error">
        <p>Error loading ticket: {ticketError.message}</p>
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-loading">
        <p>Ticket not found.</p>
      </section>
    );
  }

  const normalizedStatus = (ticket.status || "open").toString().toUpperCase();
  const normalizedPriority = (ticket.priority || "medium").toString().toUpperCase();
  const ticketTitle = ticket.title || (ticket as any).name || "Untitled ticket";
  const statusClassName =
    normalizedStatus === "OPEN"
      ? "ticket-details-badge ticket-details-badge-warning"
      : "ticket-details-badge ticket-details-badge-success";
  const priorityClassName =
    normalizedPriority === "HIGH"
      ? "ticket-details-badge ticket-details-badge-danger"
      : normalizedPriority === "LOW"
        ? "ticket-details-badge ticket-details-badge-neutral"
        : "ticket-details-badge ticket-details-badge-info";

  return (
    <section className="ticket-treat-layout">
      <article className="ticket-details-card">
        <header className="ticket-details-section-header">
          <h2>{ticketTitle}</h2>
        </header>

        <div className="ticket-details-grid ticket-treat-grid">
          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Priority</span>
            <span className={priorityClassName}>{normalizedPriority}</span>
          </div>

          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Status</span>
            <span className={statusClassName}>{normalizedStatus}</span>
          </div>

          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Support Category</span>
            <span className="ticket-details-stat-value">
              {toDisplaySupportCategory(ticket.supportCategory)}
            </span>
          </div>
        </div>
      </article>

      <article className="ticket-details-card ticket-treat-workflow">
        <header className="ticket-details-section-header">
          <h2>Treatment Workflow</h2>
        </header>
        <p>
          Use comments and activity history to coordinate handling and closure
          decisions with the support team.
        </p>
        <Link to={`/app/tickets/${id}/details`} className="ticket-details-inline-link">
          Open ticket details
        </Link>
      </article>
    </section>
  );
}
