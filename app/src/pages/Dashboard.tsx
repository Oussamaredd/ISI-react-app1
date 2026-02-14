import React from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock3,
} from "lucide-react";
import { useCurrentUser } from "../hooks/useAuth";
import { useDashboard, type DashboardData } from "../hooks/useTickets";

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

const formatDayLabel = (dateKey: string) => {
  const parsedDate = new Date(dateKey);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  return parsedDate.toLocaleDateString("en-US", { weekday: "short" });
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return "No timestamp";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "No timestamp";
  }

  const diffMs = Date.now() - parsedDate.getTime();
  if (diffMs < 60 * 1000) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return `${diffDays}d ago`;
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getTicketStatusClass = (status: string) => {
  const normalizedStatus = status.toLowerCase().trim();
  if (normalizedStatus === "completed" || normalizedStatus === "closed") {
    return "dashboard-ticket-status-completed";
  }
  if (normalizedStatus === "in_progress") {
    return "dashboard-ticket-status-progress";
  }
  return "dashboard-ticket-status-open";
};

export default function Dashboard() {
  const { user, isLoading: isUserLoading } = useCurrentUser();
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
        hotelName: string;
        lastUpdate: string | null;
      }>;
    }

    return dashboardData.recentTickets.slice(0, 6).map((ticket) => ({
      id: String(ticket.id ?? ""),
      name: ticket.name || "Untitled ticket",
      status: ticket.status || "open",
      hotelName: ticket.hotelName || "Unassigned",
      lastUpdate: ticket.updatedAt || ticket.createdAt || null,
    }));
  }, [dashboardData]);

  const hotelWorkload = React.useMemo(() => {
    if (!Array.isArray(dashboardData?.hotels)) {
      return [] as Array<{ id: string; name: string; ticketCount: number }>;
    }

    return dashboardData.hotels
      .map((hotel) => ({
        id: String(hotel.id ?? ""),
        name: hotel.name || "Unnamed hotel",
        ticketCount: toNumber(hotel.ticketCount),
      }))
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, 5);
  }, [dashboardData]);

  const peakActivity = recentActivity.reduce(
    (maxValue, item) => Math.max(maxValue, item.created, item.updated),
    1,
  );
  const peakHotelLoad = hotelWorkload.reduce(
    (maxValue, item) => Math.max(maxValue, item.ticketCount),
    1,
  );

  const userDisplayName =
    user?.displayName || user?.name || user?.email || "EcoTrack operator";
  const firstName = userDisplayName.split(" ")[0] || "Operator";

  const lastSync =
    dashboardQuery.dataUpdatedAt > 0
      ? new Date(dashboardQuery.dataUpdatedAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Pending";

  const dashboardErrorMessage =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : "Try again in a moment.";

  if (isUserLoading) {
    return (
      <section className="dashboard-page" aria-label="Dashboard">
        <div className="dashboard-loading-state">Loading dashboard...</div>
      </section>
    );
  }

  return (
    <section className="dashboard-page" aria-label="Dashboard">
      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">EcoTrack command center</p>
          <h1>Welcome back, {firstName}.</h1>
          <p>
            Track ticket flow, workload balance, and operational activity from
            one dashboard.
          </p>
        </div>

        <div className="dashboard-hero-meta" aria-label="Dashboard status">
          <div className="dashboard-hero-chip">
            <Clock3 size={15} aria-hidden="true" />
            <span>Last sync {lastSync}</span>
          </div>
          <div className="dashboard-hero-chip">
            <Activity size={15} aria-hidden="true" />
            <span>{recentTickets.length} recent updates loaded</span>
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

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <header className="dashboard-panel-header">
            <h2>7-day activity</h2>
            <p>Created vs updated ticket volume</p>
          </header>

          {recentActivity.length === 0 ? (
            <p className="dashboard-empty-state">
              No tracked activity in the last week.
            </p>
          ) : (
            <>
              <ul
                className="dashboard-activity-chart"
                aria-label="Ticket activity chart for the last seven days"
              >
                {recentActivity.map((item) => {
                  const createdHeight =
                    item.created > 0
                      ? Math.max(14, Math.round((item.created / peakActivity) * 100))
                      : 8;
                  const updatedHeight =
                    item.updated > 0
                      ? Math.max(14, Math.round((item.updated / peakActivity) * 100))
                      : 8;

                  return (
                    <li key={item.date} className="dashboard-activity-day">
                      <span className="dashboard-activity-label">
                        {formatDayLabel(item.date)}
                      </span>
                      <div className="dashboard-activity-bars" aria-hidden="true">
                        <span
                          className="dashboard-activity-bar dashboard-activity-bar-created"
                          style={{ height: `${createdHeight}%` }}
                        />
                        <span
                          className="dashboard-activity-bar dashboard-activity-bar-updated"
                          style={{ height: `${updatedHeight}%` }}
                        />
                      </div>
                      <span className="dashboard-activity-total">
                        {COUNT_FORMATTER.format(item.created + item.updated)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="dashboard-legend">
                <span>
                  <i className="dashboard-legend-dot dashboard-legend-created" />
                  Created
                </span>
                <span>
                  <i className="dashboard-legend-dot dashboard-legend-updated" />
                  Updated
                </span>
              </div>
            </>
          )}
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel-header">
            <h2>Status distribution</h2>
            <p>Current workload by ticket state</p>
          </header>

          {statusBreakdown.length === 0 ? (
            <p className="dashboard-empty-state">No status data available yet.</p>
          ) : (
            <ul className="dashboard-status-list">
              {statusBreakdown.map((status) => {
                const widthPercent =
                  summary.total > 0
                    ? Math.round((status.count / summary.total) * 100)
                    : 0;
                const safeWidth = status.count > 0 ? Math.max(8, widthPercent) : 0;

                return (
                  <li key={status.key} className="dashboard-status-item">
                    <div className="dashboard-status-row">
                      <span>{status.label}</span>
                      <span>{COUNT_FORMATTER.format(status.count)}</span>
                    </div>
                    <div className="dashboard-status-track" aria-hidden="true">
                      <span style={{ width: `${safeWidth}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <header className="dashboard-panel-header">
            <h2>Recent ticket activity</h2>
            <p>Latest updates in your workspace</p>
          </header>

          {recentTickets.length === 0 ? (
            <p className="dashboard-empty-state">No recent ticket updates yet.</p>
          ) : (
            <ul className="dashboard-ticket-feed">
              {recentTickets.map((ticket) => (
                <li key={ticket.id} className="dashboard-ticket-item">
                  <div className="dashboard-ticket-details">
                    <p className="dashboard-ticket-name">{ticket.name}</p>
                    <p className="dashboard-ticket-meta">
                      {ticket.hotelName} - {formatRelativeTime(ticket.lastUpdate)}
                    </p>
                  </div>
                  <span
                    className={`dashboard-ticket-status ${getTicketStatusClass(
                      ticket.status,
                    )}`}
                  >
                    {formatStatusLabel(ticket.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="dashboard-panel">
          <header className="dashboard-panel-header">
            <h2>Hotel workload</h2>
            <p>Most active properties right now</p>
          </header>

          {hotelWorkload.length === 0 ? (
            <p className="dashboard-empty-state">No hotel assignment data yet.</p>
          ) : (
            <ul className="dashboard-hotel-list">
              {hotelWorkload.map((hotel) => {
                const hotelLoadPercent = Math.max(
                  10,
                  Math.round((hotel.ticketCount / peakHotelLoad) * 100),
                );

                return (
                  <li key={hotel.id} className="dashboard-hotel-item">
                    <div className="dashboard-hotel-row">
                      <span>{hotel.name}</span>
                      <strong>{COUNT_FORMATTER.format(hotel.ticketCount)}</strong>
                    </div>
                    <div className="dashboard-hotel-track" aria-hidden="true">
                      <span style={{ width: `${hotelLoadPercent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>
    </section>
  );
}
