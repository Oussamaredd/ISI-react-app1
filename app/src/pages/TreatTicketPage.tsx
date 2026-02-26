import React from "react";
import { Link, useParams } from "react-router-dom";
import TreatTicket from "../components/TreatTicket";
import "../styles/TicketWorkflow.css";

export default function TreatTicketPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-error">
        <p>Invalid ticket ID.</p>
      </section>
    );
  }

  return (
    <section className="ticket-treat-page">
      <header className="ticket-treat-page-header">
        <p className="ticket-details-eyebrow">Ticket Treatment</p>
        <h1>Treat Ticket #{id}</h1>
        <p>Review context and progress this request to resolution.</p>
      </header>

      <TreatTicket />

      <nav className="ticket-treat-page-actions" aria-label="Ticket actions">
        <Link to={`/app/tickets/${id}/details`} className="ticket-details-primary-btn">
          View Ticket Details
        </Link>
        <Link to="/app/support#simple" className="ticket-details-secondary-btn">
          Back to Support
        </Link>
      </nav>
    </section>
  );
}
