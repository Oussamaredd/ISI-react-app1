import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';

const createMeasurementInput = (overrides: Record<string, unknown> = {}) => ({
  batchId: null,
  sensorDeviceId: null,
  containerId: 'container-1',
  deviceUid: 'sensor-001',
  measuredAt: new Date('2026-03-19T10:00:00.000Z'),
  fillLevelPercent: 50,
  temperatureC: null,
  batteryPercent: null,
  signalStrength: null,
  measurementQuality: 'valid',
  idempotencyKey: 'dup-key',
  traceparent: null,
  tracestate: null,
  receivedAt: new Date('2026-03-19T10:00:01.000Z'),
  rawPayload: {
    source: 'iot-ingestion-api',
  },
  ...overrides,
});

const createNormalizedEvent = (overrides: Record<string, unknown> = {}) => ({
  sourceEventId: 'event-1',
  batchId: null,
  deviceUid: 'sensor-001',
  sensorDeviceId: null,
  containerId: 'container-1',
  measuredAt: new Date('2026-03-19T10:00:00.000Z'),
  fillLevelPercent: 83,
  temperatureC: 24,
  batteryPercent: 77,
  signalStrength: -65,
  measurementQuality: 'valid',
  idempotencyKey: null,
  traceparent: null,
  tracestate: null,
  receivedAt: new Date('2026-03-19T10:00:01.000Z'),
  rawPayload: {
    source: 'iot-ingestion-api',
  },
  validationSummary: {
    schemaValidation: 'passed',
  },
  ...overrides,
});

const createLimitedSelectQuery = <TRow>(rows: TRow[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(rows),
    }),
  }),
});

const createAggregateSelectQuery = <TRow>(row?: TRow) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(typeof row === 'undefined' ? [] : [row]),
  }),
});

describe('IngestionRepository', () => {
  it('returns a newly staged event ref when insertion succeeds', async () => {
    const dbMock = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'event-created',
                deviceUid: 'sensor-001',
                idempotencyKey: 'dup-key',
              },
            ]),
          }),
        }),
      }),
    };

    const repository = new IngestionRepository(dbMock as any);
    const staged = await repository.stageMeasurements([createMeasurementInput()]);

    expect(staged).toEqual([
      {
        id: 'event-created',
        deviceUid: 'sensor-001',
        idempotencyKey: 'dup-key',
        newlyStaged: true,
      },
    ]);
  });

  it('reuses an existing staged event when the same idempotency key is received again', async () => {
    const dbMock = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'event-existing',
                deviceUid: 'sensor-001',
                idempotencyKey: 'dup-key',
              },
            ]),
          }),
        }),
      }),
    };

    const repository = new IngestionRepository(dbMock as any);
    const staged = await repository.stageMeasurements([createMeasurementInput()]);

    expect(staged).toEqual([
      {
        id: 'event-existing',
        deviceUid: 'sensor-001',
        idempotencyKey: 'dup-key',
        newlyStaged: false,
      },
    ]);
  });

  it('throws when a staged measurement conflict cannot be reconciled', async () => {
    const dbMock = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const repository = new IngestionRepository(dbMock as any);

    await expect(repository.stageMeasurements([createMeasurementInput()])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lists runnable events in received order', async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit,
            }),
          }),
        }),
      }),
    };

    const repository = new IngestionRepository(dbMock as any);
    const runnableEventIds = await repository.listRunnableEventIds(2);

    expect(runnableEventIds).toEqual(['event-1', 'event-2']);
    expect(limit).toHaveBeenCalledWith(2);
  });

  it('recovers stale processing leases', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const dbMock = {
      update: vi.fn().mockReturnValue({ set }),
    };

    const repository = new IngestionRepository(dbMock as any);
    const staleThreshold = new Date('2026-03-19T09:50:00.000Z');

    await repository.recoverStuckProcessing(staleThreshold);

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        processingStatus: 'retry',
        lastError: 'Recovered stale processing lease.',
      }),
    );
    expect(where).toHaveBeenCalledTimes(1);
  });

  it('claims runnable events for processing', async () => {
    const dbMock = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'event-1',
                batchId: 'batch-1',
                deviceUid: 'sensor-001',
                sensorDeviceId: 'sensor-1',
                containerId: 'container-1',
                idempotencyKey: 'key-1',
                measuredAt: new Date('2026-03-19T10:00:00.000Z'),
                fillLevelPercent: 63,
                temperatureC: 21,
                batteryPercent: 85,
                signalStrength: -70,
                measurementQuality: 'valid',
                processingStatus: 'processing',
                attemptCount: 2,
                rawPayload: {
                  source: 'iot-ingestion-api',
                },
                receivedAt: new Date('2026-03-19T10:00:01.000Z'),
              },
            ]),
          }),
        }),
      }),
    };

    const repository = new IngestionRepository(dbMock as any);
    const claimedEvent = await repository.claimEventForProcessing('event-1');

    expect(claimedEvent).toEqual(
      expect.objectContaining({
        id: 'event-1',
        processingStatus: 'processing',
        rawPayload: {
          source: 'iot-ingestion-api',
        },
      }),
    );
  });

  it('returns null when an event can no longer be claimed', async () => {
    const dbMock = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const repository = new IngestionRepository(dbMock as any);

    await expect(repository.claimEventForProcessing('event-1')).resolves.toBeNull();
  });

  it('marks rejected events with normalized payload metadata', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const dbMock = {
      update: vi.fn().mockReturnValue({ set }),
    };

    const repository = new IngestionRepository(dbMock as any);
    await repository.markRejected('event-1', 'invalid payload', {
      sourceEventId: 'event-1',
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        processingStatus: 'rejected',
        rejectionReason: 'invalid payload',
        normalizedPayload: {
          sourceEventId: 'event-1',
        },
      }),
    );
  });

  it('marks retryable failures before the retry budget is exhausted', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const dbMock = {
      update: vi.fn().mockReturnValue({ set }),
    };

    const repository = new IngestionRepository(dbMock as any);
    await repository.markRetryOrFailed(
      'event-1',
      2,
      'temporary failure',
      new Date('2026-03-19T10:05:00.000Z'),
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        processingStatus: 'retry',
        lastError: 'temporary failure',
        failedAt: null,
      }),
    );
  });

  it('marks events as failed after the retry budget is exhausted', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const dbMock = {
      update: vi.fn().mockReturnValue({ set }),
    };

    const repository = new IngestionRepository(dbMock as any);
    await repository.markRetryOrFailed(
      'event-1',
      3,
      'permanent failure',
      new Date('2026-03-19T10:05:00.000Z'),
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        processingStatus: 'failed',
        lastError: 'permanent failure',
        failedAt: expect.any(Date),
      }),
    );
  });

  it('persists validated events and enqueues a downstream delivery', async () => {
    const sensorUpdateWhere = vi.fn().mockResolvedValue(undefined);
    const ingestionUpdateWhere = vi.fn().mockResolvedValue(undefined);

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    warningThreshold: 80,
                    criticalThreshold: 95,
                  },
                ]),
              }),
            }),
          }),
        }),
      insert: vi
        .fn()
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'sensor-1',
                deviceUid: 'sensor-001',
                containerId: 'container-1',
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'validated-1',
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'delivery-1',
              },
            ]),
          }),
        }),
      update: vi
        .fn()
        .mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: sensorUpdateWhere,
          }),
        })
        .mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: ingestionUpdateWhere,
          }),
        }),
    };

    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const repository = new IngestionRepository(dbMock as any);
    const result = await repository.persistValidatedEvent(createNormalizedEvent() as any);

    expect(result).toEqual({
      validatedEventId: 'validated-1',
      deliveryIds: ['delivery-1'],
    });
    expect(ingestionUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it('aggregates ingestion health counters and oldest pending age', async () => {
    const now = new Date('2026-03-19T10:00:00.000Z');
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createAggregateSelectQuery({ value: 2 }))
        .mockReturnValueOnce(createAggregateSelectQuery({ value: 1 }))
        .mockReturnValueOnce(createAggregateSelectQuery({ value: 3 }))
        .mockReturnValueOnce(createAggregateSelectQuery({ value: 4 }))
        .mockReturnValueOnce(createAggregateSelectQuery({ value: 5 }))
        .mockReturnValueOnce(createAggregateSelectQuery({ value: 9 }))
        .mockReturnValueOnce(
          createAggregateSelectQuery({
            value: new Date('2026-03-19T09:59:55.000Z'),
          }),
        ),
    };

    const repository = new IngestionRepository(dbMock as any);
    const healthStats = await repository.getHealthStats();

    expect(healthStats).toEqual({
      pendingCount: 2,
      retryCount: 1,
      processingCount: 3,
      failedCount: 4,
      rejectedCount: 5,
      validatedLastHour: 9,
      oldestPendingAgeMs: 5000,
    });

    dateNowSpy.mockRestore();
  });

  it('defaults health counters when aggregate queries return no rows', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createAggregateSelectQuery())
        .mockReturnValueOnce(createAggregateSelectQuery())
        .mockReturnValueOnce(createAggregateSelectQuery())
        .mockReturnValueOnce(createAggregateSelectQuery())
        .mockReturnValueOnce(createAggregateSelectQuery())
        .mockReturnValueOnce(createAggregateSelectQuery())
        .mockReturnValueOnce(createAggregateSelectQuery()),
    };

    const repository = new IngestionRepository(dbMock as any);
    const healthStats = await repository.getHealthStats();

    expect(healthStats).toEqual({
      pendingCount: 0,
      retryCount: 0,
      processingCount: 0,
      failedCount: 0,
      rejectedCount: 0,
      validatedLastHour: 0,
      oldestPendingAgeMs: null,
    });
  });

  it('reuses an existing sensor by device uid when persisting validated events', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createLimitedSelectQuery([
            {
              id: 'sensor-1',
              deviceUid: 'sensor-001',
              containerId: 'container-1',
            },
          ]),
        ),
    };

    const repository = new IngestionRepository({} as any);
    const sensorContext = await (repository as any).resolveSensorContext(
      tx,
      createNormalizedEvent({
        containerId: null,
      }),
    );

    expect(sensorContext).toEqual({
      id: 'sensor-1',
      deviceUid: 'sensor-001',
      containerId: 'container-1',
    });
  });

  it('rejects unknown sensor ids during sensor resolution', async () => {
    const tx = {
      select: vi.fn().mockReturnValueOnce(createLimitedSelectQuery([])),
    };

    const repository = new IngestionRepository({} as any);

    await expect(
      (repository as any).resolveSensorContext(
        tx,
        createNormalizedEvent({
          sensorDeviceId: 'sensor-1',
        }),
      ),
    ).rejects.toThrow('Unknown sensorDeviceId provided.');
  });

  it('rejects mismatched sensor id and device uid pairs', async () => {
    const tx = {
      select: vi.fn().mockReturnValueOnce(
        createLimitedSelectQuery([
          {
            id: 'sensor-1',
            deviceUid: 'sensor-999',
            containerId: 'container-1',
          },
        ]),
      ),
    };

    const repository = new IngestionRepository({} as any);

    await expect(
      (repository as any).resolveSensorContext(
        tx,
        createNormalizedEvent({
          sensorDeviceId: 'sensor-1',
        }),
      ),
    ).rejects.toThrow('sensorDeviceId does not match deviceUid.');
  });

  it('rejects conflicting sensor id and device uid lookups', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createLimitedSelectQuery([
            {
              id: 'sensor-1',
              deviceUid: 'sensor-001',
              containerId: 'container-1',
            },
          ]),
        )
        .mockReturnValueOnce(
          createLimitedSelectQuery([
            {
              id: 'sensor-2',
              deviceUid: 'sensor-001',
              containerId: 'container-1',
            },
          ]),
        ),
    };

    const repository = new IngestionRepository({} as any);

    await expect(
      (repository as any).resolveSensorContext(
        tx,
        createNormalizedEvent({
          sensorDeviceId: 'sensor-1',
        }),
      ),
    ).rejects.toThrow('deviceUid resolves to a different sensorDeviceId.');
  });

  it('rejects container mismatches against registered sensors', async () => {
    const tx = {
      select: vi.fn().mockReturnValueOnce(
        createLimitedSelectQuery([
          {
            id: 'sensor-1',
            deviceUid: 'sensor-001',
            containerId: 'container-registered',
          },
        ]),
      ),
    };

    const repository = new IngestionRepository({} as any);

    await expect(
      (repository as any).resolveSensorContext(
        tx,
        createNormalizedEvent({
          containerId: 'container-requested',
        }),
      ),
    ).rejects.toThrow('containerId does not match the registered sensor container.');
  });

  it('throws when sensor creation does not return a row', async () => {
    const tx = {
      select: vi.fn().mockReturnValueOnce(createLimitedSelectQuery([])),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const repository = new IngestionRepository({} as any);

    await expect((repository as any).resolveSensorContext(tx, createNormalizedEvent())).rejects.toThrow(
      'Failed to create sensor device during ingestion processing.',
    );
  });

  it('falls back to default thresholds when container type thresholds are missing', async () => {
    const tx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };

    const repository = new IngestionRepository({} as any);
    const thresholds = await (repository as any).loadThresholds(tx, 'container-1');

    expect(thresholds).toEqual({
      warningThreshold: 80,
      criticalThreshold: 95,
    });
  });
});
