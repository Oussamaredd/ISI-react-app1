import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ToursRepository } from '../modules/collections/tours.repository.js';

const createTourSelectionChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    leftJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

const createStopSelectionChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

const createLimitSelectionChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(rows),
    }),
  }),
});

const createJoinedLimitSelectionChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

const createOrderedLimitSelectionChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

describe('ToursRepository invariants', () => {
  it('returns the actionable upcoming tour instead of a completed historical route', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createTourSelectionChain([
            {
              id: 'tour-complete',
              name: 'Finished round',
              status: 'completed',
              scheduledFor: new Date('2030-03-01T08:00:00.000Z'),
              zoneId: 'zone-1',
              zoneName: 'Downtown',
              updatedAt: new Date('2030-03-01T10:00:00.000Z'),
            },
            {
              id: 'tour-next',
              name: 'Upcoming round',
              status: 'planned',
              scheduledFor: new Date('2030-03-03T08:00:00.000Z'),
              zoneId: 'zone-1',
              zoneName: 'Downtown',
              updatedAt: new Date('2030-03-02T06:00:00.000Z'),
            },
          ]),
        )
        .mockReturnValueOnce(
          createStopSelectionChain([
            {
              id: 'stop-1',
              stopOrder: 1,
              status: 'pending',
              eta: new Date('2030-03-03T08:00:00.000Z'),
              completedAt: null,
              containerId: 'container-1',
              containerCode: 'CTR-001',
              containerLabel: 'Main Square',
              latitude: '36.81',
              longitude: '10.19',
            },
          ]),
        )
        .mockReturnValueOnce(createLimitSelectionChain([])),
    };

    const repository = new ToursRepository(dbMock as any);

    const result = await repository.getAgentTour('agent-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'tour-next',
        name: 'Upcoming round',
        routeSummary: expect.objectContaining({
          totalStops: 1,
          completedStops: 0,
          remainingStops: 1,
        }),
      }),
    );
  });

  it('prefers a current planned tour over a legacy in-progress record that never captured a start time', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createTourSelectionChain([
            {
              id: 'tour-legacy-active',
              name: 'Legacy downtown round',
              status: 'in_progress',
              scheduledFor: new Date('2030-03-01T08:00:00.000Z'),
              startedAt: null,
              zoneId: 'zone-1',
              zoneName: 'Paris 1er - Louvre',
              updatedAt: new Date('2030-03-01T08:30:00.000Z'),
            },
            {
              id: 'tour-current',
              name: 'Paris 1er Morning Round',
              status: 'planned',
              scheduledFor: new Date('2030-03-30T08:00:00.000Z'),
              startedAt: null,
              zoneId: 'zone-1',
              zoneName: 'Paris 1er - Louvre',
              updatedAt: new Date('2030-03-30T06:00:00.000Z'),
            },
          ]),
        )
        .mockReturnValueOnce(
          createStopSelectionChain([
            {
              id: 'stop-1',
              stopOrder: 1,
              status: 'pending',
              eta: new Date('2030-03-30T08:00:00.000Z'),
              completedAt: null,
              containerId: 'container-1',
              containerCode: 'CTR-1002',
              containerLabel: '1 PLACE DU LOUVRE - Recyclables',
              latitude: '48.8608',
              longitude: '2.3376',
            },
          ]),
        )
        .mockReturnValueOnce(createLimitSelectionChain([])),
    };

    const repository = new ToursRepository(dbMock as any);

    const result = await repository.getAgentTour('agent-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'tour-current',
        name: 'Paris 1er Morning Round',
      }),
    );
  });

  it('returns the most recently started in-progress tour when multiple active runs exist', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createTourSelectionChain([
            {
              id: 'tour-old-active',
              name: 'Older run',
              status: 'in_progress',
              scheduledFor: new Date('2026-03-29T08:00:00.000Z'),
              startedAt: new Date('2026-03-29T08:15:00.000Z'),
              zoneId: 'zone-1',
              zoneName: 'Paris 1er - Louvre',
              updatedAt: new Date('2026-03-29T09:00:00.000Z'),
            },
            {
              id: 'tour-new-active',
              name: 'Current run',
              status: 'in_progress',
              scheduledFor: new Date('2026-03-30T08:00:00.000Z'),
              startedAt: new Date('2026-03-30T08:10:00.000Z'),
              zoneId: 'zone-1',
              zoneName: 'Paris 1er - Louvre',
              updatedAt: new Date('2026-03-30T08:20:00.000Z'),
            },
          ]),
        )
        .mockReturnValueOnce(
          createStopSelectionChain([
            {
              id: 'stop-1',
              stopOrder: 1,
              status: 'active',
              eta: new Date('2026-03-30T08:20:00.000Z'),
              completedAt: null,
              containerId: 'container-1',
              containerCode: 'CTR-1002',
              containerLabel: '1 PLACE DU LOUVRE - Recyclables',
              latitude: '48.8608',
              longitude: '2.3376',
            },
          ]),
        )
        .mockReturnValueOnce(createLimitSelectionChain([])),
    };

    const repository = new ToursRepository(dbMock as any);

    const result = await repository.getAgentTour('agent-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'tour-new-active',
        name: 'Current run',
      }),
    );
  });

  it('treats repeated validation of a completed stop as idempotent', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createLimitSelectionChain([
            {
              id: 'tour-1',
              status: 'in_progress',
              assignedAgentId: 'agent-1',
            },
          ]),
        )
        .mockReturnValueOnce(
          createJoinedLimitSelectionChain([
            {
              id: 'stop-1',
              tourId: 'tour-1',
              stopOrder: 1,
              status: 'completed',
              containerId: 'container-1',
              containerCode: 'CTR-001',
            },
          ]),
        )
        .mockReturnValueOnce(createOrderedLimitSelectionChain([{ id: 'stop-2' }])),
      insert: vi.fn(),
      update: vi.fn(),
    };
    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new ToursRepository(dbMock as any);

    const result = await repository.validateStop('tour-1', 'stop-1', 'agent-1', {
      volumeLiters: 90,
    });

    expect(result).toEqual({
      event: null,
      validatedStopId: 'stop-1',
      nextStopId: 'stop-2',
      alreadyValidated: true,
    });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejects validation requests for stops that are not active', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createLimitSelectionChain([
            {
              id: 'tour-1',
              status: 'in_progress',
              assignedAgentId: 'agent-1',
            },
          ]),
        )
        .mockReturnValueOnce(
          createJoinedLimitSelectionChain([
            {
              id: 'stop-1',
              tourId: 'tour-1',
              stopOrder: 1,
              status: 'pending',
              containerId: 'container-1',
              containerCode: 'CTR-001',
            },
          ]),
        ),
      insert: vi.fn(),
      update: vi.fn(),
    };
    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new ToursRepository(dbMock as any);

    await expect(
      repository.validateStop('tour-1', 'stop-1', 'agent-1', {
        volumeLiters: 50,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('stamps startedAt when a planned tour is started for the first time', async () => {
    const updateTourSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'tour-1',
            status: 'in_progress',
            startedAt: new Date('2026-03-03T08:00:00.000Z'),
          },
        ]),
      }),
    });

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createLimitSelectionChain([
            {
              id: 'tour-1',
              status: 'planned',
              assignedAgentId: 'agent-1',
              startedAt: null,
            },
          ]),
        )
        .mockReturnValueOnce(createOrderedLimitSelectionChain([]))
        .mockReturnValueOnce(createOrderedLimitSelectionChain([{ id: 'stop-1' }])),
      update: vi
        .fn()
        .mockReturnValueOnce({
          set: updateTourSet,
        })
        .mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new ToursRepository(dbMock as any);
    const result = await repository.startTour('tour-1', 'agent-1');

    expect(updateTourSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'in_progress',
        startedAt: expect.any(Date),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'in_progress',
        firstActiveStopId: 'stop-1',
      }),
    );
  });
});

