import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useAuth";

export default function RequireGuest() {
  const { user, isAuthenticated, isLoading } = useCurrentUser();
  const isLoggedIn = Boolean(user) || Boolean(isAuthenticated);

  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
}
