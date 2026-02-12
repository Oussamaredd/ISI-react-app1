import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useAuth";

const buildNextParam = (path: string, search: string, hash: string) => {
  const fullPath = `${path}${search}${hash}`;
  return encodeURIComponent(fullPath);
};

export default function RequireAuth() {
  const { user, isAuthenticated, isLoading } = useCurrentUser();
  const location = useLocation();
  const isLoggedIn = Boolean(user) || Boolean(isAuthenticated);

  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    const next = buildNextParam(location.pathname, location.search, location.hash);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  return <Outlet />;
}
