export class IngestResponseDto {
  accepted!: number;
  processing!: boolean;
  messageId!: string;
}

export class BatchIngestResponseDto {
  accepted!: number;
  processing!: boolean;
  batchId!: string;
}

export class IngestionHealthDto {
  status!: 'healthy' | 'degraded' | 'unhealthy';
  queueEnabled!: boolean;
  backpressureActive!: boolean;
  pendingCount!: number;
  processedLastHour!: number;
  processing!: {
    retryCount: number;
    processingCount: number;
    failedCount: number;
    rejectedCount: number;
    oldestPendingAgeMs: number | null;
  };
  consumer!: {
    retryCount: number;
    processingCount: number;
    failedCount: number;
    pendingCount: number;
    processedLastHour: number;
    oldestPendingAgeMs: number | null;
  };
}
