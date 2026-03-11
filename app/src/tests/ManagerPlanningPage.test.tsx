import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import ManagerPlanningPage from "../pages/ManagerPlanningPage";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/usePlanning", () => ({
  useCreatePlannedTour: vi.fn(),
  useOptimizeTourPlan: vi.fn(),
  usePlanningAgents: vi.fn(),
  useRebuildTourRoute: vi.fn(),
  usePlanningZones: vi.fn(),
}));

const buildRoute = () => [
  {
    id: "container-1",
    code: "CTR-001",
    label: "North Hub",
    fillLevelPercent: 88,
    order: 1,
  },
  {
    id: "container-2",
    code: "CTR-002",
    label: "River Park",
    fillLevelPercent: 76,
    order: 2,
  },
];

describe("ManagerPlanningPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const planningHooks = await import("../hooks/usePlanning");
    (planningHooks.usePlanningZones as Mock).mockReturnValue({
      data: { zones: [{ id: "zone-1", name: "North Zone" }] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.usePlanningAgents as Mock).mockReturnValue({
      data: { agents: [{ id: "agent-1", displayName: "Alex Agent", email: "agent@example.com" }] },
      isLoading: false,
      isError: false,
    });
    (planningHooks.useOptimizeTourPlan as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        route: buildRoute(),
        metrics: { deferredForNearbyTours: 0 },
      }),
      isPending: false,
      data: { metrics: { totalDistanceKm: 8.4, estimatedDurationMinutes: 65 } },
      reset: vi.fn(),
    });
    (planningHooks.useCreatePlannedTour as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: "tour-1" }),
      isPending: false,
    });
    (planningHooks.useRebuildTourRoute as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        routeGeometry: {
          source: "live",
        },
      }),
      isPending: false,
    });
  });

  it("shows planning metadata error and empty states", async () => {
    const planningHooks = await import("../hooks/usePlanning");

    (planningHooks.usePlanningZones as Mock).mockReturnValue({
      data: { zones: [] },
      isLoading: false,
      isError: true,
    });
    (planningHooks.usePlanningAgents as Mock).mockReturnValue({
      data: { agents: [] },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<ManagerPlanningPage />);

    expect(await screen.findByRole("heading", { name: /Tour Planning Wizard/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Unable to load zones/i })).toBeInTheDocument();
    expect(screen.getByText(/Zone data could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Unassigned/i })).toBeInTheDocument();
    expect(screen.getByText(/No active agents are available right now/i)).toBeInTheDocument();
  });

  it("validates required planning inputs before optimization", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ManagerPlanningPage />);

    await user.click(screen.getByRole("button", { name: /Run Optimization/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Select a zone before optimizing/i);

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), "zone-1");
    fireEvent.change(screen.getByLabelText(/Scheduled date\/time/i), {
      target: { value: "" },
    });
    await user.click(screen.getByRole("button", { name: /Run Optimization/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Enter a valid schedule/i);
    expect(screen.getByRole("button", { name: /Create Planned Tour/i })).toBeDisabled();
  });

  it("explains when nearby tours already reserve all matching containers", async () => {
    const planningHooks = await import("../hooks/usePlanning");

    (planningHooks.useOptimizeTourPlan as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        route: [],
        metrics: { deferredForNearbyTours: 2 },
      }),
      isPending: false,
      data: undefined,
      reset: vi.fn(),
    });

    const user = userEvent.setup();
    renderWithProviders(<ManagerPlanningPage />);

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), "zone-1");
    await user.click(screen.getByRole("button", { name: /Run Optimization/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /already planned on nearby tours for this schedule/i,
    );
    expect(screen.getByText(/Run optimization to generate candidate route order/i)).toBeInTheDocument();
  });

  it("allows route reordering after optimization", async () => {
    const planningHooks = await import("../hooks/usePlanning");
    const resetOptimization = vi.fn();

    (planningHooks.useOptimizeTourPlan as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        route: buildRoute(),
        metrics: { deferredForNearbyTours: 0 },
      }),
      isPending: false,
      data: { metrics: { totalDistanceKm: 8.4, estimatedDurationMinutes: 65 } },
      reset: resetOptimization,
    });

    const user = userEvent.setup();
    renderWithProviders(<ManagerPlanningPage />);

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), "zone-1");
    await user.click(screen.getByRole("button", { name: /Run Optimization/i }));
    expect(await screen.findByText(/CTR-001 - North Hub/i)).toBeInTheDocument();

    const routeItemsBefore = screen.getAllByRole("listitem");
    expect(within(routeItemsBefore[0]).getByText(/CTR-001 - North Hub/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^Down$/i })[0]);

    await waitFor(() => {
      const routeItemsAfter = screen.getAllByRole("listitem");
      expect(within(routeItemsAfter[0]).getByText(/CTR-002 - River Park/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Tour name/i), " Updated");
    expect(resetOptimization).toHaveBeenCalled();
  });

  it("surfaces create and rebuild failures with clear status messages", async () => {
    const planningHooks = await import("../hooks/usePlanning");
    const createTour = vi
      .fn()
      .mockRejectedValueOnce(new Error("Planner service unavailable."))
      .mockResolvedValueOnce({ id: "tour-1" });
    const rebuildRoute = vi.fn().mockRejectedValue(new Error("Route provider unavailable."));

    (planningHooks.useCreatePlannedTour as Mock).mockReturnValue({
      mutateAsync: createTour,
      isPending: false,
    });
    (planningHooks.useRebuildTourRoute as Mock).mockReturnValue({
      mutateAsync: rebuildRoute,
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<ManagerPlanningPage />);

    await user.selectOptions(screen.getByLabelText(/^Zone$/i), "zone-1");
    await user.click(screen.getByRole("button", { name: /Run Optimization/i }));
    expect(await screen.findByText(/CTR-001 - North Hub/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Tour name/i));
    await user.click(screen.getByRole("button", { name: /Create Planned Tour/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Enter a tour name before creating the tour/i,
    );

    await user.type(screen.getByLabelText(/Tour name/i), "North Round");
    await user.click(screen.getByRole("button", { name: /Create Planned Tour/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Planner service unavailable/i);

    await user.click(screen.getByRole("button", { name: /Create Planned Tour/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/created successfully/i);

    await user.click(screen.getByRole("button", { name: /Rebuild Stored Route/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Route provider unavailable/i);
  });
});
