export const REPORT_KPI_OPTIONS = [
  "tours",
  "collections",
  "anomalies"
] as const;

export const REPORT_FORMAT_OPTIONS = ["pdf", "csv"] as const;

export const REPORT_DATE_PRESET_OPTIONS = [
  "previousMonth",
  "monthToDate",
  "last30Days",
  "custom"
] as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ManagerReportKpi = (typeof REPORT_KPI_OPTIONS)[number];
export type ManagerReportFormat = (typeof REPORT_FORMAT_OPTIONS)[number];
export type ManagerReportDatePreset = (typeof REPORT_DATE_PRESET_OPTIONS)[number];

export type ManagerReportDateRange = {
  periodStart: string;
  periodEnd: string;
};

export type ManagerReportFormErrors = Partial<
  Record<
    "periodStart" | "periodEnd" | "selectedKpis" | "emailTo",
    string
  >
>;

export type ManagerReportStatus =
  | "generated"
  | "email_delivered"
  | "email_delivery_failed";

export const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseDateInputValue = (value: string) => {
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

export const toPeriodBoundaryIso = (
  value: string,
  boundary: "start" | "end"
) => {
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

export const createDatePresetRange = (
  preset: Exclude<ManagerReportDatePreset, "custom">,
  referenceDate = new Date()
): ManagerReportDateRange => {
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  if (preset === "monthToDate") {
    return {
      periodStart: formatDateInputValue(
        new Date(today.getFullYear(), today.getMonth(), 1)
      ),
      periodEnd: formatDateInputValue(today)
    };
  }

  if (preset === "last30Days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);

    return {
      periodStart: formatDateInputValue(start),
      periodEnd: formatDateInputValue(today)
    };
  }

  const previousMonthStart = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );
  const previousMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    0
  );

  return {
    periodStart: formatDateInputValue(previousMonthStart),
    periodEnd: formatDateInputValue(previousMonthEnd)
  };
};

export const validateManagerReportForm = (params: {
  periodStart: string;
  periodEnd: string;
  selectedKpis: string[];
  sendEmail: boolean;
  emailTo: string;
}): ManagerReportFormErrors => {
  const errors: ManagerReportFormErrors = {};
  const startDate = parseDateInputValue(params.periodStart);
  const endDate = parseDateInputValue(params.periodEnd);

  if (!params.periodStart) {
    errors.periodStart = "Choose a report start date.";
  } else if (!startDate) {
    errors.periodStart = "Enter a valid start date.";
  }

  if (!params.periodEnd) {
    errors.periodEnd = "Choose a report end date.";
  } else if (!endDate) {
    errors.periodEnd = "Enter a valid end date.";
  }

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    errors.periodEnd = "Period end must be on or after period start.";
  }

  if (params.selectedKpis.length === 0) {
    errors.selectedKpis = "Select at least one KPI to include in the export.";
  }

  if (params.sendEmail) {
    const normalizedEmail = params.emailTo.trim().toLowerCase();

    if (!normalizedEmail) {
      errors.emailTo = "Enter a recipient email address.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      errors.emailTo = "Enter a valid email address.";
    }
  }

  return errors;
};

export const getManagerReportStatus = (rawStatus?: string | null) => {
  if (
    rawStatus === "email_delivered" ||
    rawStatus === "email_delivery_failed"
  ) {
    return rawStatus;
  }

  return "generated";
};

export const getManagerReportStatusLabel = (
  status: ManagerReportStatus
) => {
  if (status === "email_delivered") {
    return "Email delivered";
  }

  if (status === "email_delivery_failed") {
    return "Needs attention";
  }

  return "Ready to download";
};
