// client/src/App.jsx
import React, { useContext, useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TicketsProvider, TicketsContext } from "./context/Tickets";
import { ToastProvider } from "./context/ToastContext";
import AppRoutes from "./routes/AppRoutes";
import LoginButton from "./components/LoginButton";
import LogoutButton from "./components/LogoutButton";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Authentication context using TanStack Query
function AuthenticatedApp() {
  const context = useContext(TicketsContext);

  // If not authenticated, show login screen
  if (!context) return null;
  const { currentPage, setCurrentPage } = context;

  return (
    <div>
      <header
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem" }}
      >
        <h3>Logged in as {context.user?.name || context.user?.email || "User"}</h3>
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
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
        <h2>AUTHENTIFICATION PROCESS</h2>
        <p>Please log in with your Google account to continue.</p>
        <LoginButton />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TicketsProvider user={user}>
          <AuthenticatedApp />
        </TicketsProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  );
}
