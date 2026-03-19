import { describe, expect, it } from 'vitest';

import { BatchIngestResponseDto, IngestResponseDto, IngestionHealthDto } from '../modules/iot/ingestion/dto/ingestion-response.dto.js';
import * as ingestionExports from '../modules/iot/ingestion/index.js';
import {
  IngestionBusinessRuleError,
  IOT_PROCESSING_FUTURE_TOLERANCE_MS,
  IOT_PROCESSING_MAX_EVENT_AGE_MS,
  IOT_PROCESSING_MAX_RETRIES,
  IOT_PROCESSING_RECOVERY_INTERVAL_MS,
  IOT_PROCESSING_STALE_LEASE_WINDOW_MS,
} from '../modules/iot/ingestion/ingestion.contracts.js';
import { IngestionController } from '../modules/iot/ingestion/ingestion.controller.js';
import { IngestionModule } from '../modules/iot/ingestion/ingestion.module.js';
import { IngestionProcessorService } from '../modules/iot/ingestion/ingestion.processor.js';
import { InMemoryIngestionQueue } from '../modules/iot/ingestion/ingestion.queue.js';
import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';
import { IngestionService } from '../modules/iot/ingestion/ingestion.service.js';

describe('IoT ingestion support surface', () => {
  it('re-exports the ingestion module surface through the barrel file', () => {
    expect(ingestionExports.IngestionController).toBe(IngestionController);
    expect(ingestionExports.IngestionModule).toBe(IngestionModule);
    expect(ingestionExports.IngestionProcessorService).toBe(IngestionProcessorService);
    expect(ingestionExports.IngestionRepository).toBe(IngestionRepository);
    expect(ingestionExports.IngestionService).toBe(IngestionService);
    expect(ingestionExports.InMemoryIngestionQueue).toBe(InMemoryIngestionQueue);
    expect(ingestionExports.IngestionBusinessRuleError).toBe(IngestionBusinessRuleError);
  });

  it('exposes stable ingestion processing constants and error semantics', () => {
    expect(IOT_PROCESSING_MAX_RETRIES).toBe(3);
    expect(IOT_PROCESSING_FUTURE_TOLERANCE_MS).toBe(5 * 60 * 1000);
    expect(IOT_PROCESSING_MAX_EVENT_AGE_MS).toBe(180 * 24 * 60 * 60 * 1000);
    expect(IOT_PROCESSING_RECOVERY_INTERVAL_MS).toBe(1_000);
    expect(IOT_PROCESSING_STALE_LEASE_WINDOW_MS).toBe(5 * 60 * 1000);

    const error = new IngestionBusinessRuleError('measurement rejected');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('IngestionBusinessRuleError');
    expect(error.message).toBe('measurement rejected');
  });

  it('keeps the response DTO shapes stable for accepted ingestion requests and health reporting', () => {
    const singleResponse = Object.assign(new IngestResponseDto(), {
      accepted: 1,
      processing: true,
      messageId: 'event-1',
    });
    const batchResponse = Object.assign(new BatchIngestResponseDto(), {
      accepted: 2,
      processing: true,
      batchId: 'batch-1',
    });
    const healthResponse = Object.assign(new IngestionHealthDto(), {
      status: 'healthy' as const,
      queueEnabled: true,
      backpressureActive: false,
      pendingCount: 0,
      processedLastHour: 12,
      processing: {
        retryCount: 1,
        processingCount: 2,
        failedCount: 0,
        rejectedCount: 0,
        oldestPendingAgeMs: null,
      },
    });

    expect(singleResponse).toEqual({
      accepted: 1,
      processing: true,
      messageId: 'event-1',
    });
    expect(batchResponse).toEqual({
      accepted: 2,
      processing: true,
      batchId: 'batch-1',
    });
    expect(healthResponse.processing.processingCount).toBe(2);
  });
});
