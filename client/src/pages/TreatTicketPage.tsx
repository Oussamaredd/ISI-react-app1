import React from "react";
import TreatTicket from "../components/TreatTicket";
import "../styles/TicketList.css"; // or create TreatTicket.css if you want

export default function TreatTicketPage() {
  return (
    <div className="container">
      <h1>Treat Ticket</h1>
      <TreatTicket />
    </div>
  );
}
