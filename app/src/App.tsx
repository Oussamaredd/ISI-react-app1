// client/src/App.tsx - Business logic app with authentication
import React from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useCurrentUser, AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./context/ToastContext";
import { ErrorHandlingSetup } from "./components/ErrorHandlingSetup";
import { ErrorDemo } from "./components/ErrorDemo";
import TicketListPage from "./pages/TicketList";
import AdvancedTicketList from "./pages/AdvancedTicketList";
import CreateTickets from "./pages/CreateTickets";
import TreatTicketPage from "./pages/TreatTicketPage";
import TicketDetails from "./pages/TicketDetails";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import LoginButton from "./components/LoginButton";
import LogoutButton from "./components/LogoutButton";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Navigation({ user }) {
  const location = useLocation();

  const getLinkClass = (path) =>
    location.pathname === path ? "app-nav-link app-nav-link-active" : "app-nav-link";

  const hasAdminAccess =
    user?.roles?.some((role) => role.name === "admin" || role.name === "super_admin") ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  return (
    <nav className="app-nav">
      <Link to="/dashboard" className={getLinkClass("/dashboard")}>
        <span>Dashboard</span>
      </Link>
      <Link to="/tickets/advanced" className={getLinkClass("/tickets/advanced")}>
        <span>Advanced List</span>
      </Link>
      <Link to="/tickets" className={getLinkClass("/tickets")}>
        <span>Simple List</span>
      </Link>
      <Link to="/tickets/create" className={getLinkClass("/tickets/create")}>
        <span>Create Ticket</span>
      </Link>
      {hasAdminAccess && (
        <Link to="/admin" className={getLinkClass("/admin")}>
          <span>Admin</span>
        </Link>
      )}
    </nav>
  );
}

function AuthenticatedApp({ user }) {
  const hasAdminAccess =
    user?.roles?.some((role) => role.name === "admin" || role.name === "super_admin") ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  return (
    <div>
      <header className="app-header">
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
            hasAdminAccess ? (
              <AdminDashboard />
            ) : (
              <div className="app-access-denied">
                <h2>Access Denied</h2>
                <p>You don't have permission to access the admin dashboard.</p>
              </div>
            )
          }
        />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const [initializing, setInitializing] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setInitializing(false), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isLoggedIn = Boolean(user) || Boolean(isAuthenticated);

  if (isLoading || initializing) {
    return (
      <div className="app-loading-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <ErrorHandlingSetup>
        <ToastProvider>
          <div className="app-login-screen">
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
