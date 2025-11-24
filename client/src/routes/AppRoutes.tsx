// client/src/routes/AppRoutes.tsx
import React, { useContext } from "react";
import CreateTickets from "../pages/CreateTickets";
import TicketListPage from "../pages/TicketList";
import { TicketsContext } from "../context/Tickets";
import TreatTicketPage from "../pages/TreatTicketPage";

export default function AppRoutes() {
  const context = useContext(TicketsContext);
  if (!context) return null;

  const { currentPage } = context;

  switch (currentPage) {
    case "list":
      return <TicketListPage />;
    case "create":
      return <CreateTickets />;
    case "treat":
      return <TreatTicketPage />;
    default:
      return null;
  }
}
