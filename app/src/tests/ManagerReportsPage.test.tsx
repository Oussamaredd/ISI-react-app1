import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useGenerateManagerReport,
  usePlanningReportHistory,
  useRegenerateManagerReport,
} from "../hooks/usePlanning";
import ManagerReportsPage from "../pages/ManagerReportsPage";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/usePlanning", () => ({
  useGenerateManagerReport: vi.fn(),
  usePlanningReportHistory: vi.fn(),
  useRegenerateManagerReport: vi.fn(),
}));

describe("ManagerReportsPage", () => {
  const generateMutateAsync = vi.fn();
  const regenerateMutateAsync = vi.fn();
  const refetchMock = vi.fn();

  const reports = [
    {
      id: "615b7ec9-5c15-4bc7-8ea2-4df09764e5e8",
      periodStart: "2026-02-01T00:00:00.000Z",
      periodEnd: "2026-02-28T23:59:59.000Z",
      selectedKpis: ["tours", "collections"],
      createdAt: "2026-03-01T08:00:00.000Z",
      sendEmail: false,
      emailTo: null,
      format: "pdf",
      status: "generated",
    },
    {
      id: "a0d6f033-1ba4-4c42-8b3f-c44ba1e03a6f",
      periodStart: "2026-01-01T00:00:00.000Z",
      periodEnd: "2026-01-31T23:59:59.000Z",
      selectedKpis: ["anomalies"],
      createdAt: "2026-02-02T10:00:00.000Z",
      sendEmail: true,
      emailTo: "ops@example.com",
      format: "csv",
      status: "email_delivery_failed",
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-02T12:00:00.000Z"));
    vi.clearAllMocks();

    vi.mocked(useGenerateManagerReport).mockReturnValue({
      mutateAsync: generateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateManagerReport>);

    vi.mocked(usePlanningReportHistory).mockReturnValue({
      data: { reports },
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof usePlanningReportHistory>);

    vi.mocked(useRegenerateManagerReport).mockReturnValue({
      mutateAsync: regenerateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRegenerateManagerReport>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses previous-month defaults and supports the manager generate/regenerate workflow", async () => {
    generateMutateAsync.mockResolvedValueOnce({
      id: "new-report",
      status: "email_delivered",
      format: "pdf",
    });
    regenerateMutateAsync.mockResolvedValueOnce({
      id: "regen-report",
      status: "generated",
      format: "pdf",
    });

    renderWithProviders(<ManagerReportsPage />, {
      route: "/app/manager/reports",
      withAuthProvider: false,
    });

    expect(screen.getByText(/Window: Feb 1, 2026 to Feb 28, 2026 \(28 days\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Send report by email/i));
    fireEvent.change(screen.getByLabelText(/Recipient email/i), {
      target: { value: "OPS@EXAMPLE.COM" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Generate PDF Report/i }));

    await waitFor(() => {
      expect(generateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          periodStart: new Date(2026, 1, 1, 0, 0, 0, 0).toISOString(),
          periodEnd: new Date(2026, 1, 28, 23, 59, 59, 999).toISOString(),
          selectedKpis: ["tours", "collections", "anomalies"],
          sendEmail: true,
          emailTo: "ops@example.com",
          format: "pdf",
        }),
      );
    });

    expect(
      await screen.findByText(/written to the development outbox for ops@example.com/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Regenerate/i })[0]);

    await waitFor(() => {
      expect(regenerateMutateAsync).toHaveBeenCalledWith("615b7ec9-5c15-4bc7-8ea2-4df09764e5e8");
    });
  });

  it("shows inline validation when email delivery is enabled without a valid recipient", () => {
    renderWithProviders(<ManagerReportsPage />, {
      route: "/app/manager/reports",
      withAuthProvider: false,
    });

    fireEvent.click(screen.getByLabelText(/Send report by email/i));
    fireEvent.change(screen.getByLabelText(/Recipient email/i), {
      target: { value: "not-an-email" },
    });

    expect(screen.getByText(/Enter a valid email address\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate PDF Report/i })).toBeDisabled();
  });

  it("filters history to exports that need attention", () => {
    renderWithProviders(<ManagerReportsPage />, {
      route: "/app/manager/reports",
      withAuthProvider: false,
    });

    fireEvent.click(screen.getByRole("button", { name: /Needs attention/i }));

    expect(screen.getByText(/Delivery target: ops@example.com/i)).toBeInTheDocument();
    expect(screen.queryByText(/Delivery target: direct download only/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download CSV/i })).toBeInTheDocument();
  });

  it("surfaces history errors with a retry action", () => {
    vi.mocked(usePlanningReportHistory).mockReturnValue({
      data: { reports: [] },
      isLoading: false,
      isError: true,
      error: new Error("backend unavailable"),
      refetch: refetchMock,
    } as unknown as ReturnType<typeof usePlanningReportHistory>);

    renderWithProviders(<ManagerReportsPage />, {
      route: "/app/manager/reports",
      withAuthProvider: false,
    });

    expect(screen.getByText(/Unable to load report history: backend unavailable/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});
