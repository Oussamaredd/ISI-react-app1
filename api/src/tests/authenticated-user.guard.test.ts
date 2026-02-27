import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';

describe('AuthenticatedUserGuard permission resolution', () => {
  it('does not inject fallback permissions when DB roles have none', async () => {
    const request: Record<string, unknown> = {};
    const authServiceMock = {
      getAuthUserFromRequest: vi.fn().mockReturnValue({
        provider: 'google',
        id: 'oauth-user-1',
        email: 'manager@example.com',
        name: 'Manager',
        avatarUrl: null,
      }),
    };
    const usersServiceMock = {
      ensureUserForAuth: vi.fn().mockResolvedValue({
        id: 'db-user-1',
        email: 'manager@example.com',
        displayName: 'Manager',
        role: 'manager',
        isActive: true,
      }),
      getRolesForUser: vi.fn().mockResolvedValue([
        { id: 'role-manager', name: 'manager', permissions: [] },
      ]),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any, usersServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(request.authUser).toEqual(
      expect.objectContaining({
        id: 'db-user-1',
        role: 'manager',
        permissions: [],
      }),
    );
  });

  it('aggregates only explicit DB role permissions', async () => {
    const request: Record<string, unknown> = {};
    const authServiceMock = {
      getAuthUserFromRequest: vi.fn().mockReturnValue({
        provider: 'google',
        id: 'oauth-user-2',
        email: 'admin@example.com',
        name: 'Admin',
        avatarUrl: null,
      }),
    };
    const usersServiceMock = {
      ensureUserForAuth: vi.fn().mockResolvedValue({
        id: 'db-user-2',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isActive: true,
      }),
      getRolesForUser: vi.fn().mockResolvedValue([
        {
          id: 'role-admin',
          name: 'admin',
          permissions: ['tickets.read', 'tickets.write', 'tickets.write'],
        },
      ]),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any, usersServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(request.authUser).toEqual(
      expect.objectContaining({
        permissions: ['tickets.read', 'tickets.write'],
      }),
    );
  });

  it('returns forbidden for inactive users', async () => {
    const authServiceMock = {
      getAuthUserFromRequest: vi.fn().mockReturnValue({
        provider: 'google',
        id: 'oauth-user-3',
        email: 'inactive@example.com',
      }),
    };
    const usersServiceMock = {
      ensureUserForAuth: vi.fn().mockResolvedValue({
        id: 'db-user-3',
        email: 'inactive@example.com',
        displayName: 'Inactive',
        role: 'agent',
        isActive: false,
      }),
      getRolesForUser: vi.fn(),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any, usersServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns unauthorized when auth identity is missing', async () => {
    const authServiceMock = {
      getAuthUserFromRequest: vi.fn().mockReturnValue(null),
    };
    const usersServiceMock = {
      ensureUserForAuth: vi.fn(),
      getRolesForUser: vi.fn(),
    };

    const guard = new AuthenticatedUserGuard(authServiceMock as any, usersServiceMock as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
