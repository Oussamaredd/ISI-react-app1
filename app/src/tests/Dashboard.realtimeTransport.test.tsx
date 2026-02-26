import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "../pages/Dashboard";
import { useCurrentUser } from "../hooks/useAuth";
import { usePlanningDashboard, useEmergencyCollection } from "../hooks/usePlanning";
import { usePlanningRealtimeSocket } from "../hooks/usePlanningRealtimeSocket";
import { usePlanningRealtimeStream } from "../hooks/usePlanningRealtimeStream";
import { useDashboard } from "../hooks/useTickets";
import { renderWithRouter } from "./test-utils";

vi.mock("../hooks/useAuth", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("../hooks/usePlanning", () => ({
  usePlanningDashboard: vi.fn(),
  useEmergencyCollection: vi.fn(),
}));

vi.mock("../hooks/usePlanningRealtimeSocket", () => ({
  usePlanningRealtimeSocket: vi.fn(),
}));

vi.mock("../hooks/usePlanningRealtimeStream", () => ({
  usePlanningRealtimeStream: vi.fn(),
}));

vi.mock("../hooks/useTickets", () => ({
  useDashboard: vi.fn(),
}));

const baseDashboardData = {
  summary: {
    total: 0,
    open: 0,
    completed: 0,
    assigned: 0,
  },
  statusBreakdown: {},
  recentActivity: [],
  recentTickets: [],
};

describe("Dashboard realtime transport precedence", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: "manager-1",
        email: "manager@example.com",
        displayName: "Manager User",
        name: "Manager User",
        avatarUrl: null,
        role: "manager",
        roles: [{ id: "role-manager", name: "manager" }],
        isActive: true,
        provider: "local",
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    vi.mocked(useDashboard).mockReturnValue({
      data: baseDashboardData,
      isFetching: false,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    } as ReturnType<typeof useDashboard>);

    vi.mocked(usePlanningDashboard).mockReturnValue({
      data: {},
      isFetching: false,
      dataUpdatedAt: Date.now(),
    } as ReturnType<typeof usePlanningDashboard>);

    vi.mocked(useEmergencyCollection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useEmergencyCollection>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables SSE path when websocket is connected", () => {
    vi.mocked(usePlanningRealtimeSocket).mockReturnValue({
      connectionState: "connected",
      lastEventAt: Date.now(),
      isConnected: true,
    });
    vi.mocked(usePlanningRealtimeStream).mockReturnValue({
      connectionState: "disabled",
      lastEventAt: null,
      isConnected: false,
    });

    renderWithRouter(<Dashboard />);

    expect(usePlanningRealtimeStream).toHaveBeenCalledWith(false);
    expect(screen.getByText("WebSocket live: WebSocket push active")).toBeInTheDocument();
  });

  it("keeps SSE path enabled when websocket is not connected", () => {
    vi.mocked(usePlanningRealtimeSocket).mockReturnValue({
      connectionState: "fallback",
      lastEventAt: null,
      isConnected: false,
    });
    vi.mocked(usePlanningRealtimeStream).mockReturnValue({
      connectionState: "connected",
      lastEventAt: Date.now(),
      isConnected: true,
    });

    renderWithRouter(<Dashboard />);

    expect(usePlanningRealtimeStream).toHaveBeenCalledWith(true);
    expect(screen.getByText("Live stream: Server push active")).toBeInTheDocument();
  });

  it("maps full push outage to polling fallback mode", () => {
    vi.mocked(usePlanningRealtimeSocket).mockReturnValue({
      connectionState: "fallback",
      lastEventAt: null,
      isConnected: false,
    });
    vi.mocked(usePlanningRealtimeStream).mockReturnValue({
      connectionState: "fallback",
      lastEventAt: null,
      isConnected: false,
    });

    renderWithRouter(<Dashboard />);

    expect(screen.getByText("Polling fallback: Push unavailable, polling active")).toBeInTheDocument();
  });
});

