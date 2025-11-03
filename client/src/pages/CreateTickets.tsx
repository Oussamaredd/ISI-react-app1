import React from "react";
import CreateTicket from "../components/CreateTicket";
import "../styles/CreateTickets.css";

export default function CreateTickets() {
  return (
    <div className="container">
      <h1>Create a New Ticket</h1>
      <CreateTicket />
    </div>
  );
}
