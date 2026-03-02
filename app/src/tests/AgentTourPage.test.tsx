import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import AgentTourPage from "../pages/AgentTourPage";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/useAgentTours", () => ({
  useAgentTour: vi.fn(),
  useAnomalyTypes: vi.fn(),
  useReportAnomaly: vi.fn(),
  useStartAgentTour: vi.fn(),
  useTourActivity: vi.fn(),
  useValidateTourStop: vi.fn(),
}));

describe("AgentTourPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const agentHooks = await import("../hooks/useAgentTours");
    (agentHooks.useAnomalyTypes as Mock).mockReturnValue({ data: { anomalyTypes: [] } });
    (agentHooks.useReportAnomaly as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    (agentHooks.useStartAgentTour as Mock).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    (agentHooks.useTourActivity as Mock).mockReturnValue({
      data: { activity: [] },
      refetch: vi.fn(),
      isFetching: false,
    });
    (agentHooks.useValidateTourStop as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("shows a clear retry state when the assigned tour query fails", async () => {
    const agentHooks = await import("../hooks/useAgentTours");
    const refetch = vi.fn().mockResolvedValue({ error: null });

    (agentHooks.useAgentTour as Mock).mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("Network unavailable."),
      refetch,
      isFetching: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    expect(screen.getByRole("heading", { name: /Daily Agent Tour/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Network unavailable/i);

    await user.click(screen.getByRole("button", { name: /Retry/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("submits validation with manual fallback and captured device coordinates", async () => {
    const agentHooks = await import("../hooks/useAgentTours");
    const validateStop = vi.fn().mockResolvedValue({ nextStopId: null });
    const geolocationMock = vi.fn((success: PositionCallback) =>
      success({
        coords: {
          latitude: 48.857245,
          longitude: 2.353865,
        },
      } as GeolocationPosition),
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: geolocationMock,
      },
    });

    (agentHooks.useAgentTour as Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: "tour-1",
        name: "Morning Tour",
        status: "planned",
        zoneName: "Downtown",
        scheduledFor: "2026-03-02T09:00:00.000Z",
        routeSummary: {
          totalStops: 1,
          completedStops: 0,
          remainingStops: 1,
          completionPercent: 0,
          totalDistanceKm: 1.2,
          estimatedDurationMinutes: 8,
          isOverdue: false,
        },
        stops: [
          {
            id: "stop-1",
            stopOrder: 1,
            status: "active",
            eta: "2026-03-02T09:05:00.000Z",
            containerId: "container-1",
            containerCode: "CTR-001",
            containerLabel: "Main Square",
            latitude: "48.8566",
            longitude: "2.3522",
          },
        ],
      },
      refetch: vi.fn().mockResolvedValue({ error: null }),
      isFetching: false,
    });
    (agentHooks.useValidateTourStop as Mock).mockReturnValue({
      mutateAsync: validateStop,
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    expect(screen.getByTitle(/OpenStreetMap tour overview/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Volume \(liters\)/i), "145");
    expect(screen.queryByLabelText(/QR code/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByLabelText(/Confirm the expected stop container \(CTR-001\) manually/i),
    );
    await user.click(screen.getByRole("button", { name: /Capture Device Location/i }));
    await user.click(screen.getByRole("button", { name: /Validate Stop/i }));

    await waitFor(() => {
      expect(validateStop).toHaveBeenCalledWith(
        expect.objectContaining({
          tourId: "tour-1",
          stopId: "stop-1",
          volumeLiters: 145,
          containerId: "container-1",
          latitude: "48.857245",
          longitude: "2.353865",
        }),
      );
    });
    expect(geolocationMock).toHaveBeenCalledTimes(1);
  });
});
