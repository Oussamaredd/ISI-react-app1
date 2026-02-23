import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalAuthController } from '../auth/local-auth.controller.js';

describe('LocalAuthController', () => {
  const authServiceMock = {
    signupLocal: vi.fn(),
    loginLocal: vi.fn(),
    getCurrentUser: vi.fn(),
    updateCurrentUserProfile: vi.fn(),
    getAuthCookieName: vi.fn(() => 'auth_token'),
    getAuthCookieOptions: vi.fn(() => ({
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: false,
    })),
    createPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  };

  let controller: LocalAuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new LocalAuthController(authServiceMock as any);
  });

  it('signup returns local auth payload', async () => {
    authServiceMock.signupLocal.mockResolvedValueOnce({
      accessToken: 'token',
      user: { id: 'u1' },
    });

    await expect(
      controller.signup({
        email: 'local@example.com',
        password: 'Password123!',
        displayName: 'Local User',
      } as any),
    ).resolves.toEqual({
      accessToken: 'token',
      user: { id: 'u1' },
    });
  });

  it('login returns exchange code payload', async () => {
    authServiceMock.loginLocal.mockResolvedValueOnce({
      code: 'exchange-code-1',
    });

    await expect(
      controller.login({
        email: 'local@example.com',
        password: 'Password123!',
      } as any),
    ).resolves.toEqual({
      code: 'exchange-code-1',
    });
  });

  it('me returns authenticated user payload', async () => {
    authServiceMock.getCurrentUser.mockResolvedValueOnce({ id: 'u1', email: 'local@example.com' });

    await expect(controller.me({ headers: {} } as Request)).resolves.toEqual({
      user: { id: 'u1', email: 'local@example.com' },
    });
  });

  it('updateProfile returns updated authenticated user payload', async () => {
    authServiceMock.updateCurrentUserProfile.mockResolvedValueOnce({
      id: 'u1',
      email: 'local@example.com',
      displayName: 'Updated Name',
    });

    await expect(
      controller.updateProfile({ headers: {} } as Request, { displayName: 'Updated Name' } as any),
    ).resolves.toEqual({
      user: { id: 'u1', email: 'local@example.com', displayName: 'Updated Name' },
    });
  });

  it('logout clears auth cookie and returns success', () => {
    const clearCookie = vi.fn();
    const response = { clearCookie } as unknown as Response;

    expect(controller.logout(response)).toEqual({ success: true });
    expect(clearCookie).toHaveBeenCalledWith('auth_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
  });

  it('forgotPassword returns devResetUrl in development mode', async () => {
    authServiceMock.createPasswordReset.mockResolvedValueOnce({
      statusCode: 200,
      body: { devResetUrl: 'http://localhost:5173/reset-password?token=abc' },
    });

    await expect(
      controller.forgotPassword(
        { email: 'local@example.com' } as any,
        { status: vi.fn() } as unknown as Response,
      ),
    ).resolves.toEqual({
      devResetUrl: 'http://localhost:5173/reset-password?token=abc',
    });
  });

  it('forgotPassword returns 204 in production mode', async () => {
    authServiceMock.createPasswordReset.mockResolvedValueOnce({
      statusCode: 204,
    });

    const status = vi.fn();
    const response = { status } as unknown as Response;

    await expect(
      controller.forgotPassword({ email: 'local@example.com' } as any, response),
    ).resolves.toBeUndefined();
    expect(status).toHaveBeenCalledWith(204);
  });

  it('resetPassword returns success payload', async () => {
    authServiceMock.resetPassword.mockResolvedValueOnce({ success: true });

    await expect(
      controller.resetPassword({ token: 'raw-token', password: 'Password123!' } as any),
    ).resolves.toEqual({ success: true });
  });
});
