import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../auth/auth.service.js';

describe('AuthService', () => {
  const originalEnv = { ...process.env };

  const baseUser = {
    provider: 'google' as const,
    id: 'google-user-42',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.AUTH_COOKIE_NAME;
    delete process.env.SESSION_MAX_AGE;
    delete process.env.SESSION_SECURE;
    delete process.env.CLIENT_ORIGIN;
    delete process.env.CORS_ORIGINS;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when creating token without JWT/SESSION secret', () => {
    const service = new AuthService();
    expect(() => service.createAuthToken(baseUser)).toThrow(
      'JWT_SECRET (or SESSION_SECRET) is required for auth tokens.',
    );
  });

  it('creates and decodes auth token', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    const service = new AuthService();
    const token = service.createAuthToken(baseUser);
    const decoded = service.getAuthUserFromToken(token);

    expect(typeof token).toBe('string');
    expect(decoded).toEqual({
      id: 'google-user-42',
      provider: 'google',
      email: 'user@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('returns null for invalid token payloads', () => {
    process.env.JWT_SECRET = 'test-secret';
    const service = new AuthService();

    expect(service.getAuthUserFromToken('invalid-token')).toBeNull();
  });

  it('extracts auth user from cookie using default cookie name', () => {
    process.env.JWT_SECRET = 'cookie-secret';
    const service = new AuthService();
    const token = service.createAuthToken(baseUser);

    const user = service.getAuthUserFromCookie(`foo=bar; auth_token=${encodeURIComponent(token)}`);
    expect(user?.id).toBe(baseUser.id);
  });

  it('extracts auth user from cookie using custom cookie name', () => {
    process.env.JWT_SECRET = 'cookie-secret';
    process.env.AUTH_COOKIE_NAME = 'session';
    const service = new AuthService();
    const token = service.createAuthToken(baseUser);

    const user = service.getAuthUserFromCookie(`session=${encodeURIComponent(token)}`);
    expect(user?.email).toBe(baseUser.email);
  });

  it('builds cookie options from environment', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.SESSION_MAX_AGE = '7200';
    process.env.NODE_ENV = 'production';
    const service = new AuthService();

    expect(service.getAuthCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 7200,
    });
  });

  it('builds redirect URLs for authenticated and unauthenticated states', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.CLIENT_ORIGIN = 'https://app.example.com/dashboard';
    const service = new AuthService();

    expect(service.getAuthRedirectUrl(true)).toBe('https://app.example.com/dashboard?auth=true');
    expect(service.getAuthRedirectUrl(false)).toBe('https://app.example.com/dashboard?auth=false');
  });
});
