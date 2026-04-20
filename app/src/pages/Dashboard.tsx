import React, { Suspense, useDeferredValue, useEffect } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock3,
} from "lucide-react";
import DocumentMetadata from "../components/DocumentMetadata";
import PanelSkeleton from "../components/dashboard/PanelSkeleton";
import { useCurrentUser } from "../hooks/useAuth";
import { usePlanningDashboard } from "../hooks/usePlanning";
import { usePlanningRealtimeSocket } from "../hooks/usePlanningRealtimeSocket";
import { usePlanningRealtimeStream } from "../hooks/usePlanningRealtimeStream";
import { useDashboard, type DashboardData } from "../hooks/useTickets";
import { useDashboardPreferences } from "../state/DashboardPreferencesContext";
import { hasAdminAccess, hasManagerAccess } from "../utils/authz";

const PlanningSummaryPanel = React.lazy(
  () => import("../components/dashboard/PlanningSummaryPanel"),
);
const ManagerHeatmapPanel = React.lazy(
  () => import("../components/dashboard/ManagerHeatmapPanel"),
);
const ActivityPanel = React.lazy(() => import("../components/dashboard/ActivityPanel"));
const StatusPanel = React.lazy(() => import("../components/dashboard/StatusPanel"));
const AdminCenterPanel = React.lazy(
  () => import("../components/dashboard/AdminCenterPanel"),
);
const RecentTicketsPanel = React.lazy(
  () => import("../components/dashboard/RecentTicketsPanel"),
);
const COUNT_FORMATTER = new Intl.NumberFormat("en-US");
const DEFAULT_SUMMARY: DashboardData["summary"] = {
  total: 0,
  open: 0,
  completed: 0,
  assigned: 0,
};

type StatusSummary = {
  key: string;
  label: string;
  count: number;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatStatusLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown";

const PanelFallback = ({ title }: { title: string }) => (
  <PanelSkeleton title={title} />
);

export default function Dashboard() {
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { setLastRealtimeState } = useDashboardPreferences();
  const dashboardQuery = useDashboard();
  const dashboardData = dashboardQuery.data as DashboardData | undefined;

  const summary = React.useMemo(() => {
    const rawSummary = dashboardData?.summary ?? DEFAULT_SUMMARY;
    const total = toNumber(rawSummary.total);
    const completed = toNumber(rawSummary.completed);
    const assigned = toNumber(rawSummary.assigned);

    return {
      total,
      open: toNumber(rawSummary.open),
      completed,
      assigned,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      assignmentRate: total > 0 ? Math.round((assigned / total) * 100) : 0,
    };
  }, [dashboardData]);

  const statusBreakdown = React.useMemo<StatusSummary[]>(() => {
    const statusEntries = Object.entries(dashboardData?.statusBreakdown ?? {})
      .map(([status, count]) => ({
        key: status,
        label: formatStatusLabel(status),
        count: toNumber(count),
      }))
      .sort((a, b) => b.count - a.count);

    if (statusEntries.length > 0) {
      return statusEntries;
    }

    if (summary.total === 0) {
      return [];
    }

    return [
      { key: "open", label: "Open", count: summary.open },
      { key: "completed", label: "Completed", count: summary.completed },
    ];
  }, [dashboardData, summary.completed, summary.open, summary.total]);

  const recentActivity = React.useMemo(() => {
    if (!Array.isArray(dashboardData?.recentActivity)) {
      return [] as Array<{ date: string; created: number; updated: number }>;
    }

    return dashboardData.recentActivity
      .map((item) => ({
        date: item.date ?? "",
        created: toNumber(item.created),
        updated: toNumber(item.updated),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dashboardData]);

  const recentTickets = React.useMemo(() => {
    if (!Array.isArray(dashboardData?.recentTickets)) {
      return [] as Array<{
        id: string;
        name: string;
        status: string;
        contextLabel: string;
        lastUpdate: string | null;
      }>;
    }

    return dashboardData.recentTickets.slice(0, 6).map((ticket) => ({
      id: String(ticket.id ?? ""),
      name: ticket.name || "Untitled ticket",
      status: ticket.status || "open",
      contextLabel: "Support ticket",
      lastUpdate: ticket.updatedAt || ticket.createdAt || null,
    }));
  }, [dashboardData]);

  const peakActivity = recentActivity.reduce(
    (maxValue, item) => Math.max(maxValue, item.created, item.updated),
    1,
  );
  const deferredRecentTickets = useDeferredValue(recentTickets);
  const userDisplayName =
    user?.displayName || user?.name || user?.email || "EcoTrack operator";
  const firstName = userDisplayName.split(" ")[0] || "Operator";
  const canAccessAdmin = hasAdminAccess(user);
  const canAccessManager = hasManagerAccess(user);
  const planningDashboardQuery = usePlanningDashboard(canAccessManager);
  const realtimeSocket = usePlanningRealtimeSocket(canAccessManager);
  const realtimeStream = usePlanningRealtimeStream(
    canAccessManager && realtimeSocket.connectionState !== "connected",
  );

  const isSyncing =
    dashboardQuery.isFetching || (canAccessManager && planningDashboardQuery.isFetching);

  const streamState =
    realtimeSocket.connectionState === "connected"
      ? "ws-connected"
      : realtimeStream.connectionState;
  const syncStateLabel =
    streamState === "ws-connected"
      ? "WebSocket live"
      : streamState === "connected"
        ? "Live stream"
        : streamState === "reconnecting"
          ? "Reconnecting"
          : streamState === "fallback"
            ? "Polling fallback"
            : isSyncing
              ? "Syncing"
              : "Live";

  const syncStateDescription =
    streamState === "ws-connected"
      ? "WebSocket push active"
      : streamState === "connected"
        ? "Server push active"
        : streamState === "reconnecting"
          ? "Reconnecting realtime channel"
          : streamState === "fallback"
            ? "Push unavailable, polling active"
            : isSyncing
              ? "Refreshing metrics now"
              : "Auto-refresh active";

  useEffect(() => {
    setLastRealtimeState(`${syncStateLabel}: ${syncStateDescription}`);
  }, [setLastRealtimeState, syncStateDescription, syncStateLabel]);

  const latestDataUpdatedAt = canAccessManager
    ? Math.max(dashboardQuery.dataUpdatedAt, planningDashboardQuery.dataUpdatedAt)
    : dashboardQuery.dataUpdatedAt;
  const lastSync =
    latestDataUpdatedAt > 0
      ? new Date(latestDataUpdatedAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Pending";
  const dashboardErrorMessage =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : "Try again in a moment.";
  const planningDashboard =
    (planningDashboardQuery.data as {
      ecoKpis?: { containers?: number; zones?: number; tours?: number };
    } | undefined) ?? {};

  if (isUserLoading) {
    return (
      <section className="dashboard-page" aria-label="Dashboard">
        <div className="dashboard-loading-state">Loading dashboard...</div>
      </section>
    );
  }

  return (
    <section className="dashboard-page" aria-label="Dashboard">
      <DocumentMetadata
        title="Dashboard | EcoTrack"
        description="Monitor citizen-driven operational demand, planning risk, and manager coordination from the primary EcoTrack dashboard."
        canonicalPath="/app/dashboard"
      />
      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">Manager web workspace</p>
          <h1>Welcome back, {firstName}.</h1>
          <p>
            Track citizen-driven workload, planning risk, and operational activity from the
            primary desktop workspace for managers and admins.
          </p>
        </div>

        <div className="dashboard-hero-meta" aria-label="Dashboard status">
          <div className="dashboard-hero-chip" role="status" aria-live="polite">
            <Activity size={15} aria-hidden="true" />
            <span>{syncStateLabel}: {syncStateDescription}</span>
          </div>
          <div className="dashboard-hero-chip">
            <Clock3 size={15} aria-hidden="true" />
            <span>Last sync {lastSync}</span>
          </div>
          <div className="dashboard-hero-chip">
            <CircleDashed size={15} aria-hidden="true" />
            <span>{deferredRecentTickets.length} recent updates loaded</span>
          </div>
        </div>
      </header>

      {dashboardQuery.isLoading && (
        <section className="dashboard-loading-state" role="status">
          Loading live metrics...
        </section>
      )}

      {dashboardQuery.isError && (
        <section className="dashboard-error-state" role="alert">
          Dashboard metrics are temporarily unavailable: {dashboardErrorMessage}
        </section>
      )}

      <section className="dashboard-kpi-grid" aria-label="Key metrics">
        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">
            <ClipboardList size={16} />
          </span>
          <p className="dashboard-kpi-label">Total tickets</p>
          <p className="dashboard-kpi-value">
            {COUNT_FORMATTER.format(summary.total)}
          </p>
        </article>

        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">
            <CircleDashed size={16} />
          </span>
          <p className="dashboard-kpi-label">Open queue</p>
          <p className="dashboard-kpi-value">
            {COUNT_FORMATTER.format(summary.open)}
          </p>
        </article>

        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">
            <CheckCircle2 size={16} />
          </span>
          <p className="dashboard-kpi-label">Completed</p>
          <p className="dashboard-kpi-value">
            {COUNT_FORMATTER.format(summary.completed)}
          </p>
        </article>

        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">
            <Building2 size={16} />
          </span>
          <p className="dashboard-kpi-label">Assignment coverage</p>
          <p className="dashboard-kpi-value">{summary.assignmentRate}%</p>
          <p className="dashboard-kpi-footnote">
            Completion rate {summary.completionRate}%
          </p>
        </article>
      </section>

      {canAccessManager && (
        <section className="dashboard-grid">
          <Suspense fallback={<PanelFallback title="EcoTrack KPIs" />}>
            <PlanningSummaryPanel ecoKpis={planningDashboard.ecoKpis} />
          </Suspense>
          <Suspense fallback={<PanelFallback title="Overflow heatmap" />}>
            <ManagerHeatmapPanel enabled={canAccessManager} />
          </Suspense>
        </section>
      )}

      <section className="dashboard-grid">
        <Suspense fallback={<PanelFallback title="7-day activity" />}>
          <ActivityPanel recentActivity={recentActivity} peakActivity={peakActivity} />
        </Suspense>
        <Suspense fallback={<PanelFallback title="Status distribution" />}>
          <StatusPanel statusBreakdown={statusBreakdown} total={summary.total} />
        </Suspense>
      </section>

      <section className="dashboard-grid">
        {canAccessAdmin ? (
          <Suspense fallback={<PanelFallback title="Admin center" />}>
            <AdminCenterPanel />
          </Suspense>
        ) : null}
        <Suspense fallback={<PanelFallback title="Recent ticket activity" />}>
          <RecentTicketsPanel recentTickets={deferredRecentTickets} />
        </Suspense>
      </section>
    </section>
  );
}
