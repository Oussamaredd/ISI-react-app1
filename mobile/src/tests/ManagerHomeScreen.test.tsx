import { screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ManagerHomeScreen } from "@/features/manager/ManagerHomeScreen";
import { planningApi } from "@api/modules/planning";
import { useSession } from "@/providers/SessionProvider";
import { downloadAndShareManagerReport } from "@/device/reportExports";
import { mobileFireEvent, renderMobileScreen, renderMobileScreenAsync } from "./test-utils";

vi.mock("@api/modules/planning", () => ({
  planningApi: {
    generateReport: vi.fn(),
    getDashboard: vi.fn(),
    getReportHistory: vi.fn(),
    regenerateReport: vi.fn(),
  },
}));

vi.mock("@/providers/SessionProvider", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/device/reportExports", () => ({
  downloadAndShareManagerReport: vi.fn(),
}));

describe("ManagerHomeScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      signOut: vi.fn(),
      user: {
        id: "manager-1",
        email: "manager@example.com",
        displayName: "Manager",
        role: "manager",
        roles: [],
      },
    } as never);
  });

  it("shows the manager loading state while the dashboard is still resolving", async () => {
    vi.mocked(planningApi.getDashboard).mockReturnValue(new Promise(() => undefined) as never);
    vi.mocked(planningApi.getReportHistory).mockReturnValue(new Promise(() => undefined) as never);

    await renderMobileScreenAsync(<ManagerHomeScreen />);

    expect(screen.getByText(/Loading manager dashboard/i)).toBeTruthy();
    expect(screen.getByText(/operational planning overview/i)).toBeTruthy();
  });

  it("generates reports, exposes status messaging, and downloads history artifacts", async () => {
    vi.mocked(planningApi.getDashboard).mockResolvedValue({
      ecoKpis: {
        containers: 24,
        zones: 5,
        tours: 7,
      },
      thresholds: {
        criticalFillPercent: 82,
      },
    } as never);
    vi.mocked(planningApi.getReportHistory).mockResolvedValue({
      reports: [
        {
          id: "report-1",
          periodStart: "2026-02-01T00:00:00.000Z",
          periodEnd: "2026-02-28T23:59:59.000Z",
          selectedKpis: ["tours", "collections"],
          createdAt: "2026-03-01T08:00:00.000Z",
          sendEmail: true,
          emailTo: "ops@example.com",
          format: "pdf",
          status: "generated",
        },
      ],
    } as never);
    vi.mocked(planningApi.generateReport).mockResolvedValue({
      status: "email_delivered",
      deliveryError: null,
    } as never);
    vi.mocked(downloadAndShareManagerReport).mockResolvedValue({
      fileName: "ops-report.pdf",
      transport: "share-sheet",
    } as never);

    renderMobileScreen(<ManagerHomeScreen />);

    expect(await screen.findByText("24")).toBeTruthy();
    await mobileFireEvent.click(screen.getByRole("checkbox"));
    await mobileFireEvent.change(screen.getByLabelText(/Recipient email/i), {
      target: {
        value: "ops@example.com",
      },
    });
    await mobileFireEvent.click(screen.getByRole("button", { name: /Generate report/i }));

    await waitFor(() => {
      expect(planningApi.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          sendEmail: true,
          emailTo: "ops@example.com",
          format: "pdf",
        }),
      );
    });

    expect(await screen.findByText(/queued for ops@example.com/i)).toBeTruthy();

    await mobileFireEvent.click(screen.getByRole("button", { name: /Download/i }));

    await waitFor(() => {
      expect(downloadAndShareManagerReport).toHaveBeenCalledWith("report-1", "pdf");
    });

    expect(await screen.findByText(/ops-report.pdf is ready to share/i)).toBeTruthy();
  });
});
