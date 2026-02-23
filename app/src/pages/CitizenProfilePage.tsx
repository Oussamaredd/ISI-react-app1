import { useState } from 'react';

import { useCitizenHistory, useCitizenProfile } from '../hooks/useCitizen';

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

  return (
    <section className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Citizen Profile and Impact</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review your report history, leaderboard position, badges, and environmental contribution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Points" value={profile.gamification?.points ?? 0} />
        <MetricCard label="Level" value={profile.gamification?.level ?? 1} />
        <MetricCard label="Leaderboard" value={`#${profile.gamification?.leaderboardPosition ?? '-'}`} />
        <MetricCard label="Reports" value={profile.impact?.reportsSubmitted ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-medium text-gray-900">Badges</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(profile.gamification?.badges ?? []).length === 0 ? (
              <span className="text-sm text-gray-500">No badges yet</span>
            ) : (
              (profile.gamification?.badges ?? []).map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-medium"
                >
                  {badge}
                </span>
              ))
            )}
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-medium text-gray-900">Personal Impact</h2>
          <dl className="mt-3 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <dt>Resolved reports</dt>
              <dd>{profile.impact?.reportsResolved ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Estimated waste diverted</dt>
              <dd>{profile.impact?.estimatedWasteDivertedKg ?? 0} kg</dd>
            </div>
            <div className="flex justify-between">
              <dt>Estimated CO2 saved</dt>
              <dd>{profile.impact?.estimatedCo2SavedKg ?? 0} kg</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium text-gray-900">Report History Timeline</h2>
        <ul className="mt-3 space-y-3">
          {history.length === 0 ? (
            <li className="text-sm text-gray-500">No reports submitted yet.</li>
          ) : (
            history.map((item) => (
              <li key={item.id} className="border border-gray-100 rounded-md p-3">
                <p className="text-sm text-gray-900">{item.description ?? 'No description'}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Status: {item.status ?? 'submitted'} - {item.reportedAt ? new Date(item.reportedAt).toLocaleString() : 'N/A'}
                </p>
              </li>
            ))
          )}
        </ul>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
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
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </article>
  );
}
