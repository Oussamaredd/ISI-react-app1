import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController } from '../modules/auth/auth.controller.js';

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
    authProvider: 'google',
    displayName: 'Agent User',
    role: 'manager',
    isActive: true,
  };

  const authServiceMock = {
    getCurrentUser: vi.fn(),
    getAuthCookieName: vi.fn(() => 'auth_token'),
    getAuthCookieOptions: vi.fn(() => ({
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: false,
    })),
    createAuthToken: vi.fn(),
    getAuthCallbackUrl: vi.fn(() => 'http://localhost:5173/auth/callback?error=failed'),
    issueExchangeCode: vi.fn(() => 'exchange-code-1'),
    exchangeCode: vi.fn(),
    ensureGoogleSignInAllowed: vi.fn(),
  };

  const makeRequest = (cookie?: string) =>
    ({
      headers: { cookie },
    }) as Request;

  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(authServiceMock as any);
    authServiceMock.getCurrentUser.mockRejectedValue(new UnauthorizedException());
  });

  it('getStatus returns unauthenticated when no cookie user exists', async () => {
    await expect(controller.getStatus(makeRequest())).resolves.toEqual({ authenticated: false });
  });

  it('getStatus returns authenticated current user', async () => {
    authServiceMock.getCurrentUser.mockResolvedValue({
      ...authUser,
      provider: dbUser.authProvider,
      role: 'manager',
      roles: [{ id: 'role-1', name: 'manager' }],
      isActive: true,
    });

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

  it('getStatus returns unauthenticated when the current user is inactive', async () => {
    authServiceMock.getCurrentUser.mockRejectedValueOnce(
      new ForbiddenException('User account is inactive'),
    );

    await expect(controller.getStatus(makeRequest('auth_token=valid'))).resolves.toEqual({
      authenticated: false,
    });
  });

  it('getCurrentUser throws UnauthorizedException when user is missing', async () => {
    await expect(controller.getCurrentUser(makeRequest())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('getCurrentUser returns enriched user when present', async () => {
    authServiceMock.getCurrentUser.mockResolvedValue({
      ...authUser,
      provider: dbUser.authProvider,
      role: 'manager',
      roles: [{ id: 'role-1', name: 'manager' }],
      isActive: true,
    });

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

  it('googleAuthCallback redirects with error when Google sign-in is blocked', async () => {
    authServiceMock.ensureGoogleSignInAllowed.mockRejectedValueOnce(
      new ConflictException('This email is registered with email/password. Please sign in with your password.'),
    );
    authServiceMock.getAuthCallbackUrl.mockReturnValueOnce('http://localhost:5173/auth/callback?error=blocked');

    const redirect = vi.fn();
    const response = { redirect } as unknown as Response;
    const request = { user: authUser } as unknown as Request;

    await controller.googleAuthCallback(request, response);

    expect(redirect).toHaveBeenCalledWith('http://localhost:5173/auth/callback?error=blocked');
    expect(authServiceMock.issueExchangeCode).not.toHaveBeenCalled();
  });

  it('googleAuthCallback redirects with an error when Passport does not attach a user', async () => {
    authServiceMock.getAuthCallbackUrl.mockReturnValueOnce('http://localhost:5173/auth/callback?error=failed');

    const redirect = vi.fn();
    const response = { redirect } as unknown as Response;

    await controller.googleAuthCallback({} as Request, response);

    expect(authServiceMock.getAuthCallbackUrl).toHaveBeenCalledWith({
      errorMessage: 'Unable to complete Google sign-in.',
    });
    expect(redirect).toHaveBeenCalledWith('http://localhost:5173/auth/callback?error=failed');
    expect(authServiceMock.ensureGoogleSignInAllowed).not.toHaveBeenCalled();
  });

  it('googleAuthCallback redirects to frontend callback with exchange code when successful', async () => {
    authServiceMock.ensureGoogleSignInAllowed.mockResolvedValueOnce(undefined);
    authServiceMock.issueExchangeCode.mockReturnValueOnce('exchange-code-1');
    authServiceMock.getAuthCallbackUrl.mockReturnValueOnce(
      'http://localhost:5173/auth/callback?code=exchange-code-1',
    );

    const redirect = vi.fn();
    const response = { redirect } as unknown as Response;
    const request = { user: authUser } as unknown as Request;

    await controller.googleAuthCallback(request, response);

    expect(authServiceMock.issueExchangeCode).toHaveBeenCalledWith(authUser);
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:5173/auth/callback?code=exchange-code-1',
    );
  });

  it('googleAuthCallback rethrows unexpected sign-in errors', async () => {
    authServiceMock.ensureGoogleSignInAllowed.mockRejectedValueOnce(new Error('oauth misconfiguration'));

    const redirect = vi.fn();
    const response = { redirect } as unknown as Response;
    const request = { user: authUser } as unknown as Request;

    await expect(controller.googleAuthCallback(request, response)).rejects.toThrow(
      'oauth misconfiguration',
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it('exchangeCode forwards code exchange to auth service', async () => {
    authServiceMock.exchangeCode.mockResolvedValueOnce({
      accessToken: 'token-123',
      user: {
        id: 'u-1',
      },
    });

    await expect(controller.exchangeCode({ code: 'exchange-code-1' } as any)).resolves.toEqual({
      accessToken: 'token-123',
      user: { id: 'u-1' },
    });
    expect(authServiceMock.exchangeCode).toHaveBeenCalledWith('exchange-code-1');
  });
});


