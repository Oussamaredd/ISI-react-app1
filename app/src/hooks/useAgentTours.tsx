import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../services/api';

export const useAgentTour = () =>
  useQuery({
    queryKey: ['agent-tour'],
    queryFn: async () => apiClient.get('/api/tours/agent/me'),
    staleTime: 30_000,
  });

export const useStartAgentTour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tourId: string) => apiClient.post(`/api/tours/${tourId}/start`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
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
