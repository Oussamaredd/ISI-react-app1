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

export type ZoneContainerData = {
  id: string;
  code: string;
  label: string;
  status: string;
  fillLevelPercent: number;
  latitude?: string | null;
  longitude?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
};

export type AgentTourDataSource = 'none' | 'network' | 'cache';

const AGENT_TOUR_CACHE_KEY = 'ecotrack.agentTour.cache.v3';
const MAX_AGENT_TOUR_CACHE_AGE_MS = 15 * 60 * 1000;
const MAX_OVERDUE_AGENT_TOUR_CACHE_AGE_MS = 2 * 60 * 1000;
const TERMINAL_TOUR_STATUSES = new Set(['completed', 'cancelled', 'closed']);

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

const clearCachedEnvelope = (key: string) => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures; callers already handle missing cache gracefully.
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

const readCacheAgeMs = (cachedAt: string) => {
  const cachedAtMs = Date.parse(cachedAt);
  if (!Number.isFinite(cachedAtMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Date.now() - cachedAtMs);
};

const readCachedTourScheduledFor = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const scheduledFor = (data as Record<string, unknown>).scheduledFor;
  if (typeof scheduledFor !== 'string' && !(scheduledFor instanceof Date)) {
    return null;
  }

  const scheduledForMs = Date.parse(String(scheduledFor));
  return Number.isFinite(scheduledForMs) ? scheduledForMs : null;
};

const readCachedTourStatus = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const status = (data as Record<string, unknown>).status;
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
};

const isExpiredAgentTourCache = (cached: CachedEnvelope<unknown>) => {
  const cacheAgeMs = readCacheAgeMs(cached.cachedAt);
  if (cacheAgeMs > MAX_AGENT_TOUR_CACHE_AGE_MS) {
    return true;
  }

  const scheduledForMs = readCachedTourScheduledFor(cached.data);
  if (scheduledForMs == null) {
    return false;
  }

  const normalizedStatus = readCachedTourStatus(cached.data);
  if (TERMINAL_TOUR_STATUSES.has(normalizedStatus)) {
    return false;
  }

  return scheduledForMs < Date.now() && cacheAgeMs > MAX_OVERDUE_AGENT_TOUR_CACHE_AGE_MS;
};

const ZONE_CONTAINER_PAGE_SIZE = 50;

const fetchAllZoneContainers = async (zoneId: string) => {
  const items: ZoneContainerData[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = (await apiClient.get(
      `/api/containers?zoneId=${encodeURIComponent(zoneId)}&page=${page}&pageSize=${ZONE_CONTAINER_PAGE_SIZE}`,
    )) as {
      containers?: ZoneContainerData[];
      pagination?: { hasNext?: boolean };
    };

    items.push(...((response?.containers ?? []) as ZoneContainerData[]));
    hasNext = Boolean(response?.pagination?.hasNext);
    page += 1;
  }

  return items;
};

export const clearCachedAgentTour = () => {
  clearCachedEnvelope(AGENT_TOUR_CACHE_KEY);
};

const readReusableAgentTourCache = () => {
  const cached = readCachedEnvelope<unknown>(AGENT_TOUR_CACHE_KEY);
  if (!cached) {
    return null;
  }

  if (hasSeedFallbackRoute(cached.data) || isExpiredAgentTourCache(cached)) {
    clearCachedAgentTour();
    return null;
  }

  return cached;
};

export const useAgentTour = () =>
  {
    const queryClient = useQueryClient();
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

    const refetchFromServer = async (options?: { clearCache?: boolean }) => {
      if (options?.clearCache) {
        clearCachedAgentTour();
        queryClient.removeQueries({ queryKey: ['agent-tour'], exact: true });
        setDataSource('none');
      }

      return query.refetch();
    };

    return {
      ...query,
      dataSource,
      clearCachedTour: clearCachedAgentTour,
      refetchFromServer,
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

export const useZoneContainers = (zoneId?: string | null) =>
  useQuery({
    queryKey: ['zone-containers', zoneId],
    queryFn: async () => fetchAllZoneContainers(zoneId as string),
    enabled: Boolean(zoneId),
    staleTime: 60_000,
  });
