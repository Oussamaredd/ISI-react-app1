import { apiClient } from "@api/core/http";

export type PlanningDashboard = {
  ecoKpis?: {
    containers?: number;
    zones?: number;
    tours?: number;
  };
  thresholds?: {
    criticalFillPercent?: number;
  };
  criticalContainers?: {
    id: string;
    code?: string | null;
    label?: string | null;
    fillLevelPercent?: number | null;
    zoneName?: string | null;
  }[];
};

export type ManagerReportFormat = "pdf" | "csv";

export type ManagerReportHistoryRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  selectedKpis: string[];
  sendEmail: boolean;
  emailTo?: string | null;
  format?: string | null;
  status?: string | null;
  createdAt: string;
};

export type ManagerReportHistoryResponse = {
  reports: ManagerReportHistoryRow[];
};

export type GenerateManagerReportPayload = {
  periodStart: string;
  periodEnd: string;
  selectedKpis: string[];
  sendEmail?: boolean;
  emailTo?: string;
  format?: ManagerReportFormat;
};

export type ManagerReportMutationResult = ManagerReportHistoryRow & {
  deliveryError?: string | null;
};

export const planningApi = {
  getDashboard: () => apiClient.get<PlanningDashboard>("/api/planning/dashboard"),
  getReportHistory: () =>
    apiClient.get<ManagerReportHistoryResponse>("/api/planning/reports/history"),
  generateReport: (payload: GenerateManagerReportPayload) =>
    apiClient.post<ManagerReportMutationResult>("/api/planning/reports/generate", payload),
  regenerateReport: (reportId: string) =>
    apiClient.post<ManagerReportMutationResult>(
      `/api/planning/reports/${reportId}/regenerate`,
      {}
    )
};
