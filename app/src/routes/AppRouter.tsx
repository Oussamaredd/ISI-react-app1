import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useCurrentUser } from "../hooks/useAuth";
import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import AppLayout from "../layouts/AppLayout";
import RequireAuth from "./guards/RequireAuth";
import RequireGuest from "./guards/RequireGuest";
import Dashboard from "../pages/Dashboard";
import TicketListPage from "../pages/TicketList";
import AdvancedTicketList from "../pages/AdvancedTicketList";
import CreateTickets from "../pages/CreateTickets";
import TicketDetails from "../pages/TicketDetails";
import TreatTicketPage from "../pages/TreatTicketPage";
import SettingsPage from "../pages/SettingsPage";
import { AdminDashboard } from "../pages/AdminDashboard";
import AuthCallbackPage from "../pages/auth/AuthCallbackPage";
import LoginPage from "../pages/auth/LoginPage";
import SignupPage from "../pages/auth/SignupPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import LandingPage from "../pages/landing/LandingPage";
import MarketingInfoPage from "../pages/landing/MarketingInfoPage";
import { MARKETING_PAGE_LIST } from "../pages/landing/marketingPages";
import RouteScrollToTop from "../components/RouteScrollToTop";

const hasAdminRole = (user: any) =>
  user?.roles?.some((role: any) => role.name === "admin" || role.name === "super_admin") ||
  user?.role === "admin" ||
  user?.role === "super_admin";

function RootLandingRoute() {
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

  if (isLoggedIn && !location.hash) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <LandingPage />;
}

function AdminRoute() {
  const { user } = useCurrentUser();

  if (!hasAdminRole(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access the admin dashboard.</p>
      </div>
    );
  }

  return <AdminDashboard />;
}

export default function AppRouter() {
  return (
    <>
      <RouteScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<RootLandingRoute />} />
          {MARKETING_PAGE_LIST.map((page) => (
            <Route
              key={page.key}
              path={`/${page.path}`}
              element={<MarketingInfoPage pageKey={page.key} />}
            />
          ))}
          <Route path="/faq" element={<Navigate to="/support" replace />} />
        </Route>

        <Route element={<RequireGuest />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tickets/advanced" element={<AdvancedTicketList />} />
            <Route path="tickets" element={<TicketListPage />} />
            <Route path="tickets/create" element={<CreateTickets />} />
            <Route path="tickets/:id/details" element={<TicketDetails />} />
            <Route path="tickets/:id/treat" element={<TreatTicketPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminRoute />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route path="/landing" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
