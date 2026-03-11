import { apiClient } from "@api/core/http";

export type ReadyHealthResponse = {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  database?: {
    status: string;
    latencyMs?: number;
    error?: string;
  };
};

export const healthApi = {
  ready: () => apiClient.get<ReadyHealthResponse>("/api/health/ready"),
  live: () => apiClient.get<ReadyHealthResponse>("/api/health/live")
};
