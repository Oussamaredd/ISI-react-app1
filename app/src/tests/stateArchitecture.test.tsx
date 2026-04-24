// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { invalidatePlanningQueries } from "../state/invalidation";
import {
  createPlanningDraftState,
  planningDraftReducer,
} from "../state/planningDraft";

describe("frontend state architecture", () => {
  it("resets optimization state when key planning inputs change", () => {
    const initialState = {
      ...createPlanningDraftState("2026-03-23T10:00"),
      orderedRoute: [
        {
          id: "container-1",
          code: "CTR-001",
          label: "North Hub",
          fillLevelPercent: 88,
          order: 1,
        },
      ],
      planCreated: true,
      optimizationMetrics: {
        totalDistanceKm: 8.4,
        estimatedDurationMinutes: 65,
      },
    };

    const updatedState = planningDraftReducer(initialState, {
      type: "set-fill-threshold",
      value: 82,
    });

    expect(updatedState.fillThresholdPercent).toBe(82);
    expect(updatedState.orderedRoute).toEqual([]);
    expect(updatedState.planCreated).toBe(false);
    expect(updatedState.optimizationMetrics).toBeNull();
  });

  it("reorders route items deterministically", () => {
    const initialState = {
      ...createPlanningDraftState("2026-03-23T10:00"),
      orderedRoute: [
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
      ],
    };

    const updatedState = planningDraftReducer(initialState, {
      type: "move-route-item",
      index: 0,
      direction: 1,
    });

    expect(updatedState.orderedRoute.map((item) => item.id)).toEqual([
      "container-2",
      "container-1",
    ]);
    expect(updatedState.orderedRoute.map((item) => item.order)).toEqual([1, 2]);
  });

  it("invalidates planning dashboard, heatmap, tours, and notifications together", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = {
      invalidateQueries,
    } as const;

    await invalidatePlanningQueries(queryClient as never);

    expect(invalidateQueries).toHaveBeenCalledTimes(5);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["agent-tour"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["manager-tours"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["planning-dashboard"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["planning-heatmap", "all", "all"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["planning-notifications", 50],
    });
  });
});
