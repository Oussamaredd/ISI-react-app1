import { performance } from 'node:perf_hooks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IngestionProcessorService } from '../modules/iot/ingestion/ingestion.processor.js';
import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';
import { ValidatedConsumerService } from '../modules/iot/validated-consumer/validated-consumer.service.js';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const CONTAINER_ID = '550e8400-e29b-41d4-a716-446655440000';

const createClaimedEvent = (overrides: {
  id?: string;
  measuredAt?: Date;
  measurementQuality?: string;
  attemptCount?: number;
} = {}) => ({
  id: overrides.id ?? EVENT_ID,
  batchId: null,
  deviceUid: 'sensor-001',
  sensorDeviceId: null,
  containerId: CONTAINER_ID,
  idempotencyKey: null,
  measuredAt: overrides.measuredAt ?? new Date(Date.now() - 1000),
  fillLevelPercent: 55,
  temperatureC: 22,
  batteryPercent: 87,
  signalStrength: -80,
  measurementQuality: overrides.measurementQuality ?? 'valid',
  processingStatus: 'processing',
  attemptCount: overrides.attemptCount ?? 1,
  traceparent: null,
  tracestate: null,
  rawPayload: {
    source: 'iot-ingestion-api',
  },
  receivedAt: new Date(Date.now() - 2000),
});

describe('IngestionProcessorService', () => {
  let repository: IngestionRepository;
  let service: IngestionProcessorService;

  beforeEach(() => {
    repository = {
      claimEventForProcessing: vi.fn(),
      persistValidatedEvent: vi.fn().mockResolvedValue({
        validatedEventId: 'validated-1',
        deliveryIds: ['delivery-1'],
      }),
      markRejected: vi.fn().mockResolvedValue(undefined),
      markRetryOrFailed: vi.fn().mockResolvedValue(undefined),
    } as unknown as IngestionRepository;
    const validatedConsumerService = {
      enqueueValidatedDeliveryIds: vi.fn().mockResolvedValue(undefined),
    } as unknown as ValidatedConsumerService;

    service = new IngestionProcessorService(repository, validatedConsumerService);
  });

  it('normalizes and persists valid staged events', async () => {
    vi.mocked(repository.claimEventForProcessing).mockResolvedValueOnce(createClaimedEvent({}) as any);

    const result = await service.processStagedEvent(EVENT_ID);

    expect(result).toEqual({ status: 'validated' });
    expect(repository.persistValidatedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEventId: EVENT_ID,
        deviceUid: 'sensor-001',
        measurementQuality: 'valid',
        validationSummary: expect.objectContaining({
          schemaValidation: 'passed',
        }),
      }),
    );
    expect(repository.markRejected).not.toHaveBeenCalled();
  });

  it('skips missing staged events that were already claimed by another worker', async () => {
    vi.mocked(repository.claimEventForProcessing).mockResolvedValueOnce(null);

    const result = await service.processStagedEvent(EVENT_ID);

    expect(result).toEqual({ status: 'skipped' });
    expect(repository.persistValidatedEvent).not.toHaveBeenCalled();
    expect(repository.markRejected).not.toHaveBeenCalled();
    expect(repository.markRetryOrFailed).not.toHaveBeenCalled();
  });

  it('rejects invalid staged payloads before persistence', async () => {
    vi.mocked(repository.claimEventForProcessing).mockResolvedValueOnce(
      {
        ...createClaimedEvent({}),
        fillLevelPercent: 101,
      } as any,
    );

    const result = await service.processStagedEvent(EVENT_ID);

    expect(result).toEqual({ status: 'rejected' });
    expect(repository.markRejected).toHaveBeenCalledWith(
      EVENT_ID,
      expect.stringMatching(/less than or equal to 100/i),
      expect.objectContaining({
        sourceEventId: EVENT_ID,
      }),
    );
  });

  it('rejects measurements that arrive too far in the future', async () => {
    vi.mocked(repository.claimEventForProcessing).mockResolvedValueOnce(
      createClaimedEvent({
        measuredAt: new Date(Date.now() + 10 * 60 * 1000),
      }) as any,
    );

    const result = await service.processStagedEvent(EVENT_ID);

    expect(result).toEqual({ status: 'rejected' });
    expect(repository.markRejected).toHaveBeenCalledWith(
      EVENT_ID,
      'Measurement timestamp is too far in the future.',
      expect.objectContaining({
        sourceEventId: EVENT_ID,
      }),
    );
  });

  it('rejects measurements that are older than the processing retention window', async () => {
    vi.mocked(repository.claimEventForProcessing).mockResolvedValueOnce(
      createClaimedEvent({
        measuredAt: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000),
      }) as any,
    );

    const result = await service.processStagedEvent(EVENT_ID);

    expect(result).toEqual({ status: 'rejected' });
    expect(repository.markRejected).toHaveBeenCalledWith(
      EVENT_ID,
      'Measurement timestamp is too old to process.',
      expect.objectContaining({
        sourceEventId: EVENT_ID,
      }),
    );
  });

  it('rejects client-supplied rejected measurements without retrying them', async () => {
    vi.mocked(repository.claimEventForProcessing).mockResolvedValueOnce(
      createClaimedEvent({ measurementQuality: 'rejected' }) as any,
    );

    const result = await service.processStagedEvent(EVENT_ID);

    expect(result).toEqual({ status: 'rejected' });
    expect(repository.markRejected).toHaveBeenCalledWith(
      EVENT_ID,
      'Rejected measurements are not persisted by the processing worker.',
      expect.objectContaining({
        sourceEventId: EVENT_ID,
      }),
    );
    expect(repository.persistValidatedEvent).not.toHaveBeenCalled();
  });

  it('retries unexpected failures and escalates to failed after the retry budget', async () => {
    vi.mocked(repository.claimEventForProcessing).mockResolvedValueOnce(
      createClaimedEvent({ attemptCount: 3 }) as any,
    );
    vi.mocked(repository.persistValidatedEvent).mockRejectedValueOnce(new Error('database offline'));

    const result = await service.processStagedEvent(EVENT_ID);

    expect(result).toEqual({ status: 'failed' });
    expect(repository.markRetryOrFailed).toHaveBeenCalledWith(
      EVENT_ID,
      3,
      'database offline',
      expect.any(Date),
    );
  });

  it('keeps processing overhead under the latency budget for in-memory mocked processing', async () => {
    const claimedEvents = Array.from({ length: 50 }, (_, index) =>
      createClaimedEvent({
        id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
      }),
    );

    let claimIndex = 0;
    vi.mocked(repository.claimEventForProcessing).mockImplementation(
      async () => claimedEvents[claimIndex++] as any,
    );

    const startedAt = performance.now();
    for (const event of claimedEvents) {
      const result = await service.processStagedEvent(event.id);
      expect(result.status).toBe('validated');
    }
    const durationMs = performance.now() - startedAt;

    expect(durationMs).toBeLessThan(100);
  });
});
