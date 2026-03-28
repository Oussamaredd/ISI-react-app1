import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAccessToken } from '../services/authToken';
import { buildApiUrl } from '../services/api';
import { usePlanningRealtimeStream } from '../hooks/usePlanningRealtimeStream';

const { reportRealtimeTransportErrorSpy } = vi.hoisted(() => ({
  reportRealtimeTransportErrorSpy: vi.fn(),
}));

vi.mock('../utils/errorHandlers', () => ({
  reportRealtimeTransportError: reportRealtimeTransportErrorSpy,
}));

type EventHandler = (event: Event) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readonly withCredentials: boolean;
  onopen: EventHandler | null = null;
  onerror: EventHandler | null = null;
  private readonly listeners = new Map<string, EventHandler[]>();

  constructor(url: string, options?: EventSourceInit) {
    this.url = url;
    this.withCredentials = Boolean(options?.withCredentials);
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventHandler) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  close() {
    return undefined;
  }

  emit(type: string, lastEventId?: string) {
    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      listener(
        new MessageEvent(type, {
          lastEventId,
        }),
      );
    }
  }
}

const jsonHeaders = new Headers({
  'content-type': 'application/json',
});

const createWrapper = (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('usePlanningRealtimeStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    localStorage.clear();
    reportRealtimeTransportErrorSpy.mockReset();
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ sessionToken: 'stream-session-123' }),
      } satisfies Partial<Response>),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects to stream and invalidates related queries on events', async () => {
    setAccessToken('token-123');
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePlanningRealtimeStream(true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const stream = MockEventSource.instances[0];
    expect(stream.url).toContain('/api/planning/stream');
    expect(stream.url).toContain('stream_session=stream-session-123');
    expect(stream.url).not.toContain('access_token=token-123');
    expect(stream.withCredentials).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      buildApiUrl('/api/planning/stream/session'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );

    await act(async () => {
      stream.onopen?.(new Event('open'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    await act(async () => {
      stream.emit('planning.dashboard.snapshot', 'event-1');
      await Promise.resolve();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['planning-dashboard'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });

    await act(async () => {
      stream.emit('planning.tour.updated', 'event-2');
      await Promise.resolve();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['agent-tour'] });
  });

  it('falls back to the secondary stream-session endpoint after a 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: jsonHeaders,
          json: async () => ({}),
        } satisfies Partial<Response>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: jsonHeaders,
          json: async () => ({ streamSessionToken: 'fallback-session' }),
        } satisfies Partial<Response>),
    );

    renderHook(() => usePlanningRealtimeStream(true), {
      wrapper: createWrapper(new QueryClient()),
    });

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      buildApiUrl('/api/planning/stream/session'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      buildApiUrl('/api/planning/stream-session'),
      expect.any(Object),
    );
    expect(MockEventSource.instances[0]?.url).toContain('stream_session=fallback-session');
  });

  it('switches to fallback mode when session issuance is unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        url: buildApiUrl('/api/planning/stream/session'),
        headers: jsonHeaders,
        json: async () => ({ message: 'UNAUTHORIZED' }),
      } satisfies Partial<Response>),
    );

    const { result } = renderHook(() => usePlanningRealtimeStream(true), {
      wrapper: createWrapper(new QueryClient()),
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('fallback');
    });

    expect(MockEventSource.instances).toHaveLength(0);
    expect(reportRealtimeTransportErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      'planning.realtime.stream.session',
    );
  });

  it('reconnects after connection errors and reuses the last event id', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: jsonHeaders,
          json: async () => ({ sessionToken: 'stream-session-1' }),
        } satisfies Partial<Response>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: jsonHeaders,
          json: async () => ({ sessionToken: 'stream-session-2' }),
        } satisfies Partial<Response>),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const { result } = renderHook(() => usePlanningRealtimeStream(true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const firstStream = MockEventSource.instances[0];
    await act(async () => {
      firstStream.onopen?.(new Event('open'));
      firstStream.emit('system.keepalive', 'event-99');
      firstStream.onerror?.(new Event('error'));
      await vi.advanceTimersByTimeAsync(2_000);
    });

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(2);
    });

    expect(result.current.connectionState).toBe('reconnecting');
    expect(MockEventSource.instances[1]?.url).toContain('last_event_id=event-99');
    expect(reportRealtimeTransportErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      'planning.realtime.stream.connection',
    );
  });

  it('reports disabled and unsupported transports without opening a stream', () => {
    const disabledResult = renderHook(() => usePlanningRealtimeStream(false), {
      wrapper: createWrapper(new QueryClient()),
    }).result;

    expect(disabledResult.current.connectionState).toBe('disabled');

    vi.stubGlobal('EventSource', undefined as unknown as typeof EventSource);

    const fallbackResult = renderHook(() => usePlanningRealtimeStream(true), {
      wrapper: createWrapper(new QueryClient()),
    }).result;

    expect(fallbackResult.current.connectionState).toBe('fallback');
  });
});
