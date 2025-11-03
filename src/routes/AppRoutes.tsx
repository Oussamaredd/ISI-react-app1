import React, { useContext } from "react";
import CreateTickets from "../pages/CreateTickets";
import TicketListPage from "../pages/TicketList";
import { TicketsContext } from "../context/Tickets";

export default function AppRoutes() {
  const context = useContext(TicketsContext);
  if (!context) return null;

  const { currentPage } = context;

  switch (currentPage) {
    case "create":
      return <CreateTickets />;
    case "list":
    default:
      return <TicketListPage />;
  }
}
