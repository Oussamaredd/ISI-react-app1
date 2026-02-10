import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../auth/auth.controller.js';

describe('AuthController', () => {
  const authUser = {
    provider: 'google' as const,
    id: 'google-user-1',
    email: 'agent@example.com',
    name: 'Agent User',
    avatarUrl: null,
  };

  const dbUser = {
    id: 'db-user-1',
    email: 'agent@example.com',
    displayName: 'Agent User',
    role: 'manager',
    isActive: true,
    hotelId: 'hotel-1',
  };

  const authServiceMock = {
    getAuthUserFromCookie: vi.fn(),
    getAuthCookieName: vi.fn(() => 'auth_token'),
    getAuthCookieOptions: vi.fn(() => ({
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: false,
    })),
    createAuthToken: vi.fn(),
    getAuthRedirectUrl: vi.fn(),
  };

  const usersServiceMock = {
    ensureUserForAuth: vi.fn(),
    getRolesForUser: vi.fn(),
  };

  const makeRequest = (cookie?: string) =>
    ({
      headers: { cookie },
    }) as Request;

  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(authServiceMock as any, usersServiceMock as any);
    authServiceMock.getAuthUserFromCookie.mockReturnValue(null);
    usersServiceMock.ensureUserForAuth.mockResolvedValue(dbUser);
    usersServiceMock.getRolesForUser.mockResolvedValue([{ id: 'role-1', name: 'manager' }]);
  });

  it('getStatus returns unauthenticated when no cookie user exists', async () => {
    await expect(controller.getStatus(makeRequest())).resolves.toEqual({ authenticated: false });
  });

  it('getStatus returns enriched authenticated user', async () => {
    authServiceMock.getAuthUserFromCookie.mockReturnValue(authUser);

    await expect(controller.getStatus(makeRequest('auth_token=valid'))).resolves.toEqual({
      authenticated: true,
      user: {
        ...authUser,
        role: 'manager',
        roles: [{ id: 'role-1', name: 'manager' }],
        isActive: true,
      },
    });
  });

  it('getStatus falls back to auth user when enrichment fails', async () => {
    authServiceMock.getAuthUserFromCookie.mockReturnValue(authUser);
    usersServiceMock.ensureUserForAuth.mockRejectedValueOnce(new Error('db unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(controller.getStatus(makeRequest('auth_token=valid'))).resolves.toEqual({
      authenticated: true,
      user: authUser,
    });

    errorSpy.mockRestore();
  });

  it('getCurrentUser throws UnauthorizedException when user is missing', async () => {
    await expect(controller.getCurrentUser(makeRequest())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('getCurrentUser returns enriched user when present', async () => {
    authServiceMock.getAuthUserFromCookie.mockReturnValue(authUser);

    await expect(controller.getCurrentUser(makeRequest('auth_token=valid'))).resolves.toEqual({
      user: {
        ...authUser,
        role: 'manager',
        roles: [{ id: 'role-1', name: 'manager' }],
        isActive: true,
      },
    });
  });

  it('logout clears auth cookie and returns success payload', () => {
    const clearCookie = vi.fn();
    const response = { clearCookie } as unknown as Response;

    expect(controller.logout(response)).toEqual({ success: true });
    expect(clearCookie).toHaveBeenCalledWith('auth_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
  });
});
