import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CitizenRepository } from '../modules/citizen/citizen.repository.js';

describe('CitizenRepository', () => {
  it('rejects report creation when the container no longer exists', async () => {
    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const repository = new CitizenRepository(dbMock as any);

    await expect(
      repository.createReport('user-1', {
        containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
        reportType: 'container_full',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate report creation when a report already exists in the last hour', async () => {
    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'container-1',
                code: 'CTR-1001',
                label: 'Main Square - Glass',
                latitude: '48.8566',
                longitude: '2.3522',
                zoneId: 'zone-1',
              },
            ]),
          }),
        }),
      }),
      query: {
        citizenReports: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'existing-report',
          }),
        },
      },
    };

    const repository = new CitizenRepository(dbMock as any);

    await expect(
      repository.createReport('user-1', {
        containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
        reportType: 'container_full',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('stores snapshots, queues manager notifications, and preserves report type metadata', async () => {
    const insertedReports: Array<Record<string, unknown>> = [];
    const updatedProfiles: Array<Record<string, unknown>> = [];
    const insertedAlerts: Array<Record<string, unknown>> = [];
    const insertedNotifications: Array<Record<string, unknown>> = [];
    const insertedDeliveries: Array<Record<string, unknown>> = [];

    const transactionSelectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 1 }]),
      }),
    });

    const tx = {
      insert: vi.fn().mockImplementation((table: unknown) => {
        if (table && typeof table === 'object' && 'reportedAt' in (table as Record<string, unknown>)) {
          return {
            values: vi.fn((payload: Record<string, unknown>) => {
              insertedReports.push(payload);
              return {
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'report-1',
                    reportedAt: new Date('2026-03-10T09:00:00.000Z'),
                    ...payload,
                  },
                ]),
              };
            }),
          };
        }

        if (table && typeof table === 'object' && 'challengeProgress' in (table as Record<string, unknown>)) {
          return {
            values: vi.fn((payload: Record<string, unknown>) => {
              updatedProfiles.push(payload);
              return {
                onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
              };
            }),
          };
        }

        if (table && typeof table === 'object' && 'triggeredAt' in (table as Record<string, unknown>)) {
          return {
            values: vi.fn((payload: Record<string, unknown>) => {
              insertedAlerts.push(payload);
              return {
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'alert-1',
                    ...payload,
                  },
                ]),
              };
            }),
          };
        }

        if (table && typeof table === 'object' && 'audienceScope' in (table as Record<string, unknown>)) {
          return {
            values: vi.fn((payload: Record<string, unknown>) => {
              insertedNotifications.push(payload);
              return {
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'notification-1',
                    ...payload,
                  },
                ]),
              };
            }),
          };
        }

        if (table && typeof table === 'object' && 'notificationId' in (table as Record<string, unknown>)) {
          return {
            values: vi.fn((payload: Record<string, unknown>) => {
              insertedDeliveries.push(payload);
              return Promise.resolve();
            }),
          };
        }

        throw new Error('Unexpected insert target');
      }),
      select: transactionSelectMock,
      query: {
        gamificationProfiles: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };

    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'container-1',
                code: 'CTR-1001',
                label: 'Main Square - Glass',
                latitude: '48.8566',
                longitude: '2.3522',
                zoneId: 'zone-downtown',
              },
            ]),
          }),
        }),
      }),
      query: {
        citizenReports: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new CitizenRepository(dbMock as any);

    const result = await repository.createReport('user-1', {
      containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
      reportType: 'container_full',
      description: ' Overflow near school ',
      latitude: '48.8566',
      longitude: '2.3522',
      photoUrl: 'data:image/jpeg;base64,YWJj',
    });

    expect(insertedReports[0]).toEqual(
      expect.objectContaining({
        containerId: 'container-1',
        containerCodeSnapshot: 'CTR-1001',
        containerLabelSnapshot: 'Main Square - Glass',
        description: '[container_full] Overflow near school',
        latitude: '48.8566',
        longitude: '2.3522',
        photoUrl: 'data:image/jpeg;base64,YWJj',
      }),
    );
    expect(updatedProfiles[0]).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        points: 10,
        badges: ['first_report'],
      }),
    );
    expect(insertedAlerts[0]).toEqual(
      expect.objectContaining({
        containerId: 'container-1',
        zoneId: 'zone-downtown',
        eventType: 'citizen_container_reported',
        severity: 'warning',
      }),
    );
    expect(insertedNotifications[0]).toEqual(
      expect.objectContaining({
        eventType: 'citizen_container_reported',
        audienceScope: 'zone:zone-downtown:role:manager',
        title: 'Citizen report for CTR-1001',
      }),
    );
    expect(insertedDeliveries[0]).toEqual(
      expect.objectContaining({
        notificationId: 'notification-1',
        recipientAddress: 'zone:zone-downtown:role:manager',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'report-1',
        confirmationState: 'submitted',
        reportType: 'container_full',
        description: 'Overflow near school',
        managerNotificationQueued: true,
      }),
    );
  });
});
