import { useMemo, useState } from 'react';

import {
  useGenerateManagerReport,
  usePlanningReportHistory,
  useRegenerateManagerReport,
} from '../hooks/usePlanning';

const KPI_OPTIONS = ['tours', 'collections', 'anomalies'] as const;

type ReportRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  selectedKpis: string[];
  createdAt: string;
  sendEmail: boolean;
  emailTo?: string | null;
};

export default function ManagerReportsPage() {
  const [periodStart, setPeriodStart] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedKpis, setSelectedKpis] = useState<string[]>([...KPI_OPTIONS]);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const generateMutation = useGenerateManagerReport();
  const regenerateMutation = useRegenerateManagerReport();
  const historyQuery = usePlanningReportHistory();

  const reportHistory =
    (((historyQuery.data as { reports?: ReportRow[] } | undefined)?.reports ?? []) as ReportRow[]);

  const toggleKpi = (kpi: string) => {
    setSelectedKpis((current) =>
      current.includes(kpi) ? current.filter((item) => item !== kpi) : [...current, kpi],
    );
  };

  const canSubmit = useMemo(
    () => selectedKpis.length > 0 && periodStart.length > 0 && periodEnd.length > 0,
    [periodEnd.length, periodStart.length, selectedKpis.length],
  );

  const generateReport = async () => {
    if (!canSubmit) {
      setStatusMessage('Select period and at least one KPI before generating.');
      return;
    }

    setStatusMessage('');

    try {
      await generateMutation.mutateAsync({
        periodStart: new Date(`${periodStart}T00:00:00Z`).toISOString(),
        periodEnd: new Date(`${periodEnd}T23:59:59Z`).toISOString(),
        selectedKpis,
        sendEmail,
        emailTo: sendEmail ? emailTo : undefined,
        format: 'pdf',
      });
      setStatusMessage('Monthly report generated successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate report.');
    }
  };

  const regenerateReport = async (reportId: string) => {
    setStatusMessage('');
    try {
      await regenerateMutation.mutateAsync(reportId);
      setStatusMessage('Report regenerated successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to regenerate report.');
    }
  };

  return (
    <section className="p-4 sm:p-6 space-y-4">
      <header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Monthly Operational Reports</h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate PDF exports by period and KPI selection, send by email, and regenerate from history.
        </p>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Period start</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Period end</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700">KPIs</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {KPI_OPTIONS.map((kpi) => (
              <label key={kpi} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedKpis.includes(kpi)}
                  onChange={() => toggleKpi(kpi)}
                />
                <span>{kpi}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
            />
            <span>Send report by email</span>
          </label>

          {sendEmail && (
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="manager@example.com"
              value={emailTo}
              onChange={(event) => setEmailTo(event.target.value)}
            />
          )}
        </div>

        <button
          type="button"
          className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
          disabled={!canSubmit || generateMutation.isPending}
          onClick={generateReport}
        >
          {generateMutation.isPending ? 'Generating...' : 'Generate PDF Report'}
        </button>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Report History</h2>

        <ul className="mt-3 space-y-2">
          {reportHistory.length === 0 ? (
            <li className="text-sm text-gray-500">No generated reports yet.</li>
          ) : (
            reportHistory.map((report) => (
              <li key={report.id} className="rounded-md border border-gray-100 px-3 py-2">
                <p className="text-sm font-medium text-gray-900">
                  {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  KPIs: {report.selectedKpis.join(', ')} - Created {new Date(report.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={`/api/planning/reports/${report.id}/download`}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    Download PDF
                  </a>
                  <button
                    type="button"
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    onClick={() => regenerateReport(report.id)}
                    disabled={regenerateMutation.isPending}
                  >
                    Regenerate
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </article>

      {statusMessage && <p className="text-sm font-medium text-emerald-700">{statusMessage}</p>}
    </section>
  );
}
