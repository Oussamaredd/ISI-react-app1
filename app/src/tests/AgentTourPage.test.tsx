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

const buildTour = (overrides?: Record<string, unknown>) => ({
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
  routeGeometry: null,
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
  ...overrides,
});

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

  it("shows the unassigned empty state and refreshes the assigned tour", async () => {
    const agentHooks = await import("../hooks/useAgentTours");
    const refetch = vi.fn().mockResolvedValue({ error: null });

    (agentHooks.useAgentTour as Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
      refetch,
      isFetching: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    expect(screen.getByText(/No actionable tour is assigned/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Refresh/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
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
      data: buildTour(),
      refetch: vi.fn().mockResolvedValue({ error: null }),
      isFetching: false,
    });
    (agentHooks.useValidateTourStop as Mock).mockReturnValue({
      mutateAsync: validateStop,
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    expect(screen.getByLabelText(/Leaflet route map with road-snapped geometry/i)).toBeInTheDocument();
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

  it(
    "surfaces start, validation, and anomaly submission errors",
    { timeout: 15_000 },
    async () => {
    const agentHooks = await import("../hooks/useAgentTours");
    const startTour = vi.fn().mockRejectedValue(new Error("Dispatch service unavailable."));
    const validateStop = vi.fn().mockRejectedValue(new Error("Stop validation failed."));
    const reportAnomaly = vi.fn().mockRejectedValue(new Error("Alert queue unavailable."));

    (agentHooks.useAgentTour as Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildTour(),
      refetch: vi.fn().mockResolvedValue({ error: null }),
      isFetching: false,
    });
    (agentHooks.useStartAgentTour as Mock).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: startTour,
      isPending: false,
    });
    (agentHooks.useValidateTourStop as Mock).mockReturnValue({
      mutateAsync: validateStop,
      isPending: false,
    });
    (agentHooks.useAnomalyTypes as Mock).mockReturnValue({
      data: {
        anomalyTypes: [{ id: "blocked", label: "Blocked access" }],
      },
    });
    (agentHooks.useReportAnomaly as Mock).mockReturnValue({
      mutateAsync: reportAnomaly,
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    await user.click(screen.getByRole("button", { name: /Start Tour/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Dispatch service unavailable/i);

    await user.type(screen.getByLabelText(/Volume \(liters\)/i), "-1");
    await user.click(screen.getByRole("button", { name: /Validate Stop/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Enter a valid non-negative collection volume/i,
    );

    await user.clear(screen.getByLabelText(/Volume \(liters\)/i));
    await user.type(screen.getByLabelText(/Volume \(liters\)/i), "25");
    await user.type(screen.getByLabelText(/Notes \(optional\)/i), "Driver note");
    await user.click(screen.getByRole("button", { name: /Validate Stop/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Stop validation failed/i);

    await user.selectOptions(screen.getByLabelText(/Anomaly type/i), "blocked");
    await user.selectOptions(screen.getByLabelText(/Severity/i), "high");
    await user.type(screen.getByLabelText(/^Comments$/i), "Road blocked");
    await user.type(screen.getByLabelText(/Photo URL/i), "not-a-url");
    await user.click(screen.getByRole("button", { name: /Report Anomaly/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Photo URL must begin with http:\/\/ or https:\/\//i,
    );

    await user.clear(screen.getByLabelText(/Photo URL/i));
    await user.type(screen.getByLabelText(/Photo URL/i), "https://example.com/photo.jpg");
    await user.click(screen.getByRole("button", { name: /Report Anomaly/i }));

    await waitFor(() => {
      expect(reportAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          tourId: "tour-1",
          anomalyTypeId: "blocked",
          severity: "high",
          comments: "Road blocked",
          photoUrl: "https://example.com/photo.jpg",
        }),
      );
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/Alert queue unavailable/i);
    },
  );

  it("renders activity summaries and handles device location capture failures", async () => {
    const agentHooks = await import("../hooks/useAgentTours");
    const activityRefetch = vi.fn();
    const geolocationMock = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback) =>
        error?.({ code: 1, message: "denied" } as GeolocationPositionError),
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
      data: buildTour({
        stops: [
          {
            id: "stop-1",
            stopOrder: 1,
            status: "active",
            eta: "2026-03-02T09:05:00.000Z",
            containerId: "container-1",
            containerCode: "CTR-001",
            containerLabel: "Main Square",
            latitude: null,
            longitude: null,
          },
        ],
      }),
      refetch: vi.fn().mockResolvedValue({ error: null }),
      isFetching: false,
    });
    (agentHooks.useTourActivity as Mock).mockReturnValue({
      data: {
        activity: [
          {
            id: "activity-1",
            type: "tour_started",
            createdAt: "2026-03-02T08:55:00.000Z",
            details: {},
          },
          {
            id: "activity-2",
            type: "collection_validated",
            createdAt: "2026-03-02T09:12:00.000Z",
            details: { volumeLiters: 118 },
          },
          {
            id: "activity-3",
            type: "anomaly_reported",
            createdAt: "2026-03-02T09:14:00.000Z",
            details: { severity: "critical", comments: "Blocked access lane." },
            actorDisplayName: "Dispatch",
          },
          {
            id: "activity-4",
            type: "handoff",
            createdAt: "2026-03-02T09:20:00.000Z",
            details: null,
          },
        ],
      },
      refetch: activityRefetch,
      isFetching: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    expect(screen.getByText(/Agent marked the route as in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/118 liters recorded at the stop/i)).toBeInTheDocument();
    expect(screen.getByText(/critical severity\. Blocked access lane\./i)).toBeInTheDocument();
    expect(screen.getByText(/Operational activity recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Actor: Dispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinates: Location unavailable/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Capture Device Location/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Location capture was unavailable/i,
    );

    await user.click(screen.getByRole("button", { name: /Refresh Activity/i }));
    expect(activityRefetch).toHaveBeenCalledTimes(1);
  });

  it("offers a cache-bypass reload path for overdue cached runs", async () => {
    const agentHooks = await import("../hooks/useAgentTours");
    const refetchFromServer = vi.fn().mockResolvedValue({ error: null });

    (agentHooks.useAgentTour as Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildTour({
        status: "in_progress",
        routeSummary: {
          totalStops: 1,
          completedStops: 0,
          remainingStops: 1,
          completionPercent: 0,
          totalDistanceKm: 1.2,
          estimatedDurationMinutes: 8,
          isOverdue: true,
        },
      }),
      dataSource: "cache",
      refetch: vi.fn().mockResolvedValue({ error: null }),
      refetchFromServer,
      clearCachedTour: vi.fn(),
      isFetching: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<AgentTourPage />);

    expect(
      screen.getByText(/Active run is overdue\. Continue only if this is still the live round/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Offline snapshot shown\. Reload without cache once connectivity returns\./i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Reload Without Cache/i }));

    expect(refetchFromServer).toHaveBeenCalledWith({ clearCache: true });
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Cached tour cleared\. Requested a fresh assignment snapshot from the server\./i,
    );
  });
});
