export const IOT_PROCESSING_MAX_RETRIES = 3;
export const IOT_PROCESSING_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
export const IOT_PROCESSING_MAX_EVENT_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export const IOT_PROCESSING_RECOVERY_INTERVAL_MS = 1_000;
export const IOT_PROCESSING_STALE_LEASE_WINDOW_MS = 5 * 60 * 1000;

export type IngestionProcessingStatus =
  | 'pending'
  | 'processing'
  | 'retry'
  | 'failed'
  | 'rejected'
  | 'validated';

export type StagedMeasurementInput = {
  batchId: string | null;
  sensorDeviceId: string | null;
  containerId: string | null;
  deviceUid: string;
  measuredAt: Date;
  fillLevelPercent: number;
  temperatureC: number | null;
  batteryPercent: number | null;
  signalStrength: number | null;
  measurementQuality: string;
  idempotencyKey: string | null;
  traceparent: string | null;
  tracestate: string | null;
  receivedAt: Date;
  rawPayload: Record<string, unknown>;
};

export type StagedMeasurementEventRef = {
  id: string;
  deviceUid: string;
  idempotencyKey: string | null;
  newlyStaged: boolean;
};

export type ClaimedIngestionEvent = {
  id: string;
  batchId: string | null;
  deviceUid: string;
  sensorDeviceId: string | null;
  containerId: string | null;
  idempotencyKey: string | null;
  measuredAt: Date;
  fillLevelPercent: number;
  temperatureC: number | null;
  batteryPercent: number | null;
  signalStrength: number | null;
  measurementQuality: string;
  processingStatus: IngestionProcessingStatus;
  attemptCount: number;
  traceparent: string | null;
  tracestate: string | null;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
};

export type NormalizedMeasurementEvent = {
  sourceEventId: string;
  batchId: string | null;
  deviceUid: string;
  sensorDeviceId: string | null;
  containerId: string | null;
  measuredAt: Date;
  fillLevelPercent: number;
  temperatureC: number | null;
  batteryPercent: number | null;
  signalStrength: number | null;
  measurementQuality: 'valid' | 'suspect';
  idempotencyKey: string | null;
  traceparent: string | null;
  tracestate: string | null;
  receivedAt: Date;
  rawPayload: Record<string, unknown>;
  validationSummary: Record<string, unknown>;
};

export type IngestionHealthStats = {
  pendingCount: number;
  retryCount: number;
  processingCount: number;
  failedCount: number;
  rejectedCount: number;
  validatedLastHour: number;
  oldestPendingAgeMs: number | null;
};

export class IngestionBusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestionBusinessRuleError';
  }
}
