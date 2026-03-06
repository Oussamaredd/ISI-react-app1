import { roles, userRoles, users } from 'ecotrack-database';
import { describe, expect, it, vi } from 'vitest';

import { UsersRepository } from '../modules/users/users.repository.js';

const MOCK_HASH_VALUE = ['fixture', 'hash'].join('-');

const buildDbMock = () => {
  const insertedUsers: Array<Record<string, unknown>> = [];
  const insertedUserRoles: Array<Record<string, unknown>> = [];
  const updatedUsers: Array<Record<string, unknown>> = [];

  const dbMock = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockImplementation((table: unknown) => {
      if (table === users) {
        return {
          values: vi.fn((payload: Record<string, unknown>) => {
            insertedUsers.push(payload);
            return {
              onConflictDoUpdate: vi.fn(() => ({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'user-1',
                    email: payload.email,
                    displayName: payload.displayName,
                    avatarUrl: payload.avatarUrl ?? null,
                    authProvider: 'google',
                    googleId: payload.googleId ?? null,
                    role: payload.role,
                    isActive: true,
                  },
                ]),
              })),
            };
          }),
        };
      }

      if (table === userRoles) {
        return {
          values: vi.fn((payload: Record<string, unknown>) => {
            insertedUserRoles.push(payload);
            return {
              onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
            };
          }),
        };
      }

      throw new Error('Unexpected insert target');
    }),
    update: vi.fn().mockImplementation((table: unknown) => {
      if (table !== users) {
        throw new Error('Unexpected update target');
      }

      return {
        set: vi.fn((payload: Record<string, unknown>) => {
          updatedUsers.push(payload);
          return {
            where: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'user-1',
                  email: 'citizen@example.com',
                  displayName: payload.displayName ?? 'Citizen',
                  avatarUrl: payload.avatarUrl ?? null,
                  authProvider: 'google',
                  googleId: payload.googleId ?? 'google-1',
                  role: 'citizen',
                  isActive: true,
                },
              ]),
            })),
          };
        }),
      };
    }),
    delete: vi.fn().mockImplementation((table: unknown) => {
      if (table !== userRoles) {
        throw new Error('Unexpected delete target');
      }

      return {
        where: vi.fn().mockResolvedValue(undefined),
      };
    }),
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        if (table !== roles) {
          throw new Error('Unexpected select target');
        }

        return {
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'role-citizen', name: 'citizen' }]),
          })),
        };
      }),
    })),
  };

  return {
    dbMock,
    insertedUsers,
    insertedUserRoles,
    updatedUsers,
  };
};

const buildDbMockForLocalSignup = () => {
  const insertedLocalUsers: Array<Record<string, unknown>> = [];
  const insertedLocalUserRoles: Array<Array<Record<string, unknown>>> = [];

  const tx = {
    insert: vi.fn().mockImplementation((table: unknown) => {
      if (table === users) {
        return {
          values: vi.fn((payload: Record<string, unknown>) => {
            insertedLocalUsers.push(payload);
            return {
              returning: vi.fn().mockResolvedValue([{ id: 'local-user-1' }]),
            };
          }),
        };
      }

      if (table === userRoles) {
        return {
          values: vi.fn((payload: Array<Record<string, unknown>>) => {
            insertedLocalUserRoles.push(payload);
            return Promise.resolve();
          }),
        };
      }

      throw new Error('Unexpected transaction insert target');
    }),
  };

  const dbMock = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        if (table !== roles) {
          throw new Error('Unexpected select target');
        }

        return {
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'role-citizen', name: 'citizen' }]),
          })),
        };
      }),
    })),
    transaction: vi.fn(async (callback: (trx: typeof tx) => Promise<void>) => callback(tx)),
  };

  return {
    dbMock,
    insertedLocalUsers,
    insertedLocalUserRoles,
  };
};

describe('UsersRepository OAuth role defaults', () => {
  it('creates new Google users with the citizen role and role link', async () => {
    const { dbMock, insertedUsers, insertedUserRoles } = buildDbMock();
    dbMock.query.users.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const repository = new UsersRepository(dbMock as any);
    const created = await repository.ensureUserForAuth({
      provider: 'google',
      id: 'google-1',
      email: 'citizen@example.com',
      name: 'Citizen User',
      avatarUrl: null,
    });

    expect(insertedUsers[0]).toEqual(
      expect.objectContaining({
        email: 'citizen@example.com',
        role: 'citizen',
        authProvider: 'google',
      }),
    );
    expect(insertedUserRoles[0]).toEqual({
      userId: 'user-1',
      roleId: 'role-citizen',
    });
    expect(created).toEqual(
      expect.objectContaining({
        id: 'user-1',
        role: 'citizen',
      }),
    );
  });

  it('normalizes existing Google users to citizen while keeping profile updates', async () => {
    const { dbMock, insertedUserRoles, updatedUsers } = buildDbMock();
    dbMock.query.users.findFirst
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'citizen@example.com',
        displayName: 'Citizen User',
        avatarUrl: null,
        authProvider: 'google',
        googleId: 'google-1',
        role: 'manager',
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'citizen@example.com',
        displayName: 'Citizen User',
        avatarUrl: null,
        authProvider: 'google',
        googleId: 'google-1',
        role: 'manager',
        isActive: true,
      });

    const repository = new UsersRepository(dbMock as any);
    const updated = await repository.ensureUserForAuth({
      provider: 'google',
      id: 'google-1',
      email: 'citizen@example.com',
      name: 'Citizen User',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(insertedUserRoles[0]).toEqual({
      userId: 'user-1',
      roleId: 'role-citizen',
    });
    expect(updatedUsers).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'citizen' })]),
    );
    expect(dbMock.delete).toHaveBeenCalledWith(userRoles);
    expect(updated).toEqual(
      expect.objectContaining({
        id: 'user-1',
        role: 'citizen',
      }),
    );
  });
});

describe('UsersRepository local signup defaults', () => {
  it('assigns citizen role link when local user is created without explicit roleIds', async () => {
    const { dbMock, insertedLocalUsers, insertedLocalUserRoles } = buildDbMockForLocalSignup();
    dbMock.query.users.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'local-user-1',
        email: 'local@example.com',
        displayName: 'Local User',
        avatarUrl: null,
        role: 'citizen',
        isActive: true,
      });

    const repository = new UsersRepository(dbMock as any);
    const created = await repository.createLocalUser({
      email: 'local@example.com',
      passwordHash: MOCK_HASH_VALUE,
      displayName: 'Local User',
      defaultRoleName: 'citizen',
    });

    expect(insertedLocalUsers[0]).toEqual(
      expect.objectContaining({
        email: 'local@example.com',
        role: 'citizen',
        authProvider: 'local',
      }),
    );
    expect(insertedLocalUserRoles[0]).toEqual([
      {
        userId: 'local-user-1',
        roleId: 'role-citizen',
      },
    ]);
    expect(created).toEqual(
      expect.objectContaining({
        id: 'local-user-1',
        role: 'citizen',
        roles: [{ id: 'role-citizen', name: 'citizen' }],
      }),
    );
  });
});
