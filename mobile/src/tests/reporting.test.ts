import { describe, expect, it } from "vitest";

import {
  createDatePresetRange,
  formatDateInputValue,
  getManagerReportStatus,
  getManagerReportStatusLabel,
  parseDateInputValue,
  toPeriodBoundaryIso,
  validateManagerReportForm
} from "../features/manager/reporting";

describe("manager reporting helpers", () => {
  it("formats and parses YYYY-MM-DD values", () => {
    const value = formatDateInputValue(new Date(2026, 2, 11));

    expect(value).toBe("2026-03-11");
    expect(parseDateInputValue(value)).toEqual(new Date(2026, 2, 11));
    expect(parseDateInputValue("2026-02-31")).toBeNull();
  });

  it("builds stable preset ranges from a reference date", () => {
    const referenceDate = new Date(2026, 2, 11);

    expect(createDatePresetRange("previousMonth", referenceDate)).toEqual({
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28"
    });
    expect(createDatePresetRange("monthToDate", referenceDate)).toEqual({
      periodStart: "2026-03-01",
      periodEnd: "2026-03-11"
    });
    expect(createDatePresetRange("last30Days", referenceDate)).toEqual({
      periodStart: "2026-02-10",
      periodEnd: "2026-03-11"
    });
  });

  it("converts report boundaries into a full-day ISO window", () => {
    const periodStart = toPeriodBoundaryIso("2026-03-11", "start");
    const periodEnd = toPeriodBoundaryIso("2026-03-11", "end");

    expect(periodStart).not.toBeNull();
    expect(periodEnd).not.toBeNull();
    expect(new Date(periodEnd!).getTime() - new Date(periodStart!).getTime()).toBe(
      86_399_999
    );
  });

  it("validates manager report inputs", () => {
    expect(
      validateManagerReportForm({
        periodStart: "2026-03-15",
        periodEnd: "2026-03-10",
        selectedKpis: [],
        sendEmail: true,
        emailTo: "invalid-email"
      })
    ).toEqual({
      periodEnd: "Period end must be on or after period start.",
      selectedKpis: "Select at least one KPI to include in the export.",
      emailTo: "Enter a valid email address."
    });
  });

  it("normalizes report delivery statuses for UI labels", () => {
    expect(getManagerReportStatus("email_delivered")).toBe("email_delivered");
    expect(getManagerReportStatus("unknown")).toBe("generated");
    expect(getManagerReportStatusLabel("email_delivery_failed")).toBe(
      "Needs attention"
    );
  });
});
