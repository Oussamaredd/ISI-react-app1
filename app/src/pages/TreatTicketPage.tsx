import React from "react";
import { useParams, Link } from "react-router-dom";
import TreatTicket from "../components/TreatTicket";
import "../styles/TicketList.css";

export default function TreatTicketPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div className="container">Invalid ticket ID</div>;
  }

  return (
    <div className="container">
      <h1>Treat Ticket #{id}</h1>
      <TreatTicket />
      
      <div style={{ marginTop: "2rem" }}>
        <Link 
          to={`/tickets/${id}/details`}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          ← View Ticket Details
        </Link>
        
        <Link 
          to="/tickets"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "0.5rem"
          }}
        >
          ← Back to List
        </Link>
      </div>
    </div>
  );
}
