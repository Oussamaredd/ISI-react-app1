// client/src/App.jsx
import React, { useContext } from "react";
import { TicketsProvider, TicketsContext } from "./context/Tickets";
import AppRoutes from "./routes/AppRoutes";

function AppContent() {
  const context = useContext(TicketsContext);
  if (!context) return null;

  const { currentPage, setCurrentPage } = context;

  return (
    <div>
      <nav>
        <button
          onClick={() => setCurrentPage("list")}
          disabled={currentPage === "list"}
        >
          Tickets List
        </button>
        <button
          onClick={() => setCurrentPage("create")}
          disabled={currentPage === "create"}
        >
          Create Ticket
        </button>
      </nav>

      <AppRoutes />
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
