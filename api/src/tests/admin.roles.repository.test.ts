import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AdminRolesRepository } from '../admin/admin.roles.repository.js';

describe('AdminRolesRepository permission validation', () => {
  const createRepository = () => {
    const dbMock = {
      query: {
        roles: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'role-1',
              name: 'dispatcher',
              description: 'Dispatcher',
              permissions: ['tickets.read'],
            },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'role-1',
                name: 'dispatcher',
                description: 'Dispatcher',
                permissions: ['tickets.read'],
              },
            ]),
          }),
        }),
      }),
    };

    return {
      repository: new AdminRolesRepository(dbMock as any),
      dbMock,
    };
  };

  it('rejects unknown permissions during role creation', async () => {
    const { repository, dbMock } = createRepository();

    await expect(
      repository.createRole({
        name: 'dispatcher',
        permissions: ['tickets.read', 'not.a.real.permission'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('rejects unknown permissions during role update', async () => {
    const { repository, dbMock } = createRepository();

    await expect(
      repository.updateRole('role-1', {
        permissions: ['tickets.read', 'unknown.permission'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dbMock.update).not.toHaveBeenCalled();
  });
});
