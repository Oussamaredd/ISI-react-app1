import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PlanningRepository } from '../planning/planning.repository.js';
import * as reportDeliveryUtils from '../planning/report-delivery.utils.js';

describe('PlanningRepository invariants', () => {
  it('defers containers already reserved on nearby tours for the selected schedule', async () => {
    const allCandidates = [
      {
        id: 'container-1',
        code: 'CTR-001',
        label: 'North Hub',
        fillLevelPercent: 92,
        status: 'available',
        latitude: '36.81',
        longitude: '10.19',
        zoneId: 'zone-1',
      },
      {
        id: 'container-2',
        code: 'CTR-002',
        label: 'Harbor Edge',
        fillLevelPercent: 85,
        status: 'available',
        latitude: '36.82',
        longitude: '10.20',
        zoneId: 'zone-1',
      },
    ];

    const selectCandidates = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(allCandidates),
      }),
    };
    const selectScheduledStops = {
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              containerId: 'container-1',
              tourStatus: 'planned',
            },
          ]),
        }),
      }),
    };

    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectCandidates)
        .mockReturnValueOnce(selectScheduledStops),
    };

    const repository = new PlanningRepository(dbMock as any);

    const result = await repository.optimizeTour({
      zoneId: 'zone-1',
      scheduledFor: '2026-03-02T15:00:00.000Z',
      fillThresholdPercent: 70,
    });

    expect(result.route).toEqual([
      expect.objectContaining({
        id: 'container-2',
      }),
    ]);
    expect(result.metrics).toEqual(
      expect.objectContaining({
        deferredForNearbyTours: 1,
      }),
    );
  });

  it('rejects planned tours when containers do not belong to selected zone', async () => {
    const tx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'container-1',
              zoneId: 'zone-a',
            },
          ]),
        }),
      }),
      insert: vi.fn(),
    };

    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new PlanningRepository(dbMock as any);

    await expect(
      repository.createPlannedTour(
        {
          name: 'Morning route',
          zoneId: 'zone-b',
          scheduledFor: new Date().toISOString(),
          orderedContainerIds: ['container-1'],
        },
        'manager-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('persists ordered stop ETAs when creating a planned tour', async () => {
    const insertedStopRows: Array<Record<string, unknown>> = [];

    const tx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'container-1',
              zoneId: 'zone-1',
              latitude: '36.8100',
              longitude: '10.1900',
            },
            {
              id: 'container-2',
              zoneId: 'zone-1',
              latitude: '36.8200',
              longitude: '10.2000',
            },
          ]),
        }),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
          if (Array.isArray(payload)) {
            insertedStopRows.push(...payload);
            return Promise.resolve(undefined);
          }

          if ("name" in payload) {
            return {
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'tour-1',
                  assignedAgentId: null,
                  ...payload,
                },
              ]),
            };
          }

          return Promise.resolve(undefined);
        }),
      })),
    };

    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new PlanningRepository(dbMock as any);

    await repository.createPlannedTour(
      {
        name: 'Morning route',
        zoneId: 'zone-1',
        scheduledFor: '2026-03-02T08:00:00.000Z',
        orderedContainerIds: ['container-1', 'container-2'],
      },
      'manager-1',
    );

    expect(insertedStopRows).toHaveLength(2);
    expect(insertedStopRows[0]?.['eta']).toBeInstanceOf(Date);
    expect(insertedStopRows[1]?.['eta']).toBeInstanceOf(Date);
    expect(
      (insertedStopRows[1]?.['eta'] as Date).getTime(),
    ).toBeGreaterThan((insertedStopRows[0]?.['eta'] as Date).getTime());
  });

  it('recomputes report artifact when regenerating a report', async () => {
    const selectResponses: Array<Array<{ value: number }>> = [
      [{ value: 7 }],
      [{ value: 5 }],
      [{ value: 2 }],
    ];

    let reportInsertPayload: Record<string, unknown> | null = null;
    const insertValues = vi.fn((payload: Record<string, unknown>) => {
      if (!reportInsertPayload) {
        reportInsertPayload = payload;
        return {
          returning: vi.fn().mockResolvedValue([
            {
              id: 'report-new',
              ...payload,
            },
          ]),
        };
      }

      return Promise.resolve(undefined);
    });

    const dbMock = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(selectResponses.shift() ?? [{ value: 0 }]),
        }),
      })),
      insert: vi.fn().mockReturnValue({
        values: insertValues,
      }),
    };

    const repository = new PlanningRepository(dbMock as any);
    const sourceReport = {
      id: 'report-source',
      requestedByUserId: 'manager-1',
      periodStart: new Date('2026-02-01T00:00:00.000Z'),
      periodEnd: new Date('2026-02-28T23:59:59.999Z'),
      selectedKpis: ['tours', 'collections', 'anomalies'],
      format: 'pdf',
      status: 'generated',
      sendEmail: false,
      emailTo: null,
      fileContent: Buffer.from('stale-report').toString('base64'),
    };

    (repository as any).getReportById = vi.fn().mockResolvedValue(sourceReport);

    const regenerated = await repository.regenerateReport(sourceReport.id, 'manager-2');

    expect(dbMock.select).toHaveBeenCalledTimes(3);
    expect(reportInsertPayload).toEqual(
      expect.objectContaining({
        requestedByUserId: 'manager-2',
        periodStart: sourceReport.periodStart,
        periodEnd: sourceReport.periodEnd,
        selectedKpis: sourceReport.selectedKpis,
        format: sourceReport.format,
      }),
    );
    expect(reportInsertPayload?.['fileContent']).not.toBe(sourceReport.fileContent);
    expect(regenerated).toEqual(
      expect.objectContaining({
        id: 'report-new',
      }),
    );
  });

  it('updates report status after delivering email-enabled exports', async () => {
    const metricRows = [{ value: 3 }];
    let insertCallCount = 0;

    const createdReport = {
      id: 'report-email',
      requestedByUserId: 'manager-1',
      periodStart: new Date('2026-02-01T00:00:00.000Z'),
      periodEnd: new Date('2026-02-28T23:59:59.000Z'),
      selectedKpis: ['tours'],
      format: 'pdf',
      status: 'generated',
      sendEmail: true,
      emailTo: 'ops@example.com',
      fileContent: Buffer.from('report').toString('base64'),
      createdAt: new Date('2026-03-02T12:00:00.000Z'),
      updatedAt: new Date('2026-03-02T12:00:00.000Z'),
    };
    const updatedReport = {
      ...createdReport,
      status: 'email_delivered',
      updatedAt: new Date('2026-03-02T12:00:05.000Z'),
    };

    const dbMock = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(metricRows),
        }),
      })),
      insert: vi.fn().mockReturnValue({
        values: vi.fn(() => {
          insertCallCount += 1;

          if (insertCallCount === 1) {
            return {
              returning: vi.fn().mockResolvedValue([createdReport]),
            };
          }

          return Promise.resolve(undefined);
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedReport]),
          }),
        }),
      }),
    };

    const repository = new PlanningRepository(dbMock as any);
    const deliverSpy = vi.spyOn(reportDeliveryUtils, 'deliverReportByEmail').mockResolvedValue({
      channel: 'filesystem_outbox',
      deliveredAt: '2026-03-02T12:00:05.000Z',
      outboxPath: '.runtime/report-outbox/20260302-report-email.eml',
      recipient: 'ops@example.com',
      status: 'delivered',
    });

    const result = await repository.generateReport(
      {
        periodStart: createdReport.periodStart.toISOString(),
        periodEnd: createdReport.periodEnd.toISOString(),
        selectedKpis: ['tours'],
        sendEmail: true,
        emailTo: 'OPS@EXAMPLE.COM',
      },
      'manager-1',
    );

    expect(deliverSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'report-email',
        emailTo: 'ops@example.com',
      }),
    );
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ status: 'email_delivered' }));
  });
});
