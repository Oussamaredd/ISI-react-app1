import { Suspense, lazy, type ReactElement } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import RouteScrollToTop from "../components/RouteScrollToTop";
import { useCurrentUser } from "../hooks/useAuth";
import { MARKETING_PAGE_LIST } from "../pages/landing/marketingPages";
import {
  hasAdminAccess,
  hasAgentAccess,
  hasCitizenAccess,
  hasManagerAccess,
} from "../utils/authz";
import RequireAuth from "./guards/RequireAuth";
import RequireGuest from "./guards/RequireGuest";

const PublicLayout = lazy(() => import("../layouts/PublicLayout"));
const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const AppLayout = lazy(() => import("../layouts/AppLayout"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const AgentTourPage = lazy(() => import("../pages/AgentTourPage"));
const ManagerPlanningPage = lazy(() => import("../pages/ManagerPlanningPage"));
const ManagerReportsPage = lazy(() => import("../pages/ManagerReportsPage"));
const CitizenChallengesPage = lazy(() => import("../pages/CitizenChallengesPage"));
const CitizenProfilePage = lazy(() => import("../pages/CitizenProfilePage"));
const CitizenReportPage = lazy(() => import("../pages/CitizenReportPage"));
const TicketListPage = lazy(() => import("../pages/TicketList"));
const AdvancedTicketList = lazy(() => import("../pages/AdvancedTicketList"));
const CreateTickets = lazy(() => import("../pages/CreateTickets"));
const TicketDetails = lazy(() => import("../pages/TicketDetails"));
const TreatTicketPage = lazy(() => import("../pages/TreatTicketPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const AdminDashboard = lazy(() =>
  import("../pages/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  })),
);
const AuthCallbackPage = lazy(() => import("../pages/auth/AuthCallbackPage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const SignupPage = lazy(() => import("../pages/auth/SignupPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const LandingPage = lazy(() => import("../pages/landing/LandingPage"));
const MarketingInfoPage = lazy(() => import("../pages/landing/MarketingInfoPage"));

const RouteLoadingFallback = () => (
  <div className="app-loading-screen">
    <div>Loading...</div>
  </div>
);

const withRouteSuspense = (element: ReactElement) => (
  <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
);

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

  return withRouteSuspense(<LandingPage />);
}

function AdminRoute() {
  const { user } = useCurrentUser();

  if (!hasAdminAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access the admin dashboard.</p>
      </div>
    );
  }

  return withRouteSuspense(<AdminDashboard />);
}

function ManagerRoute() {
  const { user } = useCurrentUser();

  if (!hasManagerAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access manager planning.</p>
      </div>
    );
  }

  return withRouteSuspense(<ManagerPlanningPage />);
}

function ManagerReportsRoute() {
  const { user } = useCurrentUser();

  if (!hasManagerAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access manager reports.</p>
      </div>
    );
  }

  return withRouteSuspense(<ManagerReportsPage />);
}

function AccessDeniedMessage({ message }: { message: string }) {
  return (
    <div className="app-access-denied">
      <h2>Access Denied</h2>
      <p>{message}</p>
    </div>
  );
}

function AgentRouteGuard() {
  const { user } = useCurrentUser();

  if (!hasAgentAccess(user)) {
    return (
      <AccessDeniedMessage message="You don't have permission to access the agent workspace." />
    );
  }

  return <Outlet />;
}

function CitizenRouteGuard() {
  const { user } = useCurrentUser();

  if (!hasCitizenAccess(user)) {
    return (
      <AccessDeniedMessage message="You don't have permission to access citizen tools." />
    );
  }

  return <Outlet />;
}

export default function AppRouter() {
  return (
    <>
      <RouteScrollToTop />
      <Routes>
        <Route element={withRouteSuspense(<PublicLayout />)}>
          <Route path="/" element={<RootLandingRoute />} />
          {MARKETING_PAGE_LIST.map((page) => (
            <Route
              key={page.key}
              path={`/${page.path}`}
              element={withRouteSuspense(<MarketingInfoPage pageKey={page.key} />)}
            />
          ))}
          <Route path="/faq" element={<Navigate to="/support" replace />} />
        </Route>

        <Route element={<RequireGuest />}>
          <Route element={withRouteSuspense(<AuthLayout />)}>
            <Route path="/login" element={withRouteSuspense(<LoginPage />)} />
            <Route path="/signup" element={withRouteSuspense(<SignupPage />)} />
            <Route path="/forgot-password" element={withRouteSuspense(<ForgotPasswordPage />)} />
            <Route path="/reset-password" element={withRouteSuspense(<ResetPasswordPage />)} />
          </Route>
        </Route>

        <Route element={withRouteSuspense(<AuthLayout />)}>
          <Route path="/auth/callback" element={withRouteSuspense(<AuthCallbackPage />)} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/app" element={withRouteSuspense(<AppLayout />)}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={withRouteSuspense(<Dashboard />)} />
            <Route path="agent" element={<AgentRouteGuard />}>
              <Route path="tour" element={withRouteSuspense(<AgentTourPage />)} />
            </Route>
            <Route path="manager/planning" element={<ManagerRoute />} />
            <Route path="manager/reports" element={<ManagerReportsRoute />} />
            <Route path="citizen" element={<CitizenRouteGuard />}>
              <Route path="report" element={withRouteSuspense(<CitizenReportPage />)} />
              <Route path="profile" element={withRouteSuspense(<CitizenProfilePage />)} />
              <Route path="challenges" element={withRouteSuspense(<CitizenChallengesPage />)} />
            </Route>
            <Route path="tickets/advanced" element={withRouteSuspense(<AdvancedTicketList />)} />
            <Route path="tickets" element={withRouteSuspense(<TicketListPage />)} />
            <Route path="tickets/create" element={withRouteSuspense(<CreateTickets />)} />
            <Route path="tickets/:id/details" element={withRouteSuspense(<TicketDetails />)} />
            <Route path="tickets/:id/treat" element={withRouteSuspense(<TreatTicketPage />)} />
            <Route path="settings" element={withRouteSuspense(<SettingsPage />)} />
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
