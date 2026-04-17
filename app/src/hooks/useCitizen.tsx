import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../services/api';
import type { CitizenReportType } from '../lib/citizenReports';

export const useCitizenProfile = (enabled = true) =>
  useQuery({
    queryKey: ['citizen-profile'],
    queryFn: async () => apiClient.get('/api/citizen/profile'),
    enabled,
    staleTime: 60_000,
  });

export const useCitizenHistory = (page = 1, pageSize = 10) =>
  useQuery({
    queryKey: ['citizen-history', page, pageSize],
    queryFn: async () => apiClient.get(`/api/citizen/history?page=${page}&pageSize=${pageSize}`),
    staleTime: 60_000,
  });

export const useCitizenChallenges = () =>
  useQuery({
    queryKey: ['citizen-challenges'],
    queryFn: async () => apiClient.get('/api/citizen/challenges'),
    staleTime: 30_000,
  });

export const useCreateCitizenReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      containerId: string;
      reportType: CitizenReportType;
      description?: string;
      latitude?: string;
      longitude?: string;
      photoUrl?: string;
    }) => apiClient.post('/api/citizen/reports', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-history'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-profile'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-challenges'] });
    },
  });
};

export const useEnrollInChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) =>
      apiClient.post(`/api/citizen/challenges/${challengeId}/enroll`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-challenges'] });
    },
  });
};

export const useUpdateChallengeProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, progressDelta }: { challengeId: string; progressDelta: number }) =>
      apiClient.post(`/api/citizen/challenges/${challengeId}/progress`, { progressDelta }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-profile'] });
    },
  });
};
