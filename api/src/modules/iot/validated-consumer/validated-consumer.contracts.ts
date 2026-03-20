export const VALIDATED_EVENT_TIMESERIES_CONSUMER = 'timeseries_projection';
export const VALIDATED_EVENT_CONSUMER_MAX_RETRIES = 3;
export const VALIDATED_EVENT_CONSUMER_RECOVERY_INTERVAL_MS = 1_000;
export const VALIDATED_EVENT_CONSUMER_STALE_LEASE_WINDOW_MS = 5 * 60 * 1000;

export type ValidatedEventConsumerStatus =
  | 'pending'
  | 'processing'
  | 'retry'
  | 'failed'
  | 'completed';

export type ClaimedValidatedEventDelivery = {
  id: string;
  validatedEventId: string;
  consumerName: string;
  traceparent: string | null;
  tracestate: string | null;
  attemptCount: number;
  measuredAt: Date;
  sensorDeviceId: string | null;
  containerId: string | null;
  fillLevelPercent: number;
  temperatureC: number | null;
  batteryPercent: number | null;
  signalStrength: number | null;
  measurementQuality: string;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  normalizedPayload: Record<string, unknown>;
  emittedAt: Date;
};

export type ValidatedEventConsumerHealthStats = {
  pendingCount: number;
  retryCount: number;
  processingCount: number;
  failedCount: number;
  completedLastHour: number;
  oldestPendingAgeMs: number | null;
};
