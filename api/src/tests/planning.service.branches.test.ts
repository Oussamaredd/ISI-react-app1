import { describe, expect, it, vi } from 'vitest';

import type { PlanningStreamEvent } from '../modules/routes/planning.service.js';
import { PlanningService } from '../modules/routes/planning.service.js';

const createService = (overrides?: {
  repository?: Record<string, unknown>;
  authService?: Record<string, unknown>;
  cacheService?: Record<string, unknown>;
  toursRouteCoordinator?: Record<string, unknown>;
}) => {
  const monitoringService = {
    setRealtimeDiagnostics: vi.fn(),
  };
  const repository = {
    getManagerDashboard: vi.fn().mockResolvedValue({}),
    triggerEmergencyCollection: vi.fn().mockResolvedValue({
      id: 'emergency-1',
      emergencyTour: {
        id: 'tour-99',
      },
    }),
    ...(overrides?.repository ?? {}),
  };
  const authService = {
    issuePlanningStreamSession: vi.fn().mockReturnValue({
      token: 'stream-token',
    }),
    issuePlanningWebSocketSession: vi.fn().mockReturnValue({
      token: 'ws-token',
    }),
    ...(overrides?.authService ?? {}),
  };
  const cacheService = {
    getOrLoad: vi.fn(async ({ loader }: { loader: () => Promise<unknown> }) => loader()),
    invalidateNamespaces: vi.fn().mockResolvedValue(undefined),
    ...(overrides?.cacheService ?? {}),
  };
  const toursRouteCoordinator = {
    ensureRouteForTour: vi.fn().mockResolvedValue(undefined),
    ...(overrides?.toursRouteCoordinator ?? {}),
  };

  const service = new PlanningService(
    repository as never,
    authService as never,
    monitoringService as never,
    cacheService as never,
    toursRouteCoordinator as never,
  );

  return {
    service,
    repository,
    authService,
    cacheService,
    monitoringService,
    toursRouteCoordinator,
  };
};

describe('PlanningService branches', () => {
  it('publishes emergency and critical-container events and invalidates analytics caches', async () => {
    const { cacheService, service, toursRouteCoordinator } = createService({
      repository: {
        getManagerDashboard: vi.fn().mockResolvedValue({
          ecoKpis: {
            containers: 4,
            zones: 2,
            tours: 3,
          },
          thresholds: {
            criticalFillPercent: 82,
          },
          criticalContainers: [{ id: 'container-9' }],
          activeAlerts: {
            totalOpen: 1,
          },
          telemetryHealth: {
            reportingContainers: 9,
            staleSensors: 1,
          },
        }),
      },
    });
    const capturedEvents: PlanningStreamEvent[] = [];

    service.subscribeRealtimeEvents((event) => {
      capturedEvents.push(event);
    });

    const result = await service.triggerEmergencyCollection(
      {
        containerId: 'container-9',
        reason: 'Overflowing',
        assignedAgentId: 'agent-1',
      },
      'manager-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'emergency-1',
      }),
    );
    expect(toursRouteCoordinator.ensureRouteForTour).toHaveBeenCalledWith('tour-99');
    expect(cacheService.invalidateNamespaces).toHaveBeenCalledWith(['planning', 'analytics']);
    expect(capturedEvents.map((event) => event.event)).toEqual(
      expect.arrayContaining([
        'planning.emergency.created',
        'planning.container.critical',
        'planning.dashboard.snapshot',
      ]),
    );
    expect(capturedEvents.find((event) => event.event === 'planning.container.critical')).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          container: {
            id: 'container-9',
            status: 'critical',
          },
        }),
      }),
    );
  });

  it('defaults realtime dashboard snapshot values when dashboard data is incomplete', async () => {
    const { service } = createService();

    const snapshotEvent = await service.getRealtimeDashboardSnapshotEvent();

    expect(snapshotEvent).toEqual(
      expect.objectContaining({
        event: 'planning.dashboard.snapshot',
        data: expect.objectContaining({
          ecoKpis: {
            containers: 0,
            zones: 0,
            tours: 0,
          },
          thresholds: {
            criticalFillPercent: 80,
          },
          criticalContainersCount: 0,
          activeAlertsCount: 0,
          telemetryHealth: {
            reportingContainers: 0,
            staleSensors: 0,
          },
        }),
      }),
    );
    expect(service.createKeepaliveEvent()).toEqual(
      expect.objectContaining({
        event: 'system.keepalive',
      }),
    );
    expect(service.getReplayEventsAfter('   ')).toEqual([]);
  });

  it('grants realtime access through normalized additional roles', () => {
    const { authService, service } = createService();

    expect(
      service.issueStreamSession({
        id: 'user-1',
        email: 'ops@example.com',
        displayName: 'Ops',
        role: 'citizen',
        roles: [{ id: 'role-1', name: ' Manager ' }],
        permissions: [],
        isActive: true,
      }),
    ).toEqual({ token: 'stream-token' });
    expect(service.hasRealtimeRoleAccess('agent', [' admin ', ''])).toBe(true);
    expect(service.hasRealtimeRoleAccess('citizen', [' resident '])).toBe(false);
    expect(authService.issuePlanningStreamSession).toHaveBeenCalledWith('user-1');
  });
});
