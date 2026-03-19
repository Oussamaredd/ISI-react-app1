import { describe, expect, it, vi } from 'vitest';

import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';

describe('IngestionRepository', () => {
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
    const staged = await repository.stageMeasurements([
      {
        batchId: null,
        sensorDeviceId: null,
        containerId: null,
        deviceUid: 'sensor-001',
        measuredAt: new Date('2026-03-19T10:00:00.000Z'),
        fillLevelPercent: 50,
        temperatureC: null,
        batteryPercent: null,
        signalStrength: null,
        measurementQuality: 'valid',
        idempotencyKey: 'dup-key',
        receivedAt: new Date('2026-03-19T10:00:01.000Z'),
        rawPayload: {
          source: 'iot-ingestion-api',
        },
      },
    ]);

    expect(staged).toEqual([
      {
        id: 'event-existing',
        deviceUid: 'sensor-001',
        idempotencyKey: 'dup-key',
        newlyStaged: false,
      },
    ]);
  });

  it('persists validated events and preserves downstream measurement/container updates', async () => {
    const sensorUpdateWhere = vi.fn().mockResolvedValue(undefined);
    const containerUpdateWhere = vi.fn().mockResolvedValue(undefined);
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
                id: 101,
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
            where: containerUpdateWhere,
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
    const result = await repository.persistValidatedEvent({
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
      receivedAt: new Date('2026-03-19T10:00:01.000Z'),
      rawPayload: {
        source: 'iot-ingestion-api',
      },
      validationSummary: {
        schemaValidation: 'passed',
      },
    });

    expect(result).toEqual({
      measurementId: 101,
      validatedEventId: 'validated-1',
    });
    expect(containerUpdateWhere).toHaveBeenCalledTimes(1);
    expect(ingestionUpdateWhere).toHaveBeenCalledTimes(1);
  });
});
