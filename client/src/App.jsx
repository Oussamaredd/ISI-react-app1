// client/src/App.jsx
import React, { useContext, useEffect, useState } from "react";
import { TicketsProvider, TicketsContext } from "./context/Tickets";
import AppRoutes from "./routes/AppRoutes";

// Small helper comps (make sure these files exist)
import LoginButton from "./components/LoginButton";
import LogoutButton from "./components/LogoutButton";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL) ||
  "http://localhost:5000";

function AppContent() {
  const context = useContext(TicketsContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("not-authenticated");
        const u = await res.json();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  // If NOT logged in: show login screen only
  if (!user) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h2>Welcome to ISI Ticket Manager</h2>
        <p>Please log in with your Google account to continue.</p>
        <LoginButton />
      </div>
    );
  }

  // Logged in: show your existing UI
  if (!context) return null;
  const { currentPage, setCurrentPage } = context;

  return (
    <div>
      <header
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem" }}
      >
        <h3>Logged in as {user?.name || user?.email || "User"}</h3>
        <LogoutButton />
      </header>

      <nav>
        <button onClick={() => setCurrentPage("list")} disabled={currentPage === "list"}>Tickets List</button>
        <button onClick={() => setCurrentPage("create")} disabled={currentPage === "create"}>Create Ticket</button>
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
