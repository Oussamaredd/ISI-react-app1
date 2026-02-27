import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PlanningRepository } from '../planning/planning.repository.js';

describe('PlanningRepository invariants', () => {
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

    vi.spyOn(repository, 'getReportById').mockResolvedValue(sourceReport as any);

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
});
