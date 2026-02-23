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
        <div>
          <div className="ticket-item-header">
            <strong>{ticket.title}</strong>
            <span className={priorityClass}>Priority: {priority}</span>
            <em className={statusClass}>Status: {status}</em>
          </div>
          {ticket.hotelId && <span className="ticket-hotel">Hotel: {ticket.hotelId}</span>}
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
    return <div>Loading tickets...</div>;
  }

  if (error) {
    return <div>Error loading tickets: {error.message}</div>;
  }

  return (
    <div>
      {deleteError ? (
        <div role="alert" className="ticket-delete-error">
          {deleteError}
        </div>
      ) : null}
      {tickets.length === 0 ? (
        <p>
          No tickets yet. <Link to="/app/tickets/create">Create your first ticket!</Link>
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
