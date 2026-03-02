import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlanningRealtimeSocket } from '../hooks/usePlanningRealtimeSocket';

const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    API_BASE: 'http://localhost:3001',
  };
});

type SocketHandlers = Record<string, (payload?: unknown) => void>;

const createMockSocket = () => {
  const handlers: SocketHandlers = {};

  return {
    handlers,
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      handlers[event] = handler;
      return undefined;
    }),
    removeAllListeners: vi.fn(),
    close: vi.fn(),
  };
};

const createWrapper = (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('usePlanningRealtimeSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'ws-session-token' }),
      } satisfies Partial<Response>),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects websocket and invalidates queries on realtime events', async () => {
    const socket = createMockSocket();
    ioMock.mockReturnValue(socket);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePlanningRealtimeSocket(true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(ioMock).toHaveBeenCalled();
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/planning/ws-session',
      expect.objectContaining({ method: 'POST' }),
    );

    await act(async () => {
      socket.handlers.connect?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    await act(async () => {
      socket.handlers['planning.dashboard.snapshot']?.({});
      await Promise.resolve();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['planning-dashboard'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });

    await act(async () => {
      socket.handlers['planning.tour.updated']?.({});
      await Promise.resolve();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['agent-tour'] });
  });

  it('falls back without retry storms on non-retriable session errors', async () => {
    vi.useFakeTimers();

    const failingFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad Request' }),
    } satisfies Partial<Response>);
    vi.stubGlobal('fetch', failingFetch as unknown as typeof fetch);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePlanningRealtimeSocket(true), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('fallback');
    });

    expect(failingFetch).toHaveBeenCalledTimes(1);
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('falls back to legacy websocket session endpoint when preferred path is missing', async () => {
    const socket = createMockSocket();
    ioMock.mockReturnValue(socket);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      } satisfies Partial<Response>)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ token: 'legacy-ws-token' }),
      } satisfies Partial<Response>);
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => usePlanningRealtimeSocket(true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(ioMock).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/planning/ws-session',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/planning/ws/session',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
