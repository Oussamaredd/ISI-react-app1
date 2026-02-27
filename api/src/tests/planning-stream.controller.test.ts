import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PlanningController } from '../planning/planning.controller.js';

describe('Planning stream controller', () => {
  const write = vi.fn();
  const setHeader = vi.fn();
  const flushHeaders = vi.fn();
  const requestOn = vi.fn();
  const unsubscribe = vi.fn();

  const planningServiceMock = {
    getRealtimeDashboardSnapshotEvent: vi.fn(),
    getReplayEventsAfter: vi.fn(),
    subscribeRealtimeEvents: vi.fn(),
    createKeepaliveEvent: vi.fn(),
    registerSseConnection: vi.fn(),
    unregisterSseConnection: vi.fn(),
    recordEmittedEvent: vi.fn(),
    getRealtimeDiagnostics: vi.fn(),
    issueStreamSession: vi.fn(),
    issueWebSocketSession: vi.fn(),
  };

  let controller: PlanningController;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockResolvedValue({
      id: 'evt-1',
      event: 'planning.dashboard.snapshot',
      data: { timestamp: '2026-02-23T00:00:00.000Z', criticalContainersCount: 0 },
    });
    planningServiceMock.subscribeRealtimeEvents.mockReturnValue(unsubscribe);
    planningServiceMock.getReplayEventsAfter.mockReturnValue([]);
    planningServiceMock.createKeepaliveEvent.mockReturnValue({
      id: 'evt-keepalive',
      event: 'system.keepalive',
      data: { timestamp: '2026-02-23T00:00:25.000Z' },
    });
    planningServiceMock.issueStreamSession.mockReturnValue({
      token: 'stream-token',
      expiresAt: '2026-02-23T00:02:00.000Z',
      expiresInSeconds: 120,
    });
    planningServiceMock.issueWebSocketSession.mockReturnValue({
      token: 'ws-token',
      expiresAt: '2026-02-23T00:02:00.000Z',
      expiresInSeconds: 120,
    });
    planningServiceMock.getRealtimeDiagnostics.mockReturnValue({
      activeSseConnections: 0,
      activeWebSocketConnections: 0,
      counters: {
        sseConnected: 0,
        sseDisconnected: 0,
        wsConnected: 0,
        wsDisconnected: 0,
        wsAuthFailures: 0,
        emittedEvents: 0,
      },
      lastEventTimestamp: null,
      lastEventName: null,
    });

    controller = new PlanningController(planningServiceMock as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns unauthorized when request has no user id', async () => {
    await expect(
      controller.stream(
        { authUser: undefined, on: requestOn } as any,
        { write, setHeader, flushHeaders } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('writes snapshot and keepalive events for connected stream', async () => {
    const requestHandlers: Record<string, (() => void) | undefined> = {};
    requestOn.mockImplementation((event: string, handler: () => void) => {
      requestHandlers[event] = handler;
      return undefined;
    });

    await controller.stream(
      {
        authUser: { id: 'user-1' },
        headers: {},
        on: requestOn,
      } as any,
      {
        setHeader,
        flushHeaders,
        write,
      } as any,
    );

    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(flushHeaders).toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(': connected\n\n');
    expect(write).toHaveBeenCalledWith('event: planning.dashboard.snapshot\n');
    expect(planningServiceMock.registerSseConnection).toHaveBeenCalledTimes(1);
    expect(planningServiceMock.recordEmittedEvent).toHaveBeenCalledWith('planning.dashboard.snapshot');

    vi.advanceTimersByTime(25_000);
    expect(write).toHaveBeenCalledWith('event: system.keepalive\n');
    expect(planningServiceMock.recordEmittedEvent).toHaveBeenCalledWith('system.keepalive');

    requestHandlers.close?.();
    expect(unsubscribe).toHaveBeenCalled();
    expect(planningServiceMock.unregisterSseConnection).toHaveBeenCalledTimes(1);
  });

  it('replays buffered events from Last-Event-ID before snapshot', async () => {
    planningServiceMock.getReplayEventsAfter.mockReturnValue([
      {
        id: 'evt-2',
        event: 'planning.tour.updated',
        data: { timestamp: '2026-02-23T00:00:10.000Z' },
      },
    ]);

    await controller.stream(
      {
        authUser: { id: 'user-1' },
        headers: { 'last-event-id': 'evt-1' },
        on: requestOn,
      } as any,
      {
        setHeader,
        flushHeaders,
        write,
      } as any,
    );

    expect(planningServiceMock.getReplayEventsAfter).toHaveBeenCalledWith('evt-1');
    const replayCallIndex = write.mock.calls.findIndex((call) => call[0] === 'event: planning.tour.updated\n');
    const snapshotCallIndex = write.mock.calls.findIndex(
      (call) => call[0] === 'event: planning.dashboard.snapshot\n',
    );
    expect(replayCallIndex).toBeGreaterThan(-1);
    expect(snapshotCallIndex).toBeGreaterThan(replayCallIndex);
  });

  it('cleans up SSE connection when initial snapshot fetch fails', async () => {
    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockRejectedValueOnce(
      new Error('snapshot unavailable'),
    );

    await expect(
      controller.stream(
        {
          authUser: { id: 'user-1' },
          headers: {},
          on: requestOn,
        } as any,
        {
          setHeader,
          flushHeaders,
          write,
        } as any,
      ),
    ).rejects.toThrow('snapshot unavailable');

    expect(planningServiceMock.registerSseConnection).toHaveBeenCalledTimes(1);
    expect(planningServiceMock.unregisterSseConnection).toHaveBeenCalledTimes(1);
    expect(planningServiceMock.subscribeRealtimeEvents).not.toHaveBeenCalled();
  });

  it('issues a stream session for authorized manager/admin users', async () => {
    await expect(
      controller.issueStreamSession({
        authUser: { id: 'user-1', role: 'manager', roles: [{ id: 'r1', name: 'manager' }] },
      } as any),
    ).resolves.toEqual({
      token: 'stream-token',
      expiresAt: '2026-02-23T00:02:00.000Z',
      expiresInSeconds: 120,
    });

    expect(planningServiceMock.issueStreamSession).toHaveBeenCalled();
  });

  it('propagates forbidden errors for stream session issuance', async () => {
    planningServiceMock.issueStreamSession.mockImplementationOnce(() => {
      throw new ForbiddenException('Insufficient permissions');
    });

    await expect(
      controller.issueStreamSession({
        authUser: { id: 'user-2', role: 'agent', roles: [{ id: 'r2', name: 'agent' }] },
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('issues a websocket session for authorized manager/admin users', async () => {
    await expect(
      controller.issueWebSocketSession({
        authUser: { id: 'user-1', role: 'manager', roles: [{ id: 'r1', name: 'manager' }] },
      } as any),
    ).resolves.toEqual({
      token: 'ws-token',
      expiresAt: '2026-02-23T00:02:00.000Z',
      expiresInSeconds: 120,
    });

    expect(planningServiceMock.issueWebSocketSession).toHaveBeenCalled();
  });
});
