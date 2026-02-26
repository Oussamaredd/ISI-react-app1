import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

import { API_BASE } from '../services/api';
import { withAuthHeader } from '../services/authToken';

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

const requestWebSocketSessionToken = async () => {
  const response = await fetch(`${API_BASE}/api/planning/ws/session`, {
    method: 'POST',
    credentials: 'include',
    headers: Object.fromEntries(
      withAuthHeader({
        'Content-Type': 'application/json',
      }).entries(),
    ),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Unable to issue websocket session token');
  }

  const payload = (await response.json()) as SessionPayload;
  const token = payload.token ?? payload.sessionToken;
  if (!token) {
    throw new Error('Missing websocket session token');
  }

  return token;
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
      } catch {
        if (reconnectAttempts >= 3) {
          setConnectionState('fallback');
        }
        scheduleReconnect();
        return;
      }

      socket.on('connect', () => {
        reconnectAttempts = 0;
        setConnectionState('connected');
      });

      socket.on('connect_error', () => {
        if (reconnectAttempts >= 3) {
          setConnectionState('fallback');
        }
        scheduleReconnect();
      });

      socket.on('disconnect', () => {
        if (isCancelled) {
          return;
        }

        if (reconnectAttempts >= 3) {
          setConnectionState('fallback');
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
