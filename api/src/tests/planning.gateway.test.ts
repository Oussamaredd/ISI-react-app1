import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PlanningGateway } from '../planning/planning.gateway.js';

describe('PlanningGateway', () => {
  const planningServiceMock = {
    subscribeRealtimeEvents: vi.fn(),
    createKeepaliveEvent: vi.fn(),
    getRealtimeDashboardSnapshotEvent: vi.fn(),
    hasRealtimeRoleAccess: vi.fn(),
    registerWebSocketConnection: vi.fn(),
    unregisterWebSocketConnection: vi.fn(),
    registerWebSocketAuthFailure: vi.fn(),
    recordEmittedEvent: vi.fn(),
  };

  const authServiceMock = {
    getAuthUserFromPlanningWebSocketSessionToken: vi.fn(),
  };

  const usersServiceMock = {
    ensureUserForAuth: vi.fn(),
    getRolesForUser: vi.fn(),
  };

  const serverEmit = vi.fn();
  const unsubscribe = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    planningServiceMock.subscribeRealtimeEvents.mockReturnValue(unsubscribe);
    planningServiceMock.createKeepaliveEvent.mockReturnValue({
      id: 'keepalive-1',
      event: 'system.keepalive',
      data: { timestamp: '2026-02-23T00:00:00.000Z' },
    });
    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockResolvedValue({
      id: 'snapshot-1',
      event: 'planning.dashboard.snapshot',
      data: { timestamp: '2026-02-23T00:00:00.000Z' },
    });
    planningServiceMock.hasRealtimeRoleAccess.mockReturnValue(true);

    authServiceMock.getAuthUserFromPlanningWebSocketSessionToken.mockReturnValue({
      id: 'user-1',
      provider: 'local',
      email: null,
      name: null,
      avatarUrl: null,
    });
    usersServiceMock.ensureUserForAuth.mockResolvedValue({
      id: 'user-1',
      role: 'manager',
      isActive: true,
    });
    usersServiceMock.getRolesForUser.mockResolvedValue([{ id: 'r1', name: 'manager' }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes to planning events and emits keepalive/snapshots', async () => {
    const gateway = new PlanningGateway(
      planningServiceMock as any,
      authServiceMock as any,
      usersServiceMock as any,
    );
    (gateway as any).server = { emit: serverEmit };

    gateway.onModuleInit();

    const listener = planningServiceMock.subscribeRealtimeEvents.mock.calls[0]?.[0];
    listener?.({ id: 'evt-1', event: 'planning.tour.updated', data: { tourId: 't1' } });
    expect(serverEmit).toHaveBeenCalledWith('planning.tour.updated', {
      id: 'evt-1',
      event: 'planning.tour.updated',
      data: { tourId: 't1' },
    });
    expect(planningServiceMock.recordEmittedEvent).toHaveBeenCalledWith('planning.tour.updated');

    vi.advanceTimersByTime(25_000);
    expect(serverEmit).toHaveBeenCalledWith('system.keepalive', expect.any(Object));

    vi.advanceTimersByTime(10_000);
    await Promise.resolve();
    expect(serverEmit).toHaveBeenCalledWith('planning.dashboard.snapshot', expect.any(Object));

    gateway.onModuleDestroy();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('disconnects socket when auth token is invalid', async () => {
    authServiceMock.getAuthUserFromPlanningWebSocketSessionToken.mockReturnValue(null);

    const gateway = new PlanningGateway(
      planningServiceMock as any,
      authServiceMock as any,
      usersServiceMock as any,
    );

    const disconnect = vi.fn();
    const client = {
      handshake: { auth: { sessionToken: 'bad-token' }, query: {} },
      data: {},
      disconnect,
      emit: vi.fn(),
    } as any;

    await gateway.handleConnection(client);

    expect(disconnect).toHaveBeenCalledWith(true);
    expect(planningServiceMock.registerWebSocketAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('authorizes socket and sends initial snapshot', async () => {
    const gateway = new PlanningGateway(
      planningServiceMock as any,
      authServiceMock as any,
      usersServiceMock as any,
    );

    const emit = vi.fn();
    const client = {
      handshake: { auth: { sessionToken: 'ws-token' }, query: {} },
      data: {},
      disconnect: vi.fn(),
      emit,
    } as any;

    await gateway.handleConnection(client);

    expect(client.data.authUserId).toBe('user-1');
    expect(planningServiceMock.registerWebSocketConnection).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('planning.dashboard.snapshot', expect.any(Object));

    gateway.handleDisconnect(client);
    expect(planningServiceMock.unregisterWebSocketConnection).toHaveBeenCalledTimes(1);
  });
});
