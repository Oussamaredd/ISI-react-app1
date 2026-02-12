// client/src/components/TreatTicket.tsx
import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTicketDetails, useAssignHotelToTicket, useHotels } from "../hooks/useTickets";

export default function TreatTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assigningToHotel, setAssigningToHotel] = useState<string | null>(null);

  const { data: ticket, isLoading: ticketLoading, error: ticketError } = useTicketDetails(id);
  const { data: hotelsData, isLoading: hotelsLoading } = useHotels(); // All hotels
  const { mutateAsync: assignHotel, isPending: isAssigning } = useAssignHotelToTicket();

  if (!id) {
    return <div>Invalid ticket ID</div>;
  }

  if (ticketLoading || hotelsLoading) {
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

  const hotels = Array.isArray((hotelsData as any)?.hotels)
    ? (hotelsData as any).hotels
    : Array.isArray(hotelsData)
      ? (hotelsData as any)
      : [];

  const handleAssign = async (hotelId: string) => {
    setAssigningToHotel(hotelId);
    try {
      await assignHotel({ ticketId: id, hotelId });
      navigate("/app/tickets");
    } catch (error: any) {
      console.error("Failed to assign hotel:", error);
      // Error is handled by React Query with toast notifications
    } finally {
      setAssigningToHotel(null);
    }
  };

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
          Hotel: {ticket.hotelId || "Unassigned"}
        </p>
      </div>

      <h3>Available Hotels</h3>
      {hotels.length === 0 ? (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
          }}
        >
          No available hotels found.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {hotels.map((hotel: any) => (
            <div
              key={hotel.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "1rem",
                backgroundColor: "white",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{hotel.name}</h4>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#28a745", fontWeight: "bold" }}>Available</span>
                <button
                  onClick={() => handleAssign(String(hotel.id))}
                  disabled={isAssigning || assigningToHotel === String(hotel.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor:
                      isAssigning || assigningToHotel === String(hotel.id) ? "#6c757d" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isAssigning || assigningToHotel === String(hotel.id) ? "not-allowed" : "pointer",
                  }}
                >
                  {assigningToHotel === String(hotel.id) ? "Assigning..." : "Assign Hotel"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
