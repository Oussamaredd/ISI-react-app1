import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '../services/api';

type CachedEnvelope<T> = {
  cachedAt: string;
  data: T;
};

export type GeoJsonLineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

export type TourRouteGeometry = {
  geometry: GeoJsonLineString;
  distanceKm: number | null;
  durationMinutes: number | null;
  source: 'live' | 'fallback';
  provider: string;
  resolvedAt: string;
};

export type AgentTourDataSource = 'none' | 'network' | 'cache';

const AGENT_TOUR_CACHE_KEY = 'ecotrack.agentTour.cache.v1';

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window;

const readCachedEnvelope = <T,>(key: string) => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<CachedEnvelope<T>>;
    if (!parsed || !parsed.cachedAt || !('data' in parsed)) {
      return null;
    }

    return {
      cachedAt: parsed.cachedAt,
      data: parsed.data as T,
    } satisfies CachedEnvelope<T>;
  } catch {
    return null;
  }
};

const writeCachedEnvelope = (key: string, data: unknown) => {
  if (!canUseStorage()) {
    return;
  }

  try {
    const payload: CachedEnvelope<unknown> = {
      cachedAt: new Date().toISOString(),
      data,
    };

    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota and serialization failures; the live response still succeeds.
  }
};

const hasSeedFallbackRoute = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const routeGeometry = (data as Record<string, unknown>).routeGeometry;
  if (!routeGeometry || typeof routeGeometry !== 'object') {
    return false;
  }

  const provider = (routeGeometry as Record<string, unknown>).provider;
  const source = (routeGeometry as Record<string, unknown>).source;

  return (
    typeof provider === 'string' &&
    provider.trim().toLowerCase() === 'seed' &&
    (typeof source !== 'string' || source.trim().toLowerCase() !== 'live')
  );
};

const readReusableAgentTourCache = () => {
  const cached = readCachedEnvelope<unknown>(AGENT_TOUR_CACHE_KEY);
  if (!cached) {
    return null;
  }

  return hasSeedFallbackRoute(cached.data) ? null : cached;
};

export const useAgentTour = () =>
  {
    const initialCachedTour = readReusableAgentTourCache();
    const [dataSource, setDataSource] = useState<AgentTourDataSource>(
      initialCachedTour ? 'cache' : 'none',
    );

    const query = useQuery({
      queryKey: ['agent-tour'],
      queryFn: async () => {
        try {
          const response = await apiClient.get('/api/tours/agent/me');
          writeCachedEnvelope(AGENT_TOUR_CACHE_KEY, response);
          setDataSource('network');
          return response;
        } catch (error) {
          const cached = readReusableAgentTourCache();
          if (cached) {
            setDataSource('cache');
            return cached.data;
          }

          setDataSource('none');
          throw error;
        }
      },
      staleTime: 30_000,
      initialData: () => initialCachedTour?.data,
      initialDataUpdatedAt: () =>
        initialCachedTour ? Date.parse(initialCachedTour.cachedAt) : undefined,
      retry: false,
    });

    return {
      ...query,
      dataSource,
    };
  };

export const useStartAgentTour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tourId: string) => apiClient.post(`/api/tours/${tourId}/start`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
      queryClient.invalidateQueries({ queryKey: ['tour-activity'] });
    },
  });
};

export const useValidateTourStop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      tourId: string;
      stopId: string;
      volumeLiters: number;
      qrCode?: string;
      containerId?: string;
      latitude?: string;
      longitude?: string;
      notes?: string;
    }) => {
      const { tourId, stopId, ...body } = payload;
      return apiClient.post(`/api/tours/${tourId}/stops/${stopId}/validate`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
      queryClient.invalidateQueries({ queryKey: ['tour-activity'] });
    },
  });
};

export const useAnomalyTypes = () =>
  useQuery({
    queryKey: ['anomaly-types'],
    queryFn: async () => apiClient.get('/api/tours/anomaly-types'),
    staleTime: 5 * 60 * 1000,
  });

export const useReportAnomaly = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      tourId: string;
      anomalyTypeId: string;
      tourStopId?: string;
      comments?: string;
      photoUrl?: string;
      severity?: string;
    }) => {
      const { tourId, ...body } = payload;
      return apiClient.post(`/api/tours/${tourId}/anomalies`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-activity'] });
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
    },
  });
};

export const useTourActivity = (tourId?: string) =>
  useQuery({
    queryKey: ['tour-activity', tourId],
    queryFn: async () => apiClient.get(`/api/tours/${tourId}/activity`),
    enabled: Boolean(tourId),
    staleTime: 15_000,
  });
