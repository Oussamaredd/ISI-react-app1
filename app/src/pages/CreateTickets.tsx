// client/src/pages/CreateTickets.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import CreateTicket from "../components/CreateTicket";
import "../styles/CreateTickets.css";

export default function CreateTickets() {
  const navigate = useNavigate();

  return (
    <div className="container create-page">
      <h1>Create a New Ticket</h1>
      <CreateTicket onSuccess={() => navigate("/app/tickets")} />
    </div>
  );
}
