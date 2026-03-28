import { screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentHomeScreen } from "@/features/agent/AgentHomeScreen";
import { captureCurrentLocation } from "@/device/location";
import { useSession } from "@/providers/SessionProvider";
import { toursApi } from "@api/modules/tours";
import { mobileFireEvent, renderMobileScreenAsync } from "./test-utils";

vi.mock("@api/modules/tours", () => ({
  toursApi: {
    getAnomalyTypes: vi.fn(),
    getAssignedTour: vi.fn(),
    getTourActivity: vi.fn(),
    reportAnomaly: vi.fn(),
    startTour: vi.fn(),
    validateStop: vi.fn(),
  },
}));

vi.mock("@/providers/SessionProvider", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/device/location", () => ({
  captureCurrentLocation: vi.fn(),
}));

describe("AgentHomeScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      signOut: vi.fn(),
      user: {
        id: "agent-1",
        email: "agent@example.com",
        displayName: "Agent",
        role: "agent",
        roles: [],
      },
    } as never);
    vi.mocked(toursApi.getAssignedTour).mockResolvedValue({
      id: "tour-1",
      name: "Morning Route",
      zoneName: "North Zone",
      status: "assigned",
      scheduledFor: "2026-03-02T08:00:00.000Z",
      routeSummary: {
        totalStops: 2,
        remainingStops: 2,
        totalDistanceKm: 6,
      },
      stops: [
        {
          id: "stop-1",
          containerId: "container-1",
          containerCode: "CTR-1",
          containerLabel: "Riverside",
          status: "pending",
          stopOrder: 1,
          latitude: "48.8566",
          longitude: "2.3522",
          eta: "2026-03-02T08:30:00.000Z",
        },
        {
          id: "stop-2",
          containerId: "container-2",
          containerCode: "CTR-2",
          containerLabel: "Market Square",
          status: "pending",
          stopOrder: 2,
          latitude: "48.8570",
          longitude: "2.3530",
          eta: "2026-03-02T08:50:00.000Z",
        },
      ],
    } as never);
    vi.mocked(toursApi.getAnomalyTypes).mockResolvedValue({
      anomalyTypes: [
        {
          id: "overflow",
          label: "Overflow",
        },
      ],
    } as never);
    vi.mocked(toursApi.getTourActivity).mockResolvedValue({
      activity: [
        {
          id: "activity-1",
          type: "tour_started",
          createdAt: "2026-03-02T08:00:00.000Z",
          actorDisplayName: "Agent",
          details: {},
        },
      ],
    } as never);
    vi.mocked(captureCurrentLocation).mockResolvedValue({
      latitude: "48.8567",
      longitude: "2.3523",
    } as never);
  });

  it("walks the agent through start, validation, and anomaly reporting", async () => {
    vi.mocked(toursApi.startTour).mockResolvedValue({
      firstActiveStopId: "stop-1",
    } as never);
    vi.mocked(toursApi.validateStop).mockResolvedValue({
      alreadyValidated: false,
      nextStopId: "stop-2",
    } as never);
    vi.mocked(toursApi.reportAnomaly).mockResolvedValue({
      managerAlertTriggered: true,
    } as never);

    await renderMobileScreenAsync(<AgentHomeScreen />);

    expect(await screen.findByText(/Morning Route/i)).toBeTruthy();

    await mobileFireEvent.click(screen.getByRole("button", { name: /Start tour/i }));

    expect(await screen.findByText(/marked the first stop as active/i)).toBeTruthy();

    await mobileFireEvent.change(screen.getByLabelText(/Collected volume/i), {
      target: {
        value: "180",
      },
    });
    await mobileFireEvent.click(screen.getByRole("button", { name: /Attach live location/i }));

    expect(await screen.findByText(/Attached GPS/i)).toBeTruthy();

    await mobileFireEvent.click(screen.getByRole("button", { name: /Validate stop/i }));

    await waitFor(() => {
      expect(toursApi.validateStop).toHaveBeenCalledWith(
        expect.objectContaining({
          stopId: "stop-1",
          volumeLiters: 180,
          latitude: "48.8567",
          longitude: "2.3523",
        }),
      );
    });

    expect(await screen.findByText(/advanced the route to the next stop/i)).toBeTruthy();

    await mobileFireEvent.click(screen.getByLabelText(/Overflow/i));
    await mobileFireEvent.click(screen.getByRole("button", { name: /High/i }));
    await mobileFireEvent.change(screen.getByLabelText(/Comments/i), {
      target: {
        value: "Container door is blocked",
      },
    });
    await mobileFireEvent.click(screen.getByRole("button", { name: /Report anomaly/i }));

    await waitFor(() => {
      expect(toursApi.reportAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          anomalyTypeId: "overflow",
          severity: "high",
          comments: "Container door is blocked",
        }),
      );
    });

    expect(await screen.findByText(/queued the manager alert/i)).toBeTruthy();
  });
});
