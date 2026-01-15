// client/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useCurrentUser } from "./hooks/useTickets";
import { ToastProvider } from "./context/ToastContext";
import { ErrorHandlingSetup } from "./components/ErrorHandlingSetup.jsx";
import { ErrorDemo } from "./components/ErrorDemo.jsx";
import TicketListPage from "./pages/TicketList";
import AdvancedTicketList from "./pages/AdvancedTicketList";
import CreateTickets from "./pages/CreateTickets";
import TreatTicketPage from "./pages/TreatTicketPage";
import TicketDetails from "./pages/TicketDetails";
import Dashboard from "./pages/Dashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
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

// Navigation component
function Navigation({ user }) {
  const location = useLocation();
  
  const getLinkStyle = (path) => ({
    marginRight: "1rem",
    textDecoration: location.pathname === path ? "underline" : "none",
    fontWeight: location.pathname === path ? "bold" : "normal",
    color: location.pathname === path ? "#007bff" : "#000",
  });
  
  return (
    <nav style={{ padding: "1rem 0", borderBottom: "1px solid #ddd", marginBottom: "1rem" }}>
      <Link to="/dashboard" style={getLinkStyle("/dashboard")}>
        📊 Dashboard
      </Link>
      <Link to="/tickets/advanced" style={getLinkStyle("/tickets/advanced")}>
        🎫 Advanced List
      </Link>
      <Link to="/tickets" style={getLinkStyle("/tickets")}>
        📋 Simple List
      </Link>
      <Link to="/tickets/create" style={getLinkStyle("/tickets/create")}>
        ➕ Create Ticket
      </Link>
      {(user?.roles?.some(role => role.name === 'admin' || role.name === 'super_admin') || user?.role === 'admin' || user?.role === 'super_admin') && (
        <Link to="/admin" style={getLinkStyle("/admin")}>
          ⚙️ Admin
        </Link>
      )}
    </nav>
  );
}

// Authenticated App Component
function AuthenticatedApp({ user }) {
  return (
    <div>
      <header
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem" }}
      >
        <h3>Logged in as {user?.name || user?.email || "User"}</h3>
        <LogoutButton />
      </header>

      <Navigation user={user} />
      
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tickets/advanced" element={<AdvancedTicketList />} />
        <Route path="/tickets" element={<TicketListPage />} />
        <Route path="/tickets/create" element={<CreateTickets />} />
        <Route path="/tickets/:id/details" element={<TicketDetails />} />
        <Route path="/tickets/:id/treat" element={<TreatTicketPage />} />
        <Route 
          path="/admin" 
          element={
            (user?.roles?.some(role => role.name === 'admin' || role.name === 'super_admin') || user?.role === 'admin' || user?.role === 'super_admin') 
              ? <AdminDashboard /> 
              : <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access the admin dashboard.</p>
                </div>
          } 
        />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

// Main App Component
export default function App() {
  const { user, isLoading, error, isAuthenticated } = useCurrentUser();

  if (isLoading) {
    return (
      <div style={{ 
        padding: 24, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Loading…</div>
      </div>
    );
  }

  // If NOT logged in: show login screen only
  if (!isAuthenticated) {
    return (
      <ErrorHandlingSetup>
        <ToastProvider>
          <div style={{ textAlign: "center", marginTop: "4rem" }}>
            <h2>AUTHENTIFICATION PROCESS</h2>
            <p>Please log in with your Google account to continue.</p>
            <LoginButton />
          </div>
        </ToastProvider>
      </ErrorHandlingSetup>
    );
  }

  return (
    <ErrorHandlingSetup>
      <ToastProvider>
        <AuthenticatedApp user={user} />
        <ErrorDemo />
      </ToastProvider>
    </ErrorHandlingSetup>
  );
}
