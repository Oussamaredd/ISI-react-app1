import { screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportScreen } from "@/features/reports/ReportScreen";
import { captureCurrentLocation, captureCurrentLocationIfAvailable } from "@/device/location";
import { captureCameraPhoto, resolvePhotoPreviewAspectRatio } from "@/device/media";
import { useSession } from "@/providers/SessionProvider";
import { citizenApi } from "@api/modules/citizen";
import { containersApi } from "@api/modules/containers";
import { mobileFireEvent, renderMobileScreenAsync } from "./test-utils";

vi.mock("@api/modules/citizen", () => ({
  citizenApi: {
    createReport: vi.fn(),
    getHistory: vi.fn(),
  },
}));

vi.mock("@api/modules/containers", () => ({
  containersApi: {
    list: vi.fn(),
  },
}));

vi.mock("@/providers/SessionProvider", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/device/location", () => ({
  captureCurrentLocation: vi.fn(),
  captureCurrentLocationIfAvailable: vi.fn(),
}));

vi.mock("@/device/media", () => ({
  captureCameraPhoto: vi.fn(),
  resolvePhotoPreviewAspectRatio: vi.fn(() => 1.5),
}));

describe("ReportScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as never);
    vi.mocked(containersApi.list).mockImplementation(async (params?: { search?: string }) => ({
      containers: [
        {
          id: "container-1",
          code: "CTR-100",
          label: "Riverside",
          zoneName: "North Zone",
          status: "available",
          latitude: "48.8566",
          longitude: "2.3522",
          fillLevelPercent: 72,
        },
      ].filter((container) =>
        params?.search ? container.code.toLowerCase().includes(params.search.toLowerCase()) : true,
      ),
    }) as never);
    vi.mocked(citizenApi.getHistory).mockResolvedValue({
      history: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 12,
        hasNext: false,
      },
    } as never);
    vi.mocked(captureCurrentLocation).mockResolvedValue({
      latitude: "48.8566",
      longitude: "2.3522",
    } as never);
    vi.mocked(captureCurrentLocationIfAvailable).mockResolvedValue({
      latitude: "48.8566",
      longitude: "2.3522",
    } as never);
    vi.mocked(captureCameraPhoto).mockResolvedValue(null as never);
    vi.mocked(resolvePhotoPreviewAspectRatio).mockReturnValue(1.5);
  });

  it("supports the citizen search, select, and report submission journey", async () => {
    vi.mocked(citizenApi.createReport).mockResolvedValue({
      id: "report-1",
      reportType: "container_full",
      description: "",
      confirmationState: "submitted",
      confirmationMessage: "Thanks for reporting.",
      managerNotificationQueued: true,
      citizenPushNotificationQueued: false,
      gamification: {
        pointsAwarded: 25,
        badges: [],
      },
    } as never);

    await renderMobileScreenAsync(<ReportScreen />);

    const searchInput = await screen.findByLabelText(/Search container code or label/i);

    await mobileFireEvent.change(searchInput, {
      target: {
        value: "ctr",
      },
    });

    const [resultButton] = await screen.findAllByRole("button", {
      name: /CTR-100 - Riverside/i,
    });
    await mobileFireEvent.click(resultButton);

    expect(await screen.findByText(/Selected container/i)).toBeTruthy();

    await mobileFireEvent.click(screen.getByRole("button", { name: /Report issue/i }));
    await mobileFireEvent.click(screen.getByRole("button", { name: /Send report/i }));

    await waitFor(() => {
      expect(citizenApi.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: "container-1",
          latitude: "48.8566",
          longitude: "2.3522",
          reportType: "container_full",
        }),
      );
    });

    expect(await screen.findByText(/Report sent\. History and challenge points are refreshing/i)).toBeTruthy();
    expect(await screen.findByText(/\+25 points/i)).toBeTruthy();
    expect(await screen.findByText(/Manager notified/i)).toBeTruthy();
  });
});
