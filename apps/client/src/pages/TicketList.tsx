// client/src/pages/TicketList.tsx
import React from "react";
import TicketList from "../components/TicketList";
import "../styles/TicketList.css";

export default function TicketListPage() {
  return (
    <div className="container">
      <h1>All Tickets</h1>
      <TicketList />
    </div>
  );
}
