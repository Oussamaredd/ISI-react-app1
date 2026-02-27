import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuditController } from '../admin/admin.audit.controller.js';
import { AdminRolesController } from '../admin/admin.roles.controller.js';
import { AdminSettingsController } from '../admin/admin.settings.controller.js';
import { AdminUsersController } from '../admin/admin.users.controller.js';

describe('Admin operations controller contract', () => {
  const adminUserId = '7888bec2-f4ee-4440-b16f-b35d66607366';

  const usersServiceMock = {
    listUsers: vi.fn(),
    findByEmail: vi.fn(),
    createLocalUser: vi.fn(),
  };

  const rolesServiceMock = {
    listRoles: vi.fn(),
    getAvailablePermissions: vi.fn(),
    createRole: vi.fn(),
  };

  const settingsServiceMock = {
    getSettings: vi.fn(),
    dispatchTestNotification: vi.fn(),
  };

  const auditServiceMock = {
    log: vi.fn(),
    listLogs: vi.fn(),
    getStats: vi.fn(),
  };

  const usersController = new AdminUsersController(usersServiceMock as any, auditServiceMock as any);
  const rolesController = new AdminRolesController(rolesServiceMock as any, auditServiceMock as any);
  const settingsController = new AdminSettingsController(
    settingsServiceMock as any,
    auditServiceMock as any,
  );
  const auditController = new AdminAuditController(auditServiceMock as any);

  beforeEach(() => {
    vi.clearAllMocks();

    usersServiceMock.listUsers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    usersServiceMock.findByEmail.mockResolvedValue(null);
    usersServiceMock.createLocalUser.mockResolvedValue({
      id: '13ce58f1-89fc-4d17-a58b-2a65f51fbc5e',
      email: 'new.user@example.com',
      displayName: 'New User',
      isActive: true,
      roles: [{ id: 'role-agent', name: 'agent' }],
    });

    rolesServiceMock.listRoles.mockResolvedValue([{ id: 'role-agent', name: 'agent' }]);
    rolesServiceMock.getAvailablePermissions.mockReturnValue(['tickets.read', 'tickets.write']);
    rolesServiceMock.createRole.mockResolvedValue({
      id: 'ccf87260-0e8d-48b3-8526-6f779269d56a',
      name: 'dispatcher',
      permissions: ['tickets.read'],
    });

    settingsServiceMock.getSettings.mockResolvedValue({
      notifications: { recipients: ['ops@example.com'] },
      thresholds: { criticalFillPercent: 80 },
    });
    settingsServiceMock.dispatchTestNotification.mockResolvedValue({
      delivered: true,
      channel: 'email',
    });

    auditServiceMock.log.mockResolvedValue(undefined);
    auditServiceMock.listLogs.mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
    });
    auditServiceMock.getStats.mockResolvedValue([]);
  });

  it('normalizes admin users list filters and pagination', async () => {
    await usersController.listUsers(
      'ops',
      'agent',
      'false',
      'google',
      '2026-02-01',
      '2026-02-27',
      '2',
      '10',
    );

    const call = usersServiceMock.listUsers.mock.calls[0]?.[0];
    expect(call).toEqual(
      expect.objectContaining({
        search: 'ops',
        role: 'agent',
        isActive: false,
        authProvider: 'google',
        page: 2,
        limit: 10,
      }),
    );
    expect(call.createdFrom).toBeInstanceOf(Date);
    expect(call.createdTo).toBeInstanceOf(Date);
    expect((call.createdTo as Date).getHours()).toBe(23);
  });

  it('creates a local user with normalized payload and audit logging', async () => {
    const response = await usersController.createUser(
      {
        email: 'NEW.USER@EXAMPLE.COM',
        displayName: 'New User',
        password: 'strongpass123',
        roleIds: ['role-agent'],
      },
      { id: adminUserId } as any,
      {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'vitest',
        },
      } as any,
    );

    expect(usersServiceMock.findByEmail).toHaveBeenCalledWith('new.user@example.com');
    expect(usersServiceMock.createLocalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.user@example.com',
        displayName: 'New User',
        roleIds: ['role-agent'],
        isActive: true,
        passwordHash: expect.any(String),
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new.user@example.com',
        }),
      }),
    );
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: adminUserId,
        action: 'user_created',
        resourceType: 'users',
      }),
    );
  });

  it('exposes and mutates role definitions', async () => {
    await rolesController.listRoles();
    expect(rolesServiceMock.listRoles).toHaveBeenCalledTimes(1);

    await rolesController.createRole(
      {
        name: 'dispatcher',
        description: 'Dispatch role',
        permissions: ['tickets.read'],
      },
      { id: adminUserId } as any,
      {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'vitest' },
      } as any,
    );

    expect(rolesServiceMock.createRole).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'dispatcher',
      }),
    );
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: adminUserId,
        action: 'role_created',
        resourceType: 'roles',
      }),
    );
  });

  it('returns settings and dispatches test notifications', async () => {
    await settingsController.getSettings();
    expect(settingsServiceMock.getSettings).toHaveBeenCalledTimes(1);

    await settingsController.dispatchTestNotification(
      {
        severity: 'info',
        message: 'Test manager notification.',
        channel: 'email',
        recipient: 'ops@example.com',
      },
      { id: adminUserId } as any,
    );

    expect(settingsServiceMock.dispatchTestNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        channel: 'email',
      }),
      adminUserId,
    );
  });

  it('forwards admin audit log filters', async () => {
    await auditController.listLogs(
      'search-term',
      'user_created',
      'users',
      '13ce58f1-89fc-4d17-a58b-2a65f51fbc5e',
      '2026-02-01',
      '2026-02-27',
      '2',
      '25',
    );

    const call = auditServiceMock.listLogs.mock.calls[0]?.[0];
    expect(call).toEqual(
      expect.objectContaining({
        search: 'search-term',
        action: 'user_created',
        resourceType: 'users',
        userId: '13ce58f1-89fc-4d17-a58b-2a65f51fbc5e',
        page: 2,
        limit: 25,
      }),
    );
    expect(call.dateFrom).toBeInstanceOf(Date);
    expect(call.dateTo).toBeInstanceOf(Date);
    expect((call.dateTo as Date).getHours()).toBe(23);
    expect((call.dateTo as Date).getMinutes()).toBe(59);
    expect((call.dateTo as Date).getSeconds()).toBe(59);
  });
});
