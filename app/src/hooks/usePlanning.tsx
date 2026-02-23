import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../services/api';

export const usePlanningZones = () =>
  useQuery({
    queryKey: ['planning-zones'],
    queryFn: async () => apiClient.get('/api/planning/zones'),
    staleTime: 5 * 60 * 1000,
  });

export const usePlanningAgents = () =>
  useQuery({
    queryKey: ['planning-agents'],
    queryFn: async () => apiClient.get('/api/planning/agents'),
    staleTime: 60_000,
  });

export const useOptimizeTourPlan = () =>
  useMutation({
    mutationFn: async (payload: {
      zoneId: string;
      scheduledFor: string;
      fillThresholdPercent: number;
      manualContainerIds?: string[];
    }) => apiClient.post('/api/planning/optimize-tour', payload),
  });

export const useCreatePlannedTour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      zoneId: string;
      scheduledFor: string;
      assignedAgentId?: string;
      orderedContainerIds: string[];
    }) => apiClient.post('/api/planning/create-tour', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
      queryClient.invalidateQueries({ queryKey: ['planning-dashboard'] });
    },
  });
};

export const usePlanningDashboard = (enabled = true) =>
  useQuery({
    queryKey: ['planning-dashboard'],
    queryFn: async () => apiClient.get('/api/planning/dashboard'),
    enabled,
    staleTime: 30_000,
  });

export const useEmergencyCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { containerId: string; reason: string; assignedAgentId?: string }) =>
      apiClient.post('/api/planning/emergency-collection', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['agent-tour'] });
    },
  });
};

export const useGenerateManagerReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      periodStart: string;
      periodEnd: string;
      selectedKpis: string[];
      sendEmail?: boolean;
      emailTo?: string;
      format?: string;
    }) => apiClient.post('/api/planning/reports/generate', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-report-history'] });
    },
  });
};

export const usePlanningReportHistory = () =>
  useQuery({
    queryKey: ['planning-report-history'],
    queryFn: async () => apiClient.get('/api/planning/reports/history'),
    staleTime: 15_000,
  });

export const useRegenerateManagerReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => apiClient.post(`/api/planning/reports/${reportId}/regenerate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-report-history'] });
    },
  });
};
