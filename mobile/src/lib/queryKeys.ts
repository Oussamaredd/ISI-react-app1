export const queryKeys = {
  apiHealthReady: ["api-health-ready"] as const,
  citizenProfile: ["citizen-profile"] as const,
  citizenChallenges: ["citizen-challenges"] as const,
  citizenHistoryBase: ["citizen-history"] as const,
  citizenHistory: (page: number, pageSize: number) =>
    ["citizen-history", page, pageSize] as const,
  containers: (status?: string) => ["containers", status ?? "all"] as const,
  containerLookup: (status: string | undefined, search: string) =>
    ["containers", status ?? "all", "search", search] as const,
  agentTour: ["agent-tour"] as const,
  agentTourActivity: (tourId?: string) =>
    ["agent-tour-activity", tourId ?? "none"] as const,
  agentAnomalyTypes: ["agent-anomaly-types"] as const,
  planningDashboard: ["planning-dashboard"] as const,
  planningReportHistory: ["planning-report-history"] as const,
  notificationPermission: ["notification-permission"] as const
};
