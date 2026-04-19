import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PlanningRepository } from '../modules/routes/planning.repository.js';
import * as reportDeliveryUtils from '../modules/routes/report-delivery.utils.js';

describe('PlanningRepository invariants', () => {
  it('defers containers already reserved on nearby tours for the selected schedule', async () => {
    const selectZoneDepot = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'zone-1',
            label: 'North Depot',
            latitude: '36.8000',
            longitude: '10.1800',
          },
        ]),
      }),
    };
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
        .mockReturnValueOnce(selectZoneDepot)
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

  it('caps depot-anchored routes to four containers and reports both optimization stages', async () => {
    const selectZoneDepot = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'zone-1',
            label: 'Depot Paris 1er - Louvre',
            latitude: '48.863735',
            longitude: '2.338321',
          },
        ]),
      }),
    };
    const allCandidates = [
      {
        id: 'container-1',
        code: 'CTR-1001',
        label: '10 RUE DE L ECHELLE - Verre',
        fillLevelPercent: 10,
        status: 'available',
        latitude: '48.864360',
        longitude: '2.334760',
        zoneId: 'zone-1',
      },
      {
        id: 'container-2',
        code: 'CTR-1002',
        label: '17 RUE CROIX DES PETITS CHAMPS - Trilib',
        fillLevelPercent: 15,
        status: 'available',
        latitude: '48.863444',
        longitude: '2.339586',
        zoneId: 'zone-1',
      },
      {
        id: 'container-3',
        code: 'CTR-1003',
        label: 'ANGLE RUE DU BOULOI / RUE DU COLONEL DRIANT - Textile',
        fillLevelPercent: 20,
        status: 'available',
        latitude: '48.863402',
        longitude: '2.340617',
        zoneId: 'zone-1',
      },
      {
        id: 'container-4',
        code: 'OPS-DOWNTOWN-01',
        label: 'Paris 1er - Louvre - Operational General Mixed Waste 1',
        fillLevelPercent: 25,
        status: 'available',
        latitude: '48.864185',
        longitude: '2.337871',
        zoneId: 'zone-1',
      },
      {
        id: 'container-5',
        code: 'OPS-DOWNTOWN-02',
        label: 'Paris 1er - Louvre - Operational Glass 2',
        fillLevelPercent: 30,
        status: 'available',
        latitude: '48.864635',
        longitude: '2.337421',
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
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectZoneDepot)
        .mockReturnValueOnce(selectCandidates)
        .mockReturnValueOnce(selectScheduledStops),
    };

    const repository = new PlanningRepository(dbMock as any);

    const result = await repository.optimizeTour({
      zoneId: 'zone-1',
      scheduledFor: '2026-04-01T09:00:00.000Z',
      fillThresholdPercent: 0,
    });

    expect(result.route.map((item: any) => item.id)).toEqual([
      'container-4',
      'container-5',
      'container-2',
      'container-3',
    ]);
    expect(result.metrics).toEqual(
      expect.objectContaining({
        selectedContainerCount: 4,
        maxContainerCount: 4,
        algorithmsApplied: ['nearest_neighbor', 'two_opt'],
        optimizationTimedOut: false,
      }),
    );
  });

  it('rejects planned tours when more than four containers are provided', async () => {
    const tx = {
      select: vi.fn(),
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
          zoneId: 'zone-1',
          scheduledFor: new Date().toISOString(),
          orderedContainerIds: [
            'container-1',
            'container-2',
            'container-3',
            'container-4',
            'container-5',
          ],
        },
        'manager-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.select).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('rejects planned tours when containers do not belong to selected zone', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'zone-b',
                label: 'Zone B Depot',
                latitude: '36.8000',
                longitude: '10.1800',
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
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
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'zone-1',
                label: 'Zone 1 Depot',
                latitude: '36.8000',
                longitude: '10.1800',
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
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

          return {
            onConflictDoNothing,
          };
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
    expect(onConflictDoNothing).toHaveBeenCalledTimes(3);
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

  it('groups notification deliveries under their parent notifications', async () => {
    const listNotificationsSelection = {
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'notification-1',
              eventType: 'anomaly_reported',
              entityType: 'alert_event',
              entityId: 'alert-1',
              audienceScope: 'role:manager',
              title: 'Anomaly reported',
              body: 'Critical anomaly',
              preferredChannels: ['email'],
              scheduledAt: new Date('2026-03-03T09:00:00.000Z'),
              status: 'queued',
              createdAt: new Date('2026-03-03T09:00:00.000Z'),
            },
          ]),
        }),
      }),
    };

    const listDeliveriesSelection = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            {
              id: 'delivery-1',
              notificationId: 'notification-1',
              channel: 'email',
              recipientAddress: 'role:manager',
              providerMessageId: null,
              deliveryStatus: 'pending',
              attemptCount: 0,
              lastAttemptAt: null,
              deliveredAt: null,
              errorCode: null,
              createdAt: new Date('2026-03-03T09:00:00.000Z'),
            },
          ]),
        }),
      }),
    };

    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(listNotificationsSelection)
        .mockReturnValueOnce(listDeliveriesSelection),
    };

    const repository = new PlanningRepository(dbMock as any);
    const result = await repository.listNotifications(25);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'notification-1',
        deliveries: [
          expect.objectContaining({
            id: 'delivery-1',
            notificationId: 'notification-1',
            channel: 'email',
          }),
        ],
      }),
    ]);
  });

  it('builds the manager dashboard summary without raw SQL date predicates', async () => {
    const countSelection = (value: number) => ({
      from: vi.fn().mockResolvedValue([{ value }]),
    });
    const whereSelection = <T>(rows: T) => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    });

    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(countSelection(12))
        .mockReturnValueOnce(countSelection(4))
        .mockReturnValueOnce(countSelection(3))
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: 'container-1',
                      code: 'CTR-001',
                      label: 'North Hub',
                      fillLevelPercent: 92,
                      status: 'attention_required',
                      latitude: '36.8100',
                      longitude: '10.1900',
                      zoneName: 'North',
                    },
                  ]),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { severity: 'critical', total: 3 },
                { severity: 'warning', total: 1 },
              ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi
              .fn()
              .mockReturnValueOnce({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue([
                        {
                          id: 'alert-1',
                          eventType: 'sensor_offline',
                          severity: 'critical',
                          currentStatus: 'open',
                          triggeredAt: new Date('2026-03-03T12:00:00.000Z'),
                          containerId: 'container-1',
                          containerCode: 'CTR-001',
                          zoneName: 'North',
                        },
                      ]),
                    }),
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce(whereSelection([{ value: 7 }]))
        .mockReturnValueOnce(whereSelection([{ value: 2 }]))
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ value: '2026-03-03 11:45:00+00' }]),
        }),
    };

    const repository = new PlanningRepository(dbMock as any);
    const result = await repository.getManagerDashboard();

    expect(result).toEqual(
      expect.objectContaining({
        ecoKpis: {
          containers: 12,
          zones: 4,
          tours: 3,
        },
        criticalContainers: [
          expect.objectContaining({
            id: 'container-1',
            fillLevelPercent: 92,
          }),
        ],
        activeAlerts: expect.objectContaining({
          totalOpen: 4,
          bySeverity: {
            critical: 3,
            warning: 1,
          },
          latest: [
            expect.objectContaining({
              id: 'alert-1',
              severity: 'critical',
            }),
          ],
        }),
        telemetryHealth: {
          reportingContainers: 7,
          staleSensors: 2,
          lastMeasurementAt: '2026-03-03T11:45:00.000Z',
        },
      }),
    );
    expect(dbMock.select).toHaveBeenCalledTimes(9);
  });
});

