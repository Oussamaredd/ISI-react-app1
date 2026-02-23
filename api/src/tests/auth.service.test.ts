import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service.js';

describe('AuthService', () => {
  const originalEnv = { ...process.env };

  const usersServiceMock = {
    findByEmail: vi.fn(),
    createLocalUser: vi.fn(),
    getRolesForUser: vi.fn(),
    ensureUserForAuth: vi.fn(),
    updateUserProfile: vi.fn(),
    findById: vi.fn(),
    createPasswordResetToken: vi.fn(),
    consumeAllPasswordResetTokensForUser: vi.fn(),
    findValidPasswordResetTokenByHash: vi.fn(),
    updatePasswordHash: vi.fn(),
    consumePasswordResetToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'oauth-secret';
    process.env.JWT_ACCESS_SECRET = 'local-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.CLIENT_ORIGIN = 'http://localhost:5173';
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates and parses local bearer token from Authorization header', () => {
    const service = new AuthService(usersServiceMock as any);

    const token = service.createLocalAccessToken({
      id: 'user-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    const decoded = service.getAuthUserFromAuthorizationHeader(`Bearer ${token}`);
    expect(decoded).toEqual({
      id: 'user-1',
      provider: 'local',
      email: 'local@example.com',
      name: 'Local User',
      avatarUrl: null,
    });
  });

  it('blocks local signup when email already belongs to Google account', async () => {
    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'google',
      passwordHash: null,
      displayName: 'Google User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      hotelId: 'hotel-1',
    });

    const service = new AuthService(usersServiceMock as any);

    await expect(service.signupLocal('local@example.com', 'Password123!')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns Unauthorized for invalid local login credentials', async () => {
    const { default: bcryptPkg } = await import('bcryptjs');
    const validPasswordHash = await bcryptPkg.hash('Password123!', 10);

    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
      passwordHash: validPasswordHash,
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      hotelId: 'hotel-1',
    });

    const service = new AuthService(usersServiceMock as any);
    await expect(service.loginLocal('local@example.com', 'WrongPass123!')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns dev reset URL outside production and stores only token hash', async () => {
    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
    });

    const service = new AuthService(usersServiceMock as any);
    const response = await service.createPasswordReset('local@example.com');

    expect(response.statusCode).toBe(200);
    expect((response.body as any).devResetUrl).toContain('/reset-password?token=');

    const createCall = usersServiceMock.createPasswordResetToken.mock.calls[0]?.[0];
    expect(createCall.tokenHash).toBeTypeOf('string');
    expect(createCall.tokenHash).not.toContain('http');
  });

  it('returns 204 in production for forgot-password without reset URL', async () => {
    process.env.NODE_ENV = 'production';
    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
    });

    const service = new AuthService(usersServiceMock as any);
    const response = await service.createPasswordReset('local@example.com');

    expect(response).toEqual({ statusCode: 204 });
  });

  it('issues a one-time exchange code for local login and exchanges it for JWT + user', async () => {
    const { default: bcryptPkg } = await import('bcryptjs');
    const validPasswordHash = await bcryptPkg.hash('Password123!', 10);

    usersServiceMock.findByEmail.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      authProvider: 'local',
      passwordHash: validPasswordHash,
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      hotelId: 'hotel-1',
    });

    usersServiceMock.ensureUserForAuth.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      hotelId: 'hotel-1',
    });
    usersServiceMock.getRolesForUser.mockResolvedValueOnce([{ id: 'role-1', name: 'agent' }]);

    const service = new AuthService(usersServiceMock as any);
    const loginResponse = await service.loginLocal('local@example.com', 'Password123!');
    expect(loginResponse.code).toBeTypeOf('string');

    const session = await service.exchangeCode(loginResponse.code);
    expect(session.accessToken).toBeTypeOf('string');
    expect(session.user).toMatchObject({
      id: 'u-1',
      provider: 'local',
      roles: [{ id: 'role-1', name: 'agent' }],
    });

    await expect(service.exchangeCode(loginResponse.code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('updates current user profile display name for local bearer user', async () => {
    const service = new AuthService(usersServiceMock as any);
    const accessToken = service.createLocalAccessToken({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
    });

    usersServiceMock.ensureUserForAuth.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Local User',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      hotelId: 'hotel-1',
    });
    usersServiceMock.updateUserProfile.mockResolvedValueOnce({
      id: 'u-1',
      email: 'local@example.com',
      displayName: 'Updated Name',
      avatarUrl: null,
      role: 'agent',
      isActive: true,
      hotelId: 'hotel-1',
    });
    usersServiceMock.getRolesForUser.mockResolvedValueOnce([{ id: 'role-1', name: 'agent' }]);

    await expect(
      service.updateCurrentUserProfile(
        { headers: { authorization: `Bearer ${accessToken}` } } as any,
        { displayName: 'Updated Name' },
      ),
    ).resolves.toMatchObject({
      id: 'u-1',
      displayName: 'Updated Name',
      roles: [{ id: 'role-1', name: 'agent' }],
    });
  });
});
