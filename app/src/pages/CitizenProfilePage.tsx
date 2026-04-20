import { useState } from "react";
import { useCitizenHistory, useCitizenProfile } from "../hooks/useCitizen";
import "../styles/OperationsPages.css";

export default function CitizenProfilePage() {
  const [page, setPage] = useState(1);
  const profileQuery = useCitizenProfile();
  const historyQuery = useCitizenHistory(page, 8);

  const profile = (profileQuery.data ?? {}) as {
    gamification?: {
      points?: number;
      level?: number;
      badges?: string[];
      leaderboardPosition?: number;
    };
    impact?: {
      reportsSubmitted?: number;
      reportsResolved?: number;
      estimatedWasteDivertedKg?: number;
      estimatedCo2SavedKg?: number;
    };
  };

  const historyPayload = (historyQuery.data ?? {}) as {
    history?: Array<{
      id: string;
      containerCode?: string | null;
      containerLabel?: string | null;
      description?: string;
      reportType?: string | null;
      photoUrl?: string | null;
      status?: string;
      latitude?: string | null;
      longitude?: string | null;
      reportedAt?: string;
    }>;
    pagination?: {
      hasNext?: boolean;
    };
  };

  const history = Array.isArray(historyPayload.history) ? historyPayload.history : [];
  const reportsSubmitted = profile.impact?.reportsSubmitted ?? 0;
  const reportsResolved = profile.impact?.reportsResolved ?? 0;
  const reportsAwaiting = Math.max(0, reportsSubmitted - reportsResolved);

  if (profileQuery.isLoading || historyQuery.isLoading) {
    return (
      <section className="ops-page">
        <p className="ops-status ops-status-success">Loading profile data...</p>
      </section>
    );
  }

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Citizen Impact and Follow-up</h1>
        <p>
          This is the current citizen follow-up surface on web: report status,
          resolved totals, prototype impact estimates, and community participation in one place.
        </p>
      </header>

      <div className="ops-grid ops-grid-4">
        <MetricCard label="Reports Submitted" value={reportsSubmitted} />
        <MetricCard label="Awaiting Follow-up" value={reportsAwaiting} />
        <MetricCard label="Resolved Reports" value={reportsResolved} />
        <MetricCard label="Citizen Points" value={profile.gamification?.points ?? 0} />
      </div>

      <div className="ops-grid ops-grid-2">
        <article className="ops-card">
          <h2>Badges and Community Progress</h2>
          <div className="ops-list ops-mt-sm">
            <div className="ops-list-item">
              <p className="ops-list-meta">Level</p>
              <p>{profile.gamification?.level ?? 1}</p>
            </div>
            <div className="ops-list-item">
              <p className="ops-list-meta">Leaderboard</p>
              <p>#{profile.gamification?.leaderboardPosition ?? '-'}</p>
            </div>
          </div>
          <div className="ops-actions ops-mt-sm">
            {(profile.gamification?.badges ?? []).length === 0 ? (
              <span className="ops-empty">No badges yet.</span>
            ) : (
              (profile.gamification?.badges ?? []).map((badge) => (
                <span key={badge} className="ops-chip ops-chip-success">
                  {badge}
                </span>
              ))
            )}
          </div>
        </article>

        <article className="ops-card">
          <h2>Prototype Impact Visibility</h2>
          <div className="ops-list ops-mt-sm">
            <div className="ops-list-item">
              <p className="ops-list-meta">Resolved Reports</p>
              <p>{reportsResolved}</p>
            </div>
            <div className="ops-list-item">
              <p className="ops-list-meta">Estimated Waste Diverted</p>
              <p>{profile.impact?.estimatedWasteDivertedKg ?? 0} kg</p>
            </div>
            <div className="ops-list-item">
              <p className="ops-list-meta">Estimated CO2 Saved</p>
              <p>{profile.impact?.estimatedCo2SavedKg ?? 0} kg</p>
            </div>
          </div>
          <p className="ops-helper">
            These impact figures are prototype estimates from the current seeded rules. The most
            truthful operational follow-up today is still each report status plus the resolved-report total.
          </p>
        </article>
      </div>

      <article className="ops-card">
        <h2>Report Follow-up Timeline</h2>
        <p className="ops-helper">
          EcoTrack does not yet expose direct route or tour linkage to citizens here. Use the status
          trail below as the current follow-up view.
        </p>
        <ul className="ops-list ops-mt-sm">
          {history.length === 0 ? (
            <li className="ops-empty">No reports submitted yet. Start from Citizen Reporting to create your first signal.</li>
          ) : (
            history.map((item) => (
              <li key={item.id} className="ops-list-item">
                <p className="ops-list-meta">
                  {formatContainerReference(item.containerCode, item.containerLabel)}
                </p>
                <p className="ops-list-meta">
                  Issue: {formatReportType(item.reportType)}
                </p>
                <p>{item.description ?? "No description"}</p>
                <p className="ops-list-meta">
                  Status: {formatReportStatus(item.status)} -{" "}
                  {item.reportedAt ? new Date(item.reportedAt).toLocaleString() : "N/A"}
                </p>
                <p className="ops-list-meta">{describeReportStatus(item.status)}</p>
                {item.photoUrl ? (
                  <p className="ops-list-meta">
                    <a href={item.photoUrl} target="_blank" rel="noreferrer">
                      View photo evidence
                    </a>
                  </p>
                ) : null}
                {item.latitude || item.longitude ? (
                  <p className="ops-list-meta">
                    Location: {formatReportedLocation(item.latitude, item.longitude)}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>

        <div className="ops-actions ops-mt-md">
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            disabled={!historyPayload.pagination?.hasNext}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </article>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="ops-kpi-card">
      <p className="ops-kpi-label">{label}</p>
      <p className="ops-kpi-value">{value}</p>
    </article>
  );
}

function formatReportStatus(status?: string | null) {
  const normalized = status?.trim().toLowerCase() ?? 'submitted';

  switch (normalized) {
    case 'resolved':
      return 'Resolved';
    case 'submitted':
      return 'Report received';
    default:
      return normalized
        .split('_')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
  }
}

function describeReportStatus(status?: string | null) {
  const normalized = status?.trim().toLowerCase() ?? 'submitted';

  if (normalized === 'resolved') {
    return 'Operations marked this report as resolved.';
  }

  if (normalized === 'submitted') {
    return 'The report has been received and is waiting for operational follow-up.';
  }

  return 'This report is still progressing through the current prototype workflow.';
}

function formatReportType(reportType?: string | null) {
  const normalized = reportType?.trim().toLowerCase() ?? 'general_issue';

  switch (normalized) {
    case 'container_full':
      return 'Container full';
    case 'damaged_container':
      return 'Damaged container';
    case 'access_blocked':
      return 'Access blocked';
    default:
      return 'General issue';
  }
}

function formatContainerReference(containerCode?: string | null, containerLabel?: string | null) {
  const parts = [containerCode, containerLabel].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(" - ") : "Container reference unavailable";
}

function formatReportedLocation(latitude?: string | null, longitude?: string | null) {
  const parts = [latitude, longitude].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(", ") : "Location unavailable";
}
