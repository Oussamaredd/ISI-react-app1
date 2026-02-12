import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useAuth";
import LogoutButton from "../components/LogoutButton";
import { ErrorDemo } from "../components/ErrorDemo";

type LocationState = {
  legacyNotice?: string;
} | null;

const hasAdminRole = (user: any) =>
  user?.roles?.some((role: any) => role.name === "admin" || role.name === "super_admin") ||
  user?.role === "admin" ||
  user?.role === "super_admin";

export default function AppLayout() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [legacyNotice, setLegacyNotice] = React.useState<string | null>(null);
  const canAccessAdmin = hasAdminRole(user);

  React.useEffect(() => {
    const state = location.state as LocationState;
    if (state?.legacyNotice) {
      setLegacyNotice(state.legacyNotice);
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: null,
      });
    }
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  const getLinkClass = (path: string) =>
    location.pathname === path ? "app-nav-link app-nav-link-active" : "app-nav-link";

  return (
    <div>
      <header className="app-header">
        <h3>Logged in as {user?.name || user?.email || "User"}</h3>
        <div className="app-header-actions">
          <Link to="/#features" className="app-marketing-link">
            Marketing Site
          </Link>
          <LogoutButton />
        </div>
      </header>

      {legacyNotice && (
        <div className="app-legacy-notice" role="status">
          <span>{legacyNotice}</span>
          <button type="button" onClick={() => setLegacyNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <nav className="app-nav" aria-label="Product Navigation">
        <Link to="/app/dashboard" className={getLinkClass("/app/dashboard")}>
          <span>Dashboard</span>
        </Link>
        <Link to="/app/tickets/advanced" className={getLinkClass("/app/tickets/advanced")}>
          <span>Advanced List</span>
        </Link>
        <Link to="/app/tickets" className={getLinkClass("/app/tickets")}>
          <span>Simple List</span>
        </Link>
        <Link to="/app/tickets/create" className={getLinkClass("/app/tickets/create")}>
          <span>Create Ticket</span>
        </Link>
        {canAccessAdmin && (
          <Link to="/app/admin" className={getLinkClass("/app/admin")}>
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <Outlet />
      <ErrorDemo />
    </div>
  );
}
