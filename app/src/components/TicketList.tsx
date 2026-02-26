// client/src/components/TicketList.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useTickets, useDeleteTicket, Ticket } from "../hooks/useTickets";

interface TicketItemProps {
  ticket: Ticket;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const formatStatus = (status: Ticket["status"]) => (status || "open").toString().toUpperCase();
const formatPriority = (priority: Ticket["priority"]) =>
  (priority || "medium").toString().toUpperCase();
const toDisplaySupportCategory = (supportCategory?: string | null) => {
  if (!supportCategory) {
    return "General Help";
  }

  return supportCategory
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

function TicketItem({ ticket, onDelete, isDeleting }: TicketItemProps) {
  const status = formatStatus(ticket.status);
  const priority = formatPriority(ticket.priority);
  const isOpen = status === "OPEN";

  const statusClass = isOpen ? "ticket-status ticket-status-open" : "ticket-status ticket-status-closed";

  const priorityClass =
    priority === "HIGH"
      ? "ticket-priority ticket-priority-high"
      : priority === "LOW"
        ? "ticket-priority ticket-priority-low"
        : "ticket-priority ticket-priority-medium";

  return (
    <li className="ticket-item">
      <div className="ticket-item-layout">
        <div className="ticket-item-main">
          <div className="ticket-item-header">
            <h3 className="ticket-item-title">{ticket.title}</h3>
            <span className={priorityClass}>{priority}</span>
            <em className={statusClass}>{status}</em>
          </div>
          <span className="ticket-category">
            Support Category: {toDisplaySupportCategory(ticket.supportCategory)}
          </span>
        </div>

        <div className="ticket-actions">
          {isOpen && (
            <Link to={`/app/tickets/${ticket.id}/treat`} className="ticket-action-link">
              Treat
            </Link>
          )}

          <button onClick={() => onDelete(ticket.id)} disabled={isDeleting} className="ticket-delete-btn">
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function TicketList() {
  const { data, isLoading, error } = useTickets();
  const { mutateAsync: deleteTicket, isPending: isDeletingTicket } = useDeleteTicket();
  const [deletingTicketId, setDeletingTicketId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const tickets = (data as any)?.tickets || data || [];

  const handleDelete = async (id: string) => {
    if (isDeletingTicket) {
      return;
    }

    setDeleteError(null);
    setDeletingTicketId(id);
    try {
      await deleteTicket(id);
    } catch (deleteFailure) {
      const message =
        deleteFailure instanceof Error
          ? deleteFailure.message
          : "Failed to delete ticket. Please try again.";
      setDeleteError(message);
    } finally {
      setDeletingTicketId(null);
    }
  };

  if (isLoading) {
    return <p className="ticket-feedback-state">Loading tickets...</p>;
  }

  if (error) {
    return <p className="ticket-feedback-state ticket-feedback-state-error">Error loading tickets: {error.message}</p>;
  }

  return (
    <div className="ticket-list-shell">
      {deleteError ? (
        <div role="alert" className="ticket-delete-error">
          {deleteError}
        </div>
      ) : null}
      {tickets.length === 0 ? (
        <p className="ticket-feedback-state">
          No tickets yet. <Link to="/app/support#create">Create your first ticket!</Link>
        </p>
      ) : (
        <ul className="ticket-items">
          {tickets.map((ticket: Ticket) => (
            <TicketItem
              key={ticket.id}
              ticket={ticket}
              onDelete={handleDelete}
              isDeleting={isDeletingTicket && deletingTicketId === ticket.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
