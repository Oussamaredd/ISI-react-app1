import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IngestionProcessorService } from '../modules/iot/ingestion/ingestion.processor.js';
import { InMemoryIngestionQueue } from '../modules/iot/ingestion/ingestion.queue.js';
import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';
import { IngestionService } from '../modules/iot/ingestion/ingestion.service.js';

vi.mock('../config/iot-ingestion.js', () => ({
  DEFAULT_IOT_CONFIG: {
    IOT_INGESTION_ENABLED: true,
    IOT_MQTT_ENABLED: false,
    IOT_MQTT_TOPIC: 'ecotrack/measurements',
    IOT_QUEUE_CONCURRENCY: 4,
    IOT_QUEUE_BATCH_SIZE: 25,
    IOT_BACKPRESSURE_THRESHOLD: 100000,
    IOT_MAX_BATCH_SIZE: 1000,
  },
}));

describe('IngestionService', () => {
  let service: IngestionService;
  let queue: InMemoryIngestionQueue;
  let repository: IngestionRepository;
  let processorService: IngestionProcessorService;

  const iotConfig = {
    IOT_INGESTION_ENABLED: true,
    IOT_MQTT_ENABLED: false,
    IOT_MQTT_TOPIC: 'ecotrack/measurements',
    IOT_QUEUE_CONCURRENCY: 4,
    IOT_QUEUE_BATCH_SIZE: 25,
    IOT_BACKPRESSURE_THRESHOLD: 100000,
    IOT_MAX_BATCH_SIZE: 1000,
  };

  beforeEach(() => {
    queue = new InMemoryIngestionQueue();
    repository = {
      stageMeasurements: vi.fn().mockResolvedValue([
        {
          id: 'event-1',
          deviceUid: 'sensor-001',
          idempotencyKey: null,
          newlyStaged: true,
        },
      ]),
      getHealthStats: vi.fn().mockResolvedValue({
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        rejectedCount: 0,
        validatedLastHour: 3,
        oldestPendingAgeMs: null,
      }),
      recoverStuckProcessing: vi.fn().mockResolvedValue(undefined),
      listRunnableEventIds: vi.fn().mockResolvedValue([]),
    } as unknown as IngestionRepository;

    processorService = {
      processStagedEvent: vi.fn().mockResolvedValue({ status: 'validated' }),
    } as unknown as IngestionProcessorService;

    service = new IngestionService(
      {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'iotIngestion') {
            return iotConfig;
          }

          return undefined;
        }),
      } as any,
      repository,
      queue,
      processorService,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('stages and accepts a single measurement while keeping 202-compatible semantics', async () => {
    service.onModuleInit();

    const result = await service.ingestSingle({
      deviceUid: 'sensor-001',
      measuredAt: new Date().toISOString(),
      fillLevelPercent: 50,
      measurementQuality: 'valid',
    });

    expect(repository.stageMeasurements).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      accepted: 1,
      processing: true,
      messageId: 'event-1',
    });
  });

  it('accepts a batch and returns a generated batch id', async () => {
    vi.mocked(repository.stageMeasurements).mockResolvedValueOnce([
      {
        id: 'event-1',
        deviceUid: 'sensor-001',
        idempotencyKey: null,
        newlyStaged: true,
      },
      {
        id: 'event-2',
        deviceUid: 'sensor-002',
        idempotencyKey: null,
        newlyStaged: true,
      },
    ]);

    service.onModuleInit();

    const result = await service.ingestBatch([
      { deviceUid: 'sensor-001', measuredAt: new Date().toISOString(), fillLevelPercent: 50 },
      { deviceUid: 'sensor-002', measuredAt: new Date().toISOString(), fillLevelPercent: 60 },
    ]);

    expect(repository.stageMeasurements).toHaveBeenCalledTimes(1);
    expect(result.accepted).toBe(2);
    expect(result.processing).toBe(true);
    expect(result.batchId).toBeTruthy();
  });

  it('rejects an oversized batch before staging events', async () => {
    service.onModuleInit();

    await expect(
      service.ingestBatch(
        Array.from({ length: 1001 }, (_, index) => ({
          deviceUid: `sensor-${index}`,
          measuredAt: new Date().toISOString(),
          fillLevelPercent: 50,
        })),
      ),
    ).rejects.toThrow('Batch size exceeds maximum');

    expect(repository.stageMeasurements).not.toHaveBeenCalled();
  });

  it('reports processing counters through the health endpoint contract', async () => {
    vi.mocked(repository.getHealthStats).mockResolvedValueOnce({
      pendingCount: 2,
      retryCount: 1,
      processingCount: 1,
      failedCount: 0,
      rejectedCount: 3,
      validatedLastHour: 9,
      oldestPendingAgeMs: 1200,
    });

    service.onModuleInit();
    const health = await service.getHealth();

    expect(health).toEqual({
      status: 'degraded',
      queueEnabled: true,
      backpressureActive: false,
      pendingCount: 4,
      processedLastHour: 9,
      processing: {
        retryCount: 1,
        processingCount: 1,
        failedCount: 0,
        rejectedCount: 3,
        oldestPendingAgeMs: 1200,
      },
    });
  });
});
