import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AdminSettingsRepository } from '../modules/admin/admin.settings.repository.js';

const createInsertResult = (returningValue?: unknown) => ({
  values: vi.fn().mockReturnValue(
    returningValue === undefined
      ? Promise.resolve(undefined)
      : {
          returning: vi.fn().mockResolvedValue(returningValue),
        },
  ),
});

describe('AdminSettingsRepository branches', () => {
  it('hydrates defaults before returning stored settings', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([
            {
              key: 'site_name',
              value: 'EcoTrack Custom',
            },
          ]),
        }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const repository = new AdminSettingsRepository(dbMock as never);
    const settings = await repository.getSettings();

    expect(settings.site_name).toBe('EcoTrack Custom');
    expect(settings.default_user_role).toBe('citizen');
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it('rejects empty settings updates', async () => {
    const repository = new AdminSettingsRepository({} as never);

    await expect(repository.updateSettings({ unsupported_key: true }, 'admin-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('marks test notifications as partial when no recipients are configured', async () => {
    const dbMock = {
      insert: vi
        .fn()
        .mockReturnValueOnce(createInsertResult([{ id: 'notification-1' }]))
        .mockReturnValueOnce(createInsertResult([{ id: 'delivery-email' }]))
        .mockReturnValueOnce(createInsertResult([{ id: 'delivery-sms' }]))
        .mockReturnValueOnce(createInsertResult()),
    };

    const repository = new AdminSettingsRepository(dbMock as never);
    vi.spyOn(repository, 'getSettings').mockResolvedValue({
      notification_channels: [],
      severity_channel_routing: {
        warning: ['email', 'sms'],
      },
    } as never);

    const result = await repository.dispatchTestNotification(
      {
        severity: 'warning',
        message: 'Queue dry-run',
      },
      'admin-1',
    );

    expect(result.status).toBe('partial');
    expect(result.deliveries).toEqual([
      expect.objectContaining({
        channel: 'email',
        recipient: null,
        status: 'failed',
      }),
      expect.objectContaining({
        channel: 'sms',
        recipient: null,
        status: 'failed',
      }),
    ]);
    expect(dbMock.insert).toHaveBeenCalledTimes(4);
  });

  it('rejects alert-rule updates when the rule id does not exist', async () => {
    const dbMock = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const repository = new AdminSettingsRepository(dbMock as never);

    await expect(
      repository.upsertAlertRule({
        id: 'missing-rule',
        scopeType: 'zone',
        notifyChannels: ['email'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
