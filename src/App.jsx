import React, { useContext } from "react";
import { TicketsProvider, TicketsContext } from "./context/Tickets";
import CreateTickets from "./pages/CreateTickets";
import TicketListPage from "./pages/TicketList";

function AppContent() {
  const context = useContext(TicketsContext);
  if (!context) return null;

  const { currentPage, setCurrentPage } = context;

  return (
    <div>
      <nav>
        <button onClick={() => setCurrentPage("list")}>Tickets List</button>
        <button onClick={() => setCurrentPage("create")}>Create Ticket</button>
      </nav>

      {currentPage === "list" ? <TicketListPage /> : <CreateTickets />}
    </div>
  );
}

export default function App() {
  return (
    <TicketsProvider>
      <AppContent />
    </TicketsProvider>
  );
}
