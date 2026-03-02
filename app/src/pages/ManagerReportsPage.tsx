import { useDeferredValue, useMemo, useState } from "react";

import {
  useGenerateManagerReport,
  usePlanningReportHistory,
  useRegenerateManagerReport,
} from "../hooks/usePlanning";
import { buildApiUrl, createApiHeaders, createApiRequestError } from "../services/api";
import "../styles/OperationsPages.css";

const KPI_OPTIONS = ["tours", "collections", "anomalies"] as const;
const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
] as const;
const DATE_PRESETS = [
  { id: "previousMonth", label: "Previous month" },
  { id: "monthToDate", label: "Month to date" },
  { id: "last30Days", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
] as const;
const HISTORY_FILTERS = [
  { id: "all", label: "All exports" },
  { id: "emailOnly", label: "Email delivery" },
  { id: "attention", label: "Needs attention" },
] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const DISPLAY_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ReportFormat = (typeof FORMAT_OPTIONS)[number]["value"];
type DatePresetId = (typeof DATE_PRESETS)[number]["id"];
type HistoryFilterId = (typeof HISTORY_FILTERS)[number]["id"];
type StatusTone = "success" | "error" | "info";
type ReportStatus = "generated" | "email_delivered" | "email_delivery_failed";
type FormErrors = Partial<Record<"periodStart" | "periodEnd" | "selectedKpis" | "emailTo", string>>;

type ReportRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  selectedKpis: string[];
  createdAt: string;
  sendEmail: boolean;
  emailTo?: string | null;
  format?: string | null;
  status?: string | null;
};

type ReportMutationResult = {
  id: string;
  format?: string | null;
  status?: string | null;
  deliveryError?: string | null;
};

type DateRange = {
  periodStart: string;
  periodEnd: string;
};

const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const toPeriodBoundaryIso = (value: string, boundary: "start" | "end") => {
  const parsed = parseDateInputValue(value);
  if (!parsed) {
    return null;
  }

  if (boundary === "start") {
    parsed.setHours(0, 0, 0, 0);
  } else {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed.toISOString();
};

const createDatePresetRange = (preset: Exclude<DatePresetId, "custom">): DateRange => {
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (preset === "monthToDate") {
    return {
      periodStart: formatDateInputValue(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)),
      periodEnd: formatDateInputValue(todayDate),
    };
  }

  if (preset === "last30Days") {
    const start = new Date(todayDate);
    start.setDate(start.getDate() - 29);

    return {
      periodStart: formatDateInputValue(start),
      periodEnd: formatDateInputValue(todayDate),
    };
  }

  const previousMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
  const previousMonthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);

  return {
    periodStart: formatDateInputValue(previousMonthStart),
    periodEnd: formatDateInputValue(previousMonthEnd),
  };
};

const resolveDownloadFileName = (response: Response, reportId: string, format: ReportFormat) => {
  const contentDisposition = response.headers.get("content-disposition");
  const encodedFileNameMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
  const rawFileName = encodedFileNameMatch?.[1] ?? fileNameMatch?.[1];

  if (!rawFileName) {
    return `planning-report-${reportId}.${format}`;
  }

  try {
    return decodeURIComponent(rawFileName);
  } catch {
    return rawFileName;
  }
};

const formatDisplayDate = (value: string | Date) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return DISPLAY_DATE_FORMATTER.format(parsed);
};

const formatDisplayDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return DISPLAY_DATE_TIME_FORMATTER.format(parsed);
};

const formatReportStatus = (rawStatus?: string | null): ReportStatus => {
  if (rawStatus === "email_delivered" || rawStatus === "email_delivery_failed") {
    return rawStatus;
  }

  return "generated";
};

const getStatusLabel = (status: ReportStatus) => {
  if (status === "email_delivered") {
    return "Email delivered";
  }

  if (status === "email_delivery_failed") {
    return "Needs attention";
  }

  return "Ready to download";
};

const getStatusChipClassName = (status: ReportStatus) => {
  if (status === "email_delivered") {
    return "ops-chip ops-chip-success";
  }

  if (status === "email_delivery_failed") {
    return "ops-chip ops-chip-danger";
  }

  return "ops-chip ops-chip-info";
};

const getFormatLabel = (rawFormat?: string | null) => {
  if (rawFormat?.trim().toLowerCase() === "csv") {
    return "CSV";
  }

  return "PDF";
};

const getFieldErrorSummary = (errors: FormErrors) => {
  if (errors.periodStart) {
    return errors.periodStart;
  }

  if (errors.periodEnd) {
    return errors.periodEnd;
  }

  if (errors.selectedKpis) {
    return errors.selectedKpis;
  }

  if (errors.emailTo) {
    return errors.emailTo;
  }

  return "Review the report settings before continuing.";
};

const getDeliveryMessage = (result: ReportMutationResult, format: ReportFormat, emailTo: string) => {
  const status = formatReportStatus(result.status);
  if (status === "email_delivered") {
    return {
      message: `${format.toUpperCase()} report generated and written to the development outbox for ${emailTo}.`,
      tone: "success" as const,
    };
  }

  if (status === "email_delivery_failed") {
    return {
      message:
        result.deliveryError?.trim() ||
        "Report generated, but email delivery failed. You can still download the export from report history.",
      tone: "info" as const,
    };
  }

  return {
    message: `${format.toUpperCase()} report generated successfully.`,
    tone: "success" as const,
  };
};

export default function ManagerReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => createDatePresetRange("previousMonth"));
  const [selectedPreset, setSelectedPreset] = useState<DatePresetId>("previousMonth");
  const [selectedKpis, setSelectedKpis] = useState<string[]>([...KPI_OPTIONS]);
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterId>("all");
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [activeRegenerateId, setActiveRegenerateId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("success");

  const deferredHistorySearch = useDeferredValue(historySearch.trim().toLowerCase());

  const generateMutation = useGenerateManagerReport();
  const regenerateMutation = useRegenerateManagerReport();
  const historyQuery = usePlanningReportHistory();

  const reportHistory = (((historyQuery.data as { reports?: ReportRow[] } | undefined)?.reports ??
    []) as ReportRow[]);

  const formErrors = useMemo(() => {
    const errors: FormErrors = {};
    const startDate = parseDateInputValue(dateRange.periodStart);
    const endDate = parseDateInputValue(dateRange.periodEnd);

    if (!dateRange.periodStart) {
      errors.periodStart = "Choose a report start date.";
    } else if (!startDate) {
      errors.periodStart = "Enter a valid start date.";
    }

    if (!dateRange.periodEnd) {
      errors.periodEnd = "Choose a report end date.";
    } else if (!endDate) {
      errors.periodEnd = "Enter a valid end date.";
    }

    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      errors.periodEnd = "Period end must be on or after period start.";
    }

    if (selectedKpis.length === 0) {
      errors.selectedKpis = "Select at least one KPI to include in the export.";
    }

    if (sendEmail) {
      const normalizedEmail = emailTo.trim().toLowerCase();
      if (!normalizedEmail) {
        errors.emailTo = "Enter a recipient email address.";
      } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
        errors.emailTo = "Enter a valid email address.";
      }
    }

    return errors;
  }, [dateRange.periodEnd, dateRange.periodStart, emailTo, selectedKpis, sendEmail]);

  const canSubmit = Object.keys(formErrors).length === 0;

  const reportingWindowSummary = useMemo(() => {
    const startDate = parseDateInputValue(dateRange.periodStart);
    const endDate = parseDateInputValue(dateRange.periodEnd);
    if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
      return "Choose a valid reporting window.";
    }

    const diffDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    return `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)} (${diffDays} day${
      diffDays === 1 ? "" : "s"
    })`;
  }, [dateRange.periodEnd, dateRange.periodStart]);

  const filteredHistory = useMemo(() => {
    return reportHistory.filter((report) => {
      const status = formatReportStatus(report.status);

      if (historyFilter === "emailOnly" && !report.sendEmail) {
        return false;
      }

      if (historyFilter === "attention" && status !== "email_delivery_failed") {
        return false;
      }

      if (!deferredHistorySearch) {
        return true;
      }

      const searchHaystack = [
        formatDisplayDate(report.periodStart),
        formatDisplayDate(report.periodEnd),
        formatDisplayDateTime(report.createdAt),
        report.selectedKpis.join(" "),
        report.emailTo ?? "",
        getStatusLabel(status),
        getFormatLabel(report.format),
      ]
        .join(" ")
        .toLowerCase();

      return searchHaystack.includes(deferredHistorySearch);
    });
  }, [deferredHistorySearch, historyFilter, reportHistory]);

  const toggleKpi = (kpi: string) => {
    setSelectedKpis((current) =>
      current.includes(kpi) ? current.filter((item) => item !== kpi) : [...current, kpi],
    );
  };

  const applyDatePreset = (presetId: DatePresetId) => {
    setSelectedPreset(presetId);

    if (presetId === "custom") {
      return;
    }

    setDateRange(createDatePresetRange(presetId));
  };

  const handlePeriodStartChange = (value: string) => {
    setSelectedPreset("custom");
    setDateRange((current) => ({
      ...current,
      periodStart: value,
    }));
  };

  const handlePeriodEndChange = (value: string) => {
    setSelectedPreset("custom");
    setDateRange((current) => ({
      ...current,
      periodEnd: value,
    }));
  };

  const generateReport = async () => {
    if (!canSubmit) {
      setStatusTone("error");
      setStatusMessage(getFieldErrorSummary(formErrors));
      return;
    }

    const periodStart = toPeriodBoundaryIso(dateRange.periodStart, "start");
    const periodEnd = toPeriodBoundaryIso(dateRange.periodEnd, "end");

    if (!periodStart || !periodEnd) {
      setStatusTone("error");
      setStatusMessage("Choose a valid reporting window.");
      return;
    }

    setStatusMessage("");

    try {
      const result = (await generateMutation.mutateAsync({
        periodStart,
        periodEnd,
        selectedKpis,
        sendEmail,
        emailTo: sendEmail ? emailTo.trim().toLowerCase() : undefined,
        format: reportFormat,
      })) as ReportMutationResult;

      const nextStatus = getDeliveryMessage(result, reportFormat, emailTo.trim().toLowerCase());
      setStatusTone(nextStatus.tone);
      setStatusMessage(nextStatus.message);
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : "Failed to generate report.");
    }
  };

  const regenerateReport = async (reportId: string) => {
    setStatusMessage("");
    setActiveRegenerateId(reportId);

    try {
      const result = (await regenerateMutation.mutateAsync(reportId)) as ReportMutationResult;
      const regeneratedFormat =
        result.format?.trim().toLowerCase() === "csv" ? ("csv" as const) : ("pdf" as const);
      const nextStatus = getDeliveryMessage(
        result,
        regeneratedFormat,
        reportHistory.find((report) => report.id === reportId)?.emailTo?.trim().toLowerCase() ?? "",
      );

      setStatusTone(nextStatus.tone);
      setStatusMessage(
        nextStatus.tone === "success"
          ? `Report regenerated successfully. ${nextStatus.message}`
          : `Report regenerated, but follow-up is required. ${nextStatus.message}`,
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : "Failed to regenerate report.");
    } finally {
      setActiveRegenerateId(null);
    }
  };

  const downloadReport = async (reportId: string, format: ReportFormat) => {
    setStatusMessage("");
    setActiveDownloadId(reportId);

    try {
      const response = await fetch(buildApiUrl(`/api/planning/reports/${reportId}/download`), {
        credentials: "include",
        headers: createApiHeaders(),
      });

      if (!response.ok) {
        throw await createApiRequestError(response);
      }

      const reportBlob = await response.blob();
      const objectUrl = window.URL.createObjectURL(reportBlob);
      const downloadLink = document.createElement("a");

      downloadLink.href = objectUrl;
      downloadLink.download = resolveDownloadFileName(response, reportId, format);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(objectUrl);

      setStatusTone("success");
      setStatusMessage(`${format.toUpperCase()} download started.`);
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : "Failed to download report.");
    } finally {
      setActiveDownloadId(null);
    }
  };

  const historyErrorMessage =
    historyQuery.error instanceof Error ? historyQuery.error.message : "Failed to load report history.";

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Monthly Operational Reports</h1>
        <p>
          Generate calendar-aligned PDF or CSV exports, then review delivery status and rerun
          archived reports when operations need a refreshed snapshot.
        </p>
      </header>

      <article className="ops-card ops-form">
        <div className="ops-grid ops-grid-2">
          <div>
            <h2>Build Report</h2>
            <p className="ops-card-intro">
              Start with a preset, then fine-tune the reporting window and KPIs before exporting.
            </p>
          </div>
          <div className="ops-actions ops-actions-end">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={selectedPreset === preset.id ? "ops-btn ops-btn-muted" : "ops-btn ops-btn-outline"}
                onClick={() => applyDatePreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ops-summary-band">
          <span className="ops-chip ops-chip-info">Window: {reportingWindowSummary}</span>
          <span className="ops-chip ops-chip-info">KPIs selected: {selectedKpis.length}</span>
          <span className="ops-chip ops-chip-info">Format: {reportFormat.toUpperCase()}</span>
        </div>

        <div className="ops-grid ops-grid-2">
          <div className="ops-field">
            <label className="ops-label" htmlFor="manager-report-period-start">
              Period start
            </label>
            <input
              id="manager-report-period-start"
              type="date"
              className="ops-input"
              value={dateRange.periodStart}
              onChange={(event) => handlePeriodStartChange(event.target.value)}
              aria-invalid={Boolean(formErrors.periodStart)}
              aria-describedby="manager-report-period-start-help manager-report-period-start-error"
            />
            <p className="ops-helper" id="manager-report-period-start-help">
              Use the first day of the operational window you want summarized.
            </p>
            {formErrors.periodStart ? (
              <p className="ops-error-text" id="manager-report-period-start-error" role="alert">
                {formErrors.periodStart}
              </p>
            ) : null}
          </div>

          <div className="ops-field">
            <label className="ops-label" htmlFor="manager-report-period-end">
              Period end
            </label>
            <input
              id="manager-report-period-end"
              type="date"
              className="ops-input"
              value={dateRange.periodEnd}
              onChange={(event) => handlePeriodEndChange(event.target.value)}
              aria-invalid={Boolean(formErrors.periodEnd)}
              aria-describedby="manager-report-period-end-help manager-report-period-end-error"
            />
            <p className="ops-helper" id="manager-report-period-end-help">
              The export includes all activity up to the end of this day in your local timezone.
            </p>
            {formErrors.periodEnd ? (
              <p className="ops-error-text" id="manager-report-period-end-error" role="alert">
                {formErrors.periodEnd}
              </p>
            ) : null}
          </div>
        </div>

        <fieldset className="ops-fieldset">
          <legend className="ops-legend">KPIs</legend>
          <p className="ops-helper">
            Select the performance signals managers need for the export. At least one KPI is
            required.
          </p>
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
          {formErrors.selectedKpis ? (
            <p className="ops-error-text" id="manager-report-kpis-error" role="alert">
              {formErrors.selectedKpis}
            </p>
          ) : null}
        </fieldset>

        <div className="ops-grid ops-grid-2">
          <div className="ops-field">
            <label className="ops-label" htmlFor="manager-report-format">
              Export format
            </label>
            <select
              id="manager-report-format"
              className="ops-select"
              value={reportFormat}
              onChange={(event) => setReportFormat(event.target.value as ReportFormat)}
            >
              {FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="ops-helper">
              PDF is best for sharing. CSV is best for spreadsheet analysis and audit handoff.
            </p>
          </div>

          <div className="ops-field">
            <span className="ops-label">Delivery</span>
            <label className="ops-label" htmlFor="manager-report-email-toggle">
              <input
                id="manager-report-email-toggle"
                type="checkbox"
                checked={sendEmail}
                onChange={(event) => setSendEmail(event.target.checked)}
                className="ops-inline-check"
              />
              Send report by email
            </label>
            <p className="ops-helper">
              In development, emailed reports are written to the API outbox so delivery can be
              verified without external SMTP.
            </p>
            {sendEmail ? (
              <>
                <label className="ops-label" htmlFor="manager-report-email-to">
                  Recipient email
                </label>
                <input
                  id="manager-report-email-to"
                  type="email"
                  className="ops-input"
                  placeholder="manager@example.com"
                  value={emailTo}
                  onChange={(event) => setEmailTo(event.target.value)}
                  aria-invalid={Boolean(formErrors.emailTo)}
                  aria-describedby="manager-report-email-error"
                />
                {formErrors.emailTo ? (
                  <p className="ops-error-text" id="manager-report-email-error" role="alert">
                    {formErrors.emailTo}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-primary"
            disabled={!canSubmit || generateMutation.isPending}
            onClick={generateReport}
          >
            {generateMutation.isPending
              ? `Generating ${reportFormat.toUpperCase()}...`
              : `Generate ${reportFormat.toUpperCase()} Report`}
          </button>
        </div>
      </article>

      <article className="ops-card">
        <div className="ops-grid ops-grid-2">
          <div>
            <h2>Report History</h2>
            <p className="ops-card-intro">
              Review recent exports, delivery results, and rerun any period that needs a fresh
              artifact.
            </p>
          </div>
          <div className="ops-grid ops-grid-2">
            <div className="ops-field">
              <label className="ops-label" htmlFor="manager-report-history-search">
                Search history
              </label>
              <input
                id="manager-report-history-search"
                type="search"
                className="ops-input"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search by month, KPI, format, or recipient"
              />
            </div>
            <div className="ops-field">
              <span className="ops-label">Filter</span>
              <div className="ops-actions">
                {HISTORY_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={
                      historyFilter === filter.id ? "ops-btn ops-btn-muted" : "ops-btn ops-btn-outline"
                    }
                    onClick={() => setHistoryFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {historyQuery.isLoading ? (
          <div className="ops-loading-block" aria-busy="true">
            Loading recent exports...
          </div>
        ) : null}

        {historyQuery.isError ? (
          <div className="ops-status ops-status-error ops-mt-sm" role="alert">
            <p>Unable to load report history: {historyErrorMessage}</p>
            <div className="ops-actions ops-mt-xs">
              <button
                type="button"
                className="ops-btn ops-btn-outline"
                onClick={() => {
                  void historyQuery.refetch();
                }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {!historyQuery.isLoading && !historyQuery.isError ? (
          <ul className="ops-list ops-mt-sm">
            {filteredHistory.length === 0 ? (
              <li className="ops-empty">
                {reportHistory.length === 0
                  ? "No generated reports yet."
                  : "No reports match the current filters."}
              </li>
            ) : (
              filteredHistory.map((report) => {
                const status = formatReportStatus(report.status);
                const format = report.format?.trim().toLowerCase() === "csv" ? "csv" : "pdf";

                return (
                  <li key={report.id} className="ops-list-item">
                    <div className="ops-history-row">
                      <div>
                        <p>
                          <strong>
                            {formatDisplayDate(report.periodStart)} - {formatDisplayDate(report.periodEnd)}
                          </strong>
                        </p>
                        <p className="ops-list-meta">Created {formatDisplayDateTime(report.createdAt)}</p>
                      </div>
                      <div className="ops-actions">
                        <span className="ops-chip ops-chip-info">{getFormatLabel(report.format)}</span>
                        <span className={getStatusChipClassName(status)}>{getStatusLabel(status)}</span>
                      </div>
                    </div>

                    <p className="ops-list-meta ops-mt-xs">
                      KPIs: {report.selectedKpis.join(", ")}
                    </p>
                    <p className="ops-list-meta">
                      {report.sendEmail
                        ? `Delivery target: ${report.emailTo ?? "Not set"}`
                        : "Delivery target: direct download only"}
                    </p>

                    <div className="ops-actions ops-mt-xs">
                      <button
                        type="button"
                        className="ops-btn ops-btn-outline"
                        onClick={() => {
                          void downloadReport(report.id, format);
                        }}
                        disabled={activeDownloadId === report.id}
                      >
                        {activeDownloadId === report.id
                          ? `Downloading ${getFormatLabel(report.format)}...`
                          : `Download ${getFormatLabel(report.format)}`}
                      </button>
                      <button
                        type="button"
                        className="ops-btn ops-btn-outline"
                        onClick={() => {
                          void regenerateReport(report.id);
                        }}
                        disabled={Boolean(activeRegenerateId)}
                      >
                        {activeRegenerateId === report.id ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </article>

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "ops-status ops-status-success"
              : statusTone === "info"
                ? "ops-status ops-status-info"
                : "ops-status ops-status-error"
          }
          role="status"
          aria-live={statusTone === "error" ? "assertive" : "polite"}
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
