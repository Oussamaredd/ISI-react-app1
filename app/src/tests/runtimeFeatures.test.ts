// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_APP_RUNTIME_CONFIG,
  isFeatureRouteEnabled,
  loadAppRuntimeConfig,
} from "../config/runtimeFeatures";

describe("runtimeFeatures", () => {
  it("loads defaults when optional VITE runtime flags are absent or invalid", () => {
    vi.stubEnv("VITE_ADMIN_WORKSPACE_ENABLED", undefined);
    vi.stubEnv("VITE_API_TELEMETRY_ENABLED", undefined);
    vi.stubEnv("VITE_CITIZEN_CHALLENGES_ENABLED", undefined);
    vi.stubEnv("VITE_DASHBOARD_REFRESH_INTERVAL_MS", "bad-value");
    vi.stubEnv("VITE_MANAGER_REPORTS_ENABLED", undefined);
    vi.stubEnv("VITE_PLANNING_REFRESH_INTERVAL_MS", "0");
    vi.stubEnv("VITE_PLANNING_SSE_ENABLED", undefined);
    vi.stubEnv("VITE_PLANNING_WEBSOCKET_ENABLED", undefined);

    expect(loadAppRuntimeConfig()).toEqual(DEFAULT_APP_RUNTIME_CONFIG);
  });

  it("normalizes valid runtime flag overrides", () => {
    vi.stubEnv("VITE_ADMIN_WORKSPACE_ENABLED", "true");
    vi.stubEnv("VITE_API_TELEMETRY_ENABLED", "true");
    vi.stubEnv("VITE_CITIZEN_CHALLENGES_ENABLED", "false");
    vi.stubEnv("VITE_DASHBOARD_REFRESH_INTERVAL_MS", "60000");
    vi.stubEnv("VITE_MANAGER_REPORTS_ENABLED", "true");
    vi.stubEnv("VITE_PLANNING_REFRESH_INTERVAL_MS", "45000");
    vi.stubEnv("VITE_PLANNING_SSE_ENABLED", "true");
    vi.stubEnv("VITE_PLANNING_WEBSOCKET_ENABLED", "false");

    expect(loadAppRuntimeConfig()).toEqual({
      adminWorkspaceEnabled: true,
      apiTelemetryEnabled: true,
      citizenChallengesEnabled: false,
      dashboardRefreshIntervalMs: 60000,
      managerReportsEnabled: true,
      planningRefreshIntervalMs: 45000,
      planningSseEnabled: true,
      planningWebsocketEnabled: false,
    });
  });

  it("gates only feature-routed pages", () => {
    const runtimeConfig = {
      ...DEFAULT_APP_RUNTIME_CONFIG,
      adminWorkspaceEnabled: false,
      citizenChallengesEnabled: false,
      managerReportsEnabled: true,
    };

    expect(isFeatureRouteEnabled("/app/admin", runtimeConfig)).toBe(false);
    expect(isFeatureRouteEnabled("/app/admin/settings", runtimeConfig)).toBe(false);
    expect(isFeatureRouteEnabled("/app/citizen/challenges", runtimeConfig)).toBe(false);
    expect(isFeatureRouteEnabled("/app/citizen/challenges/season-1", runtimeConfig)).toBe(false);
    expect(isFeatureRouteEnabled("/app/manager/reports", runtimeConfig)).toBe(true);
    expect(isFeatureRouteEnabled("/app/manager/reports/monthly", runtimeConfig)).toBe(true);
    expect(isFeatureRouteEnabled("/app/dashboard", runtimeConfig)).toBe(true);
  });
});
