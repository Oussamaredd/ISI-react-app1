import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PlanningService, type PlanningStreamEvent } from '../planning/planning.service.js';

describe('PlanningService stream hardening', () => {
  const monitoringServiceMock = {
    setRealtimeDiagnostics: vi.fn(),
  };

  it('replays buffered events after Last-Event-ID', async () => {
    const repositoryMock = {
      createPlannedTour: vi.fn().mockResolvedValue({
        id: 'tour-1',
        status: 'scheduled',
        assignedAgentId: null,
        zoneId: 'zone-1',
      }),
      getManagerDashboard: vi.fn().mockResolvedValue({
        ecoKpis: { containers: 1, zones: 1, tours: 1 },
        thresholds: { criticalFillPercent: 80 },
        criticalContainers: [],
      }),
    };
    const authServiceMock = {
      issuePlanningStreamSession: vi.fn(),
    };

    const service = new PlanningService(repositoryMock as any, authServiceMock as any, monitoringServiceMock as any);
    const capturedEvents: PlanningStreamEvent[] = [];
    service.subscribeRealtimeEvents((event) => {
      capturedEvents.push(event);
    });

    await service.createPlannedTour(
      {
        name: 'Morning Route',
        zoneId: 'zone-1',
        scheduledFor: new Date().toISOString(),
        orderedContainerIds: [],
      },
      'user-1',
    );

    expect(capturedEvents.length).toBeGreaterThanOrEqual(2);
    const replayed = service.getReplayEventsAfter(capturedEvents[0]?.id ?? '');
    expect(replayed.length).toBe(capturedEvents.length - 1);
    expect(service.getReplayEventsAfter('missing-id')).toEqual([]);
  });

  it('issues stream session only for manager/admin role users', () => {
    const repositoryMock = {};
    const authServiceMock = {
      issuePlanningStreamSession: vi.fn().mockReturnValue({
        token: 'stream-token',
        expiresAt: '2026-02-23T00:02:00.000Z',
        expiresInSeconds: 120,
      }),
      issuePlanningWebSocketSession: vi.fn().mockReturnValue({
        token: 'ws-token',
        expiresAt: '2026-02-23T00:02:00.000Z',
        expiresInSeconds: 120,
      }),
    };

    const service = new PlanningService(repositoryMock as any, authServiceMock as any, monitoringServiceMock as any);

    expect(
      service.issueStreamSession({
        id: 'user-1',
        email: 'manager@example.com',
        displayName: 'Manager User',
        role: 'manager',
        roles: [{ id: 'role-1', name: 'manager' }],
        permissions: ['ecotrack.analytics.read'],
        isActive: true,
      }),
    ).toEqual({
      token: 'stream-token',
      expiresAt: '2026-02-23T00:02:00.000Z',
      expiresInSeconds: 120,
    });

    expect(() =>
      service.issueStreamSession({
        id: 'user-2',
        email: 'agent@example.com',
        displayName: 'Agent User',
        role: 'agent',
        roles: [{ id: 'role-2', name: 'agent' }],
        permissions: ['ecotrack.tours.read'],
        isActive: true,
      }),
    ).toThrow(ForbiddenException);

    expect(
      service.issueWebSocketSession({
        id: 'user-1',
        email: 'manager@example.com',
        displayName: 'Manager User',
        role: 'manager',
        roles: [{ id: 'role-1', name: 'manager' }],
        permissions: ['ecotrack.analytics.read'],
        isActive: true,
      }),
    ).toEqual({
      token: 'ws-token',
      expiresAt: '2026-02-23T00:02:00.000Z',
      expiresInSeconds: 120,
    });
  });

  it('tracks realtime diagnostics counters and emitted events', () => {
    const service = new PlanningService({} as any, {} as any, monitoringServiceMock as any);

    service.registerSseConnection();
    service.registerWebSocketConnection();
    service.recordEmittedEvent('planning.tour.updated');
    service.registerWebSocketAuthFailure();
    service.unregisterSseConnection();
    service.unregisterWebSocketConnection();

    expect(service.getRealtimeDiagnostics()).toEqual(
      expect.objectContaining({
        activeSseConnections: 0,
        activeWebSocketConnections: 0,
        lastEventName: 'planning.tour.updated',
      }),
    );
    expect(service.getRealtimeDiagnostics().counters).toEqual(
      expect.objectContaining({
        sseConnected: 1,
        sseDisconnected: 1,
        wsConnected: 1,
        wsDisconnected: 1,
        wsAuthFailures: 1,
        emittedEvents: 1,
      }),
    );
  });
});

