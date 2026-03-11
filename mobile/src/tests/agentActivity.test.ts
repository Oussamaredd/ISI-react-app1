import { describe, expect, it } from "vitest";

import type {
  AgentTourActivityItem,
  AgentTourStop
} from "../api/modules/tours";
import {
  describeAgentActivity,
  normalizeOperationalStatus,
  resolveActiveTourStop,
  resolveNextTourStop
} from "../features/agent/agentActivity";

const createStop = (
  overrides: Partial<AgentTourStop> = {}
): AgentTourStop => ({
  id: "stop-1",
  stopOrder: 1,
  status: "pending",
  containerId: "container-1",
  containerCode: "CT-001",
  containerLabel: "Central plaza",
  ...overrides
});

const createActivity = (
  overrides: Partial<AgentTourActivityItem> = {}
): AgentTourActivityItem => ({
  id: "activity-1",
  type: "tour_started",
  createdAt: "2026-03-11T08:00:00.000Z",
  details: {},
  ...overrides
});

describe("agentActivity helpers", () => {
  it("normalizes operational status strings", () => {
    expect(normalizeOperationalStatus(" In_Progress ")).toBe("in_progress");
    expect(normalizeOperationalStatus(null)).toBe("");
  });

  it("prefers the active stop and falls back to the first pending stop", () => {
    const activeStop = createStop({ id: "stop-2", stopOrder: 2, status: "active" });
    const pendingStop = createStop({ id: "stop-3", stopOrder: 3, status: "pending" });

    expect(
      resolveActiveTourStop([
        createStop({ id: "stop-1", status: "completed" }),
        activeStop,
        pendingStop
      ])
    ).toBe(activeStop);

    expect(
      resolveActiveTourStop([
        createStop({ id: "stop-1", status: "completed" }),
        pendingStop
      ])
    ).toBe(pendingStop);
  });

  it("resolves the next actionable stop after the active stop", () => {
    const activeStop = createStop({ id: "stop-2", stopOrder: 2, status: "active" });
    const nextStop = createStop({ id: "stop-3", stopOrder: 3, status: "pending" });

    expect(
      resolveNextTourStop(
        [
          createStop({ id: "stop-1", stopOrder: 1, status: "completed" }),
          activeStop,
          createStop({ id: "stop-4", stopOrder: 4, status: "completed" }),
          nextStop
        ],
        activeStop
      )
    ).toBe(nextStop);
  });

  it("describes collection and anomaly activities using platform details", () => {
    expect(
      describeAgentActivity(
        createActivity({
          type: "collection_validated",
          details: { volumeLiters: 240 }
        })
      )
    ).toEqual({
      title: "Collection validated",
      summary: "240 liters recorded at the stop."
    });

    expect(
      describeAgentActivity(
        createActivity({
          type: "anomaly_reported",
          details: {
            severity: "critical",
            comments: "Container is blocked by a parked truck."
          }
        })
      )
    ).toEqual({
      title: "Anomaly reported",
      summary: "critical severity. Container is blocked by a parked truck."
    });
  });
});
