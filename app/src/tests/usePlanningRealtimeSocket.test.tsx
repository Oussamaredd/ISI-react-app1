import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlanningRealtimeSocket } from '../hooks/usePlanningRealtimeSocket';

const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

vi.mock('../services/api', () => ({
  API_BASE: 'http://localhost:3001',
}));

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
      'http://localhost:3001/api/planning/ws/session',
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
});
