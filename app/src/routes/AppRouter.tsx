import { Suspense, lazy, type ReactElement } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppStatusScreen from "../components/AppStatusScreen";
import RouteScrollToTop from "../components/RouteScrollToTop";
import { loadAppRuntimeConfig } from "../config/runtimeFeatures";
import { useCurrentUser } from "../hooks/useAuth";
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import PublicLayout from "../layouts/PublicLayout";
import Dashboard from "../pages/Dashboard";
import LandingPage from "../pages/landing/LandingPage";
import LoginPage from "../pages/auth/LoginPage";
import { MARKETING_PAGE_LIST } from "../pages/landing/marketingPages";
import {
  hasAdminAccess,
  hasAgentAccess,
  hasCitizenAccess,
  hasManagerAccess,
  hasSupportWorkspaceAccess,
} from "../utils/authz";
import RequireAuth from "./guards/RequireAuth";
import RequireGuest from "./guards/RequireGuest";

const AppHomePage = lazy(() => import("../pages/AppHomePage"));
const AgentTourPage = lazy(() => import("../pages/AgentTourPage"));
const ManagerPlanningPage = lazy(() => import("../pages/ManagerPlanningPage"));
const ManagerToursPage = lazy(() => import("../pages/ManagerToursPage"));
const ManagerReportsPage = lazy(() => import("../pages/ManagerReportsPage"));
const CitizenChallengesPage = lazy(() => import("../pages/CitizenChallengesPage"));
const CitizenProfilePage = lazy(() => import("../pages/CitizenProfilePage"));
const CitizenReportPage = lazy(() => import("../pages/CitizenReportPage"));
const SupportPage = lazy(() => import("../pages/SupportPage"));
const TicketDetails = lazy(() => import("../pages/TicketDetails"));
const TreatTicketPage = lazy(() => import("../pages/TreatTicketPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const AdminDashboard = lazy(() =>
  import("../pages/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  })),
);
const AuthCallbackPage = lazy(() => import("../pages/auth/AuthCallbackPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const MarketingInfoPage = lazy(() => import("../pages/landing/MarketingInfoPage"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const SignupPage = lazy(() => import("../pages/auth/SignupPage"));

const RouteLoadingFallback = () => (
  <AppStatusScreen
    title="Loading EcoTrack"
    message="Preparing the next page so you can keep moving through the workspace."
  />
);

const withRouteSuspense = (element: ReactElement) => (
  <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
);

function RootLandingRoute() {
  const { user, isAuthenticated, isLoading, authState } = useCurrentUser();
  const location = useLocation();
  const isLoggedIn = Boolean(user) || Boolean(isAuthenticated);
  const resolvedAuthState = authState ?? (isLoading ? 'unknown' : isLoggedIn ? 'authenticated' : 'anonymous');

  if ((resolvedAuthState === 'authenticated' || (resolvedAuthState !== 'unknown' && isLoggedIn)) && !location.hash) {
    return <Navigate to="/app" replace />;
  }

  return withRouteSuspense(<LandingPage />);
}

function AdminRoute() {
  const { user } = useCurrentUser();
  const { adminWorkspaceEnabled } = loadAppRuntimeConfig();

  if (!adminWorkspaceEnabled) {
    return <Navigate to="/app" replace />;
  }

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

function DashboardRoute() {
  const { user } = useCurrentUser();

  if (!hasManagerAccess(user)) {
    return <Navigate to="/app" replace />;
  }

  return withRouteSuspense(<Dashboard />);
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
  const { managerReportsEnabled } = loadAppRuntimeConfig();

  if (!managerReportsEnabled) {
    return <Navigate to="/app" replace />;
  }

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

function ManagerToursRoute() {
  const { user } = useCurrentUser();

  if (!hasManagerAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access manager tour operations.</p>
      </div>
    );
  }

  return withRouteSuspense(<ManagerToursPage />);
}

function CitizenChallengesRoute() {
  const { user } = useCurrentUser();
  const { citizenChallengesEnabled } = loadAppRuntimeConfig();

  if (!citizenChallengesEnabled) {
    return <Navigate to="/app" replace />;
  }

  if (!hasCitizenAccess(user)) {
    return (
      <AccessDeniedMessage message="You don't have permission to access citizen tools." />
    );
  }

  return withRouteSuspense(<CitizenChallengesPage />);
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

function SupportWorkspaceRouteGuard() {
  const { user } = useCurrentUser();

  if (!hasSupportWorkspaceAccess(user)) {
    return <Navigate to="/support" replace />;
  }

  return <Outlet />;
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
            <Route index element={withRouteSuspense(<AppHomePage />)} />
            <Route path="dashboard" element={<DashboardRoute />} />
            <Route path="agent" element={<AgentRouteGuard />}>
              <Route path="tour" element={withRouteSuspense(<AgentTourPage />)} />
            </Route>
            <Route path="manager/planning" element={<ManagerRoute />} />
            <Route path="manager/tours" element={<ManagerToursRoute />} />
            <Route path="manager/reports" element={<ManagerReportsRoute />} />
            <Route path="citizen" element={<CitizenRouteGuard />}>
              <Route path="report" element={withRouteSuspense(<CitizenReportPage />)} />
              <Route path="profile" element={withRouteSuspense(<CitizenProfilePage />)} />
              <Route path="challenges" element={<CitizenChallengesRoute />} />
            </Route>
            <Route element={<SupportWorkspaceRouteGuard />}>
              <Route path="support" element={withRouteSuspense(<SupportPage />)} />
              <Route path="tickets/advanced" element={<Navigate to="/app/support#advanced" replace />} />
              <Route path="tickets" element={<Navigate to="/app/support#simple" replace />} />
              <Route path="tickets/create" element={<Navigate to="/app/support#create" replace />} />
              <Route path="tickets/:id/details" element={withRouteSuspense(<TicketDetails />)} />
              <Route path="tickets/:id/treat" element={withRouteSuspense(<TreatTicketPage />)} />
            </Route>
            <Route path="settings" element={withRouteSuspense(<SettingsPage />)} />
            <Route path="admin" element={<AdminRoute />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Route>

        <Route path="/landing" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
