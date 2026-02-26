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
      description?: string;
      status?: string;
      reportedAt?: string;
    }>;
    pagination?: {
      hasNext?: boolean;
    };
  };

  const history = Array.isArray(historyPayload.history) ? historyPayload.history : [];

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
        <h1>Citizen Profile and Impact</h1>
        <p>
          Track your contribution, progress milestones, and report resolution
          history in one view.
        </p>
      </header>

      <div className="ops-grid ops-grid-4">
        <MetricCard label="Points" value={profile.gamification?.points ?? 0} />
        <MetricCard label="Level" value={profile.gamification?.level ?? 1} />
        <MetricCard
          label="Leaderboard"
          value={`#${profile.gamification?.leaderboardPosition ?? "-"}`}
        />
        <MetricCard label="Reports" value={profile.impact?.reportsSubmitted ?? 0} />
      </div>

      <div className="ops-grid ops-grid-2">
        <article className="ops-card">
          <h2>Badges</h2>
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
          <h2>Personal Impact</h2>
          <div className="ops-list ops-mt-sm">
            <div className="ops-list-item">
              <p className="ops-list-meta">Resolved Reports</p>
              <p>{profile.impact?.reportsResolved ?? 0}</p>
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
        </article>
      </div>

      <article className="ops-card">
        <h2>Report History Timeline</h2>
        <ul className="ops-list ops-mt-sm">
          {history.length === 0 ? (
            <li className="ops-empty">No reports submitted yet.</li>
          ) : (
            history.map((item) => (
              <li key={item.id} className="ops-list-item">
                <p>{item.description ?? "No description"}</p>
                <p className="ops-list-meta">
                  Status: {item.status ?? "submitted"} -{" "}
                  {item.reportedAt ? new Date(item.reportedAt).toLocaleString() : "N/A"}
                </p>
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
