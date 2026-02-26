import { useMemo, useState } from "react";
import {
  useGenerateManagerReport,
  usePlanningReportHistory,
  useRegenerateManagerReport,
} from "../hooks/usePlanning";
import "../styles/OperationsPages.css";

const KPI_OPTIONS = ["tours", "collections", "anomalies"] as const;

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
  const [periodStart, setPeriodStart] = useState(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedKpis, setSelectedKpis] = useState<string[]>([...KPI_OPTIONS]);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

  const generateMutation = useGenerateManagerReport();
  const regenerateMutation = useRegenerateManagerReport();
  const historyQuery = usePlanningReportHistory();

  const reportHistory = (((historyQuery.data as { reports?: ReportRow[] } | undefined)
    ?.reports ?? []) as ReportRow[]);

  const toggleKpi = (kpi: string) => {
    setSelectedKpis((current) =>
      current.includes(kpi)
        ? current.filter((item) => item !== kpi)
        : [...current, kpi],
    );
  };

  const canSubmit = useMemo(
    () =>
      selectedKpis.length > 0 &&
      periodStart.length > 0 &&
      periodEnd.length > 0,
    [periodEnd.length, periodStart.length, selectedKpis.length],
  );

  const generateReport = async () => {
    if (!canSubmit) {
      setStatusTone("error");
      setStatusMessage("Select period and at least one KPI before generating.");
      return;
    }

    setStatusMessage("");

    try {
      await generateMutation.mutateAsync({
        periodStart: new Date(`${periodStart}T00:00:00Z`).toISOString(),
        periodEnd: new Date(`${periodEnd}T23:59:59Z`).toISOString(),
        selectedKpis,
        sendEmail,
        emailTo: sendEmail ? emailTo : undefined,
        format: "pdf",
      });
      setStatusTone("success");
      setStatusMessage("Monthly report generated successfully.");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to generate report.",
      );
    }
  };

  const regenerateReport = async (reportId: string) => {
    setStatusMessage("");
    try {
      await regenerateMutation.mutateAsync(reportId);
      setStatusTone("success");
      setStatusMessage("Report regenerated successfully.");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to regenerate report.",
      );
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Monthly Operational Reports</h1>
        <p>
          Generate PDF exports by period and KPI selection, then rerun archived
          reports as needed.
        </p>
      </header>

      <article className="ops-card ops-form">
        <div className="ops-grid ops-grid-2">
          <div className="ops-field">
            <label className="ops-label">Period start</label>
            <input
              type="date"
              className="ops-input"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
          </div>
          <div className="ops-field">
            <label className="ops-label">Period end</label>
            <input
              type="date"
              className="ops-input"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </div>
        </div>

        <div className="ops-field">
          <p className="ops-label">KPIs</p>
          <div className="ops-actions">
            {KPI_OPTIONS.map((kpi) => (
              <label key={kpi} className="ops-chip ops-chip-info">
                <input
                  type="checkbox"
                  checked={selectedKpis.includes(kpi)}
                  onChange={() => toggleKpi(kpi)}
                  className="ops-inline-check"
                />
                <span>{kpi}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="ops-field">
          <label className="ops-label">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              className="ops-inline-check"
            />
            Send report by email
          </label>

          {sendEmail ? (
            <input
              type="email"
              className="ops-input"
              placeholder="manager@example.com"
              value={emailTo}
              onChange={(event) => setEmailTo(event.target.value)}
            />
          ) : null}
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-primary"
            disabled={!canSubmit || generateMutation.isPending}
            onClick={generateReport}
          >
            {generateMutation.isPending ? "Generating..." : "Generate PDF Report"}
          </button>
        </div>
      </article>

      <article className="ops-card">
        <h2>Report History</h2>
        <ul className="ops-list ops-mt-sm">
          {reportHistory.length === 0 ? (
            <li className="ops-empty">No generated reports yet.</li>
          ) : (
            reportHistory.map((report) => (
              <li key={report.id} className="ops-list-item">
                <p>
                  <strong>
                    {new Date(report.periodStart).toLocaleDateString()} -{" "}
                    {new Date(report.periodEnd).toLocaleDateString()}
                  </strong>
                </p>
                <p className="ops-list-meta">
                  KPIs: {report.selectedKpis.join(", ")} - Created{" "}
                  {new Date(report.createdAt).toLocaleString()}
                </p>
                <div className="ops-actions ops-mt-xs">
                  <a
                    href={`/api/planning/reports/${report.id}/download`}
                    className="ops-btn ops-btn-outline"
                  >
                    Download PDF
                  </a>
                  <button
                    type="button"
                    className="ops-btn ops-btn-outline"
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

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "ops-status ops-status-success"
              : "ops-status ops-status-error"
          }
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
