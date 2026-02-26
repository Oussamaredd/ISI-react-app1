import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAccessToken } from '../services/authToken';
import { usePlanningRealtimeStream } from '../hooks/usePlanningRealtimeStream';

vi.mock('../services/api', () => ({
  API_BASE: 'http://localhost:3001',
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

const createWrapper = (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('usePlanningRealtimeStream', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    localStorage.clear();
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
      'http://localhost:3001/api/planning/stream/session',
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
});
