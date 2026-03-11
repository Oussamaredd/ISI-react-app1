import { apiClient } from "@api/core/http";

export type AgentTourStop = {
  id: string;
  stopOrder: number;
  status: string;
  eta?: string | null;
  completedAt?: string | null;
  containerId: string;
  containerCode: string;
  containerLabel: string;
  latitude?: string | null;
  longitude?: string | null;
};

export type AgentTourActivityItem = {
  id: string;
  type: string;
  createdAt: string;
  details: unknown;
  actorDisplayName?: string | null;
};

export type AgentAnomalyType = {
  id: string;
  label: string;
  code?: string | null;
};

export type AgentTour = {
  id: string;
  name: string;
  status: string;
  zoneName?: string | null;
  scheduledFor?: string | null;
  routeSummary?: {
    totalStops: number;
    completedStops: number;
    remainingStops: number;
    completionPercent: number;
    totalDistanceKm: number;
    estimatedDurationMinutes: number;
    isOverdue: boolean;
  } | null;
  stops?: AgentTourStop[];
};

export type StartTourResult = {
  firstActiveStopId?: string | null;
};

export type ValidateTourStopPayload = {
  tourId: string;
  stopId: string;
  volumeLiters: number;
  qrCode?: string;
  containerId?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
};

export type ValidateTourStopResult = {
  validatedStopId: string;
  nextStopId: string | null;
  alreadyValidated?: boolean;
};

export type ReportTourAnomalyPayload = {
  tourId: string;
  anomalyTypeId: string;
  tourStopId?: string;
  comments?: string;
  photoUrl?: string;
  severity?: "low" | "medium" | "high" | "critical";
};

export type ReportTourAnomalyResult = {
  id: string;
  managerAlertTriggered: boolean;
  alertEventId: string | null;
  severity?: string | null;
  comments?: string | null;
};

export const toursApi = {
  getAssignedTour: () => apiClient.get<AgentTour | null>("/api/tours/agent/me"),
  startTour: (tourId: string) =>
    apiClient.post<StartTourResult>(`/api/tours/${tourId}/start`, {}),
  validateStop: ({ tourId, stopId, ...body }: ValidateTourStopPayload) =>
    apiClient.post<ValidateTourStopResult>(
      `/api/tours/${tourId}/stops/${stopId}/validate`,
      body
    ),
  getAnomalyTypes: () =>
    apiClient.get<{ anomalyTypes: AgentAnomalyType[] }>("/api/tours/anomaly-types"),
  reportAnomaly: ({ tourId, ...body }: ReportTourAnomalyPayload) =>
    apiClient.post<ReportTourAnomalyResult>(
      `/api/tours/${tourId}/anomalies`,
      body
    ),
  getTourActivity: (tourId: string) =>
    apiClient.get<{ activity: AgentTourActivityItem[] }>(`/api/tours/${tourId}/activity`)
};
