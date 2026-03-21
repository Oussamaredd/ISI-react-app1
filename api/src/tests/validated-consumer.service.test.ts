import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidatedConsumerService } from '../modules/iot/validated-consumer/validated-consumer.service.js';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('ValidatedConsumerService', () => {
  const setIntervalSpy = vi.spyOn(global, 'setInterval');
  const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

  const createSubject = (configOverrides: Partial<Record<string, unknown>> = {}) => {
    const config = {
      IOT_INGESTION_ENABLED: true,
      IOT_VALIDATED_CONSUMER_CONCURRENCY: 4,
      IOT_VALIDATED_CONSUMER_BATCH_SIZE: 2,
      ...configOverrides,
    };
    const configServiceMock = {
      get: vi.fn().mockReturnValue(config),
    };
    const repositoryMock = {
      recoverStuckProcessing: vi.fn().mockResolvedValue(undefined),
      listRunnableDeliveryIds: vi.fn().mockResolvedValue([]),
      getHealthStats: vi.fn().mockResolvedValue({
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        completedLastHour: 3,
        oldestPendingAgeMs: null,
      }),
    };
    const queueMock = {
      startProcessor: vi.fn(),
      stopProcessor: vi.fn(),
      enqueue: vi.fn().mockResolvedValue(undefined),
    };
    const processorMock = {
      processDelivery: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ValidatedConsumerService(
      configServiceMock as any,
      repositoryMock as any,
      queueMock as any,
      processorMock as any,
    );

    return {
      service,
      repositoryMock,
      queueMock,
      processorMock,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setIntervalSpy.mockReturnValue({} as NodeJS.Timeout);
    clearIntervalSpy.mockImplementation(() => undefined as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the queue processor and schedules recovery when ingestion is enabled', async () => {
    const { service, repositoryMock, queueMock } = createSubject();
    repositoryMock.listRunnableDeliveryIds.mockResolvedValueOnce(['delivery-1', 'delivery-2']);

    service.onModuleInit();
    await flushPromises();

    expect(queueMock.startProcessor).toHaveBeenCalledWith(expect.any(Function), {
      concurrency: 4,
      maxBatchDeliveries: 2,
    });
    expect(repositoryMock.recoverStuckProcessing).toHaveBeenCalled();
    expect(repositoryMock.listRunnableDeliveryIds).toHaveBeenCalledWith('timeseries_projection', 8);
    expect(queueMock.enqueue).toHaveBeenCalledWith(['delivery-1', 'delivery-2']);

    service.onModuleDestroy();
    expect(queueMock.stopProcessor).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('skips processor startup when ingestion is disabled', () => {
    const { service, queueMock } = createSubject({
      IOT_INGESTION_ENABLED: false,
    });

    service.onModuleInit();

    expect(queueMock.startProcessor).not.toHaveBeenCalled();
  });

  it('deduplicates delivery ids across enqueue calls and clears failed enqueue attempts', async () => {
    const { service, queueMock } = createSubject();

    service.onModuleInit();
    await flushPromises();
    queueMock.enqueue.mockClear();

    await service.enqueueValidatedDeliveryIds(['delivery-1']);
    await service.enqueueValidatedDeliveryIds(['delivery-1', 'delivery-2']);

    expect(queueMock.enqueue).toHaveBeenNthCalledWith(1, ['delivery-1']);
    expect(queueMock.enqueue).toHaveBeenNthCalledWith(2, ['delivery-2']);

    queueMock.enqueue.mockRejectedValueOnce(new Error('queue unavailable'));

    await expect(service.enqueueValidatedDeliveryIds(['delivery-3'])).rejects.toThrow('queue unavailable');
    expect((service as any).enqueuedDeliveryIds.has('delivery-3')).toBe(false);

    service.onModuleDestroy();
  });

  it('returns health diagnostics from the repository', async () => {
    const { service } = createSubject();

    await expect(service.getHealthSnapshot()).resolves.toEqual({
      pendingCount: 0,
      retryCount: 0,
      processingCount: 0,
      failedCount: 0,
      completedLastHour: 3,
      oldestPendingAgeMs: null,
    });
  });

  it('clears tracked ids even when downstream processing fails', async () => {
    const { service, processorMock } = createSubject();

    (service as any).enqueuedDeliveryIds.add('delivery-9');
    processorMock.processDelivery.mockRejectedValueOnce(new Error('processor failure'));

    await expect(
      (service as any).processJobs([
        {
          id: 'job-1',
          deliveryIds: ['delivery-9'],
          createdAt: new Date('2026-03-20T10:00:00.000Z'),
        },
      ]),
    ).rejects.toThrow('processor failure');

    expect((service as any).enqueuedDeliveryIds.has('delivery-9')).toBe(false);
  });
});
