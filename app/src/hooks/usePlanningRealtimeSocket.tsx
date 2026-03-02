import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

import {
  ApiRequestError,
  API_BASE,
  buildApiUrl,
  createApiHeaders,
  createApiRequestError,
} from '../services/api';

type PlanningSocketState = 'connected' | 'reconnecting' | 'fallback' | 'disabled';

type SessionPayload = {
  token?: string;
  sessionToken?: string;
};

type PlanningRealtimeEvent = {
  id: string;
  event: string;
  data: Record<string, unknown>;
};

const BASE_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 3;
const WEBSOCKET_SESSION_ENDPOINTS = ['/api/planning/ws-session', '/api/planning/ws/session'];

class WebSocketSessionRequestError extends Error {
  constructor(readonly status: number) {
    super(`Unable to issue websocket session token (HTTP ${status})`);
  }
}

const requestWebSocketSessionToken = async () => {
  for (const endpoint of WEBSOCKET_SESSION_ENDPOINTS) {
    const response = await fetch(buildApiUrl(endpoint), {
      method: 'POST',
      credentials: 'include',
      headers: createApiHeaders(),
    });

    if (response.status === 404) {
      continue;
    }

    if (response.status === 401) {
      throw await createApiRequestError(response);
    }

    if (!response.ok) {
      throw new WebSocketSessionRequestError(response.status);
    }

    const payload = (await response.json()) as SessionPayload;
    const token = payload.token ?? payload.sessionToken;
    if (token) {
      return token;
    }
  }

  throw new Error('Missing websocket session token');
};

export const usePlanningRealtimeSocket = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<PlanningSocketState>('reconnecting');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let socket: Socket | null = null;
    let reconnectAttempts = 0;
    let reconnectTimer: number | null = null;
    let isCancelled = false;

    const invalidateDashboardQueries = () => {
      setLastEventAt(Date.now());
      queryClient.invalidateQueries({ queryKey: ['planning-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const invalidateTourQueries = () => {
      invalidateDashboardQueries();
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
    };

    const closeSocket = () => {
      if (socket) {
        socket.removeAllListeners();
        socket.close();
        socket = null;
      }
    };

    const scheduleReconnect = () => {
      closeSocket();

      if (isCancelled) {
        return;
      }

      reconnectAttempts += 1;
      if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        setConnectionState('fallback');
        return;
      }

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
        const sessionToken = await requestWebSocketSessionToken();
        if (isCancelled) {
          return;
        }

        socket = io(API_BASE, {
          path: '/api/planning/ws',
          transports: ['websocket'],
          withCredentials: true,
          forceNew: true,
          reconnection: false,
          auth: {
            sessionToken,
          },
        });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          setConnectionState('fallback');
          return;
        }

        if (
          error instanceof WebSocketSessionRequestError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408 &&
          error.status !== 429
        ) {
          setConnectionState('fallback');
          return;
        }

        scheduleReconnect();
        return;
      }

      socket.on('connect', () => {
        reconnectAttempts = 0;
        setConnectionState('connected');
      });

      socket.on('connect_error', () => {
        scheduleReconnect();
      });

      socket.on('disconnect', () => {
        if (isCancelled) {
          return;
        }

        scheduleReconnect();
      });

      socket.on('planning.dashboard.snapshot', (_event: PlanningRealtimeEvent) => {
        invalidateDashboardQueries();
      });

      socket.on('planning.container.critical', (_event: PlanningRealtimeEvent) => {
        invalidateDashboardQueries();
      });

      socket.on('planning.emergency.created', (_event: PlanningRealtimeEvent) => {
        invalidateTourQueries();
      });

      socket.on('planning.tour.updated', (_event: PlanningRealtimeEvent) => {
        invalidateTourQueries();
      });

      socket.on('system.keepalive', (_event: PlanningRealtimeEvent) => {
        setLastEventAt(Date.now());
      });
    };

    void connect();

    return () => {
      isCancelled = true;

      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
      }

      closeSocket();
    };
  }, [enabled, queryClient]);

  const resolvedConnectionState = enabled ? connectionState : 'disabled';

  return useMemo(
    () => ({
      connectionState: resolvedConnectionState,
      lastEventAt,
      isConnected: resolvedConnectionState === 'connected',
    }),
    [lastEventAt, resolvedConnectionState],
  );
};
