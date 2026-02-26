import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { withAuthHeader } from '../services/authToken';
import { API_BASE } from '../services/api';

type PlanningStreamState = 'connected' | 'reconnecting' | 'fallback' | 'disabled';

const BASE_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const STREAM_SESSION_ENDPOINTS = ['/api/planning/stream/session', '/api/planning/stream-session'];

type StreamSessionPayload = {
  sessionToken?: string;
  streamSessionToken?: string;
  token?: string;
};

const toStreamUrl = (sessionToken: string, lastEventId: string | null) => {
  const streamUrl = new URL(`${API_BASE}/api/planning/stream`);
  streamUrl.searchParams.set('stream_session', sessionToken);

  if (lastEventId) {
    streamUrl.searchParams.set('last_event_id', lastEventId);
  }

  return streamUrl.toString();
};

const requestStreamSessionToken = async (lastEventId: string | null) => {
  for (const endpoint of STREAM_SESSION_ENDPOINTS) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: Object.fromEntries(
        withAuthHeader({
          'Content-Type': 'application/json',
        }).entries(),
      ),
      body: JSON.stringify(lastEventId ? { lastEventId } : {}),
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as StreamSessionPayload;
    const sessionToken = payload.sessionToken ?? payload.streamSessionToken ?? payload.token;

    if (sessionToken) {
      return sessionToken;
    }
  }

  throw new Error('Missing stream session token');
};

export const usePlanningRealtimeStream = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const isEventSourceSupported =
    typeof window !== 'undefined' && typeof window.EventSource !== 'undefined';

  const [connectionState, setConnectionState] = useState<PlanningStreamState>('reconnecting');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !isEventSourceSupported) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let isCancelled = false;
    let lastEventId: string | null = null;

    const invalidateDashboardQueries = () => {
      setLastEventAt(Date.now());
      queryClient.invalidateQueries({ queryKey: ['planning-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const invalidateTourQueries = () => {
      invalidateDashboardQueries();
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
    };

    const closeStream = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const scheduleReconnect = () => {
      closeStream();

      if (isCancelled) {
        return;
      }

      reconnectAttempts += 1;
      setConnectionState('reconnecting');
      const reconnectDelay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempts - 1),
        MAX_RECONNECT_DELAY_MS,
      );

      reconnectTimer = window.setTimeout(() => {
        void connect();
      }, reconnectDelay);
    };

    const connect = async () => {
      if (isCancelled) {
        return;
      }

      try {
        const streamSessionToken = await requestStreamSessionToken(lastEventId);
        if (isCancelled) {
          return;
        }

        eventSource = new window.EventSource(toStreamUrl(streamSessionToken, lastEventId), {
          withCredentials: true,
        });
      } catch {
        if (reconnectAttempts >= 3) {
          setConnectionState('fallback');
        }
        scheduleReconnect();
        return;
      }

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        setConnectionState('connected');
      };

      eventSource.onerror = () => {
        if (reconnectAttempts >= 3) {
          setConnectionState('fallback');
        }
        scheduleReconnect();
      };

      const trackLastEventId = (event: Event) => {
        const messageEvent = event as MessageEvent;
        if (typeof messageEvent.lastEventId === 'string' && messageEvent.lastEventId.length > 0) {
          lastEventId = messageEvent.lastEventId;
        }
      };

      eventSource.addEventListener('planning.dashboard.snapshot', (event) => {
        trackLastEventId(event);
        invalidateDashboardQueries();
      });
      eventSource.addEventListener('planning.container.critical', (event) => {
        trackLastEventId(event);
        invalidateDashboardQueries();
      });
      eventSource.addEventListener('planning.emergency.created', (event) => {
        trackLastEventId(event);
        invalidateTourQueries();
      });
      eventSource.addEventListener('planning.tour.updated', (event) => {
        trackLastEventId(event);
        invalidateTourQueries();
      });
      eventSource.addEventListener('system.keepalive', (event) => {
        trackLastEventId(event);
        setLastEventAt(Date.now());
      });
    };

    void connect();

    return () => {
      isCancelled = true;
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
      }
      closeStream();
    };
  }, [enabled, isEventSourceSupported, queryClient]);

  const resolvedConnectionState = !enabled
    ? 'disabled'
    : !isEventSourceSupported
      ? 'fallback'
      : connectionState;

  return useMemo(
    () => ({
      connectionState: resolvedConnectionState,
      lastEventAt,
      isConnected: resolvedConnectionState === 'connected',
    }),
    [lastEventAt, resolvedConnectionState],
  );
};
