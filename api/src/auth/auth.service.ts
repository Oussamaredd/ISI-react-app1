import { randomBytes, createHash } from 'node:crypto';

import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcryptPkg from 'bcryptjs';
import type { Request } from 'express';
import jwtPkg from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';

import { UsersService } from '../users/users.service.js';

import type { AuthTokenPayload, AuthUser } from './auth.types.js';
import {
  buildAuthCallbackUrl,
  buildRedirectUrl,
  getAuthCookieName,
  getCookieSecureFlag,
  getJwtExpiresIn,
  getJwtSecret,
  getLocalAccessJwtExpiresIn,
  getLocalAccessJwtSecret,
  getSessionMaxAge,
} from './auth.utils.js';

const { sign, verify } = jwtPkg as any;
const { compare, hash } = bcryptPkg as unknown as {
  compare: (plaintext: string, hash: string) => Promise<boolean>;
  hash: (plaintext: string, rounds: number) => Promise<string>;
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const GOOGLE_ACCOUNT_LOGIN_MESSAGE =
  'This email is registered with Google sign-in. Please continue with Google.';
const LOCAL_ACCOUNT_GOOGLE_BLOCK_MESSAGE =
  'This email is registered with email/password. Please sign in with your password.';
const GOOGLE_EMAIL_CONFLICT_MESSAGE =
  'This email is already registered with Google sign-in. Please continue with Google.';
const INVALID_RESET_TOKEN_MESSAGE = 'Reset token is invalid or expired.';
const INVALID_EXCHANGE_CODE_MESSAGE = 'Sign-in code is invalid or expired.';
const PASSWORD_RESET_EXPIRY_MINUTES = 30;
const ACCESS_TOKEN_TYPE = 'access';
const LEGACY_LOCAL_TOKEN_TYPE = 'local_access';
const OAUTH_TOKEN_TYPE = 'oauth_session';
const EXCHANGE_CODE_BYTES = 24;
const EXCHANGE_CODE_TTL_MS = 60_000;

type LocalAuthSuccess = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    roles: Array<{ id: string; name: string }>;
    isActive: boolean;
    hotelId: string;
    provider: 'local' | 'google';
  };
};

type AuthExchangeCode = {
  code: string;
};

type ExchangeCodeRecord = {
  user: AuthUser;
  expiresAt: number;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret: Secret | undefined = getJwtSecret() as Secret | undefined;
  private readonly jwtExpiresIn: SignOptions['expiresIn'] =
    getJwtExpiresIn() as SignOptions['expiresIn'];
  private readonly localAccessJwtSecret: Secret | undefined =
    getLocalAccessJwtSecret() as Secret | undefined;
  private readonly localAccessJwtExpiresIn: SignOptions['expiresIn'] =
    getLocalAccessJwtExpiresIn() as SignOptions['expiresIn'];
  private readonly cookieName = getAuthCookieName();
  private readonly exchangeCodeStore = new Map<string, ExchangeCodeRecord>();

  constructor(private readonly usersService: UsersService) {}

  getSupportedProviders() {
    return ['google', 'local'];
  }

  getAuthCookieName() {
    return this.cookieName;
  }

  getAuthCookieOptions() {
    const maxAge = getSessionMaxAge();

    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: getCookieSecureFlag(),
      ...(maxAge ? { maxAge } : {}),
    };
  }

  createAuthToken(user: AuthUser) {
    const secret = this.jwtSecret;
    if (!secret) {
      throw new Error('JWT_SECRET (or SESSION_SECRET) is required for auth tokens.');
    }

    const payload: AuthTokenPayload = {
      sub: user.id,
      provider: user.provider,
      email: user.email ?? null,
      name: user.name ?? null,
      picture: user.avatarUrl ?? null,
      tokenType: OAUTH_TOKEN_TYPE,
    };

    const expiresIn = this.jwtExpiresIn;
    return sign(payload, secret, expiresIn ? { expiresIn } : undefined);
  }

  createAccessToken(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    provider: 'local' | 'google';
  }) {
    const secret = this.localAccessJwtSecret;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET (or JWT_SECRET/SESSION_SECRET fallback) is required.');
    }

    const payload: AuthTokenPayload = {
      sub: user.id,
      provider: user.provider,
      email: user.email,
      name: user.displayName,
      picture: user.avatarUrl ?? null,
      tokenType: ACCESS_TOKEN_TYPE,
    };

    const expiresIn = this.localAccessJwtExpiresIn;
    return sign(payload, secret, expiresIn ? { expiresIn } : undefined);
  }

  createLocalAccessToken(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  }) {
    return this.createAccessToken({
      ...user,
      provider: 'local',
    });
  }

  getAuthUserFromToken(token?: string) {
    const secret = this.jwtSecret;
    if (!token || !secret) {
      return null;
    }

    try {
      const decoded = verify(token, secret);
      if (typeof decoded === 'string') {
        return null;
      }

      const payload = decoded as AuthTokenPayload;
      if (payload.tokenType && payload.tokenType !== OAUTH_TOKEN_TYPE) {
        return null;
      }

      return {
        id: payload.sub,
        provider: payload.provider === 'local' ? 'local' : 'google',
        email: payload.email ?? null,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      } satisfies AuthUser;
    } catch {
      return null;
    }
  }

  getLocalAuthUserFromToken(token?: string) {
    const secret = this.localAccessJwtSecret;
    if (!token || !secret) {
      return null;
    }

    try {
      const decoded = verify(token, secret);
      if (typeof decoded === 'string') {
        return null;
      }

      const payload = decoded as AuthTokenPayload;
      if (
        payload.tokenType &&
        payload.tokenType !== ACCESS_TOKEN_TYPE &&
        payload.tokenType !== LEGACY_LOCAL_TOKEN_TYPE
      ) {
        return null;
      }

      return {
        id: payload.sub,
        provider: payload.provider === 'google' ? 'google' : 'local',
        email: payload.email ?? null,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      } satisfies AuthUser;
    } catch {
      return null;
    }
  }

  getAuthUserFromCookie(cookieHeader?: string) {
    if (!cookieHeader) {
      return null;
    }

    const token = this.extractCookieValue(cookieHeader, this.cookieName);
    return this.getAuthUserFromToken(token);
  }

  getAuthUserFromAuthorizationHeader(authorizationHeader?: string) {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.trim().split(/\s+/);
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
      return null;
    }

    return this.getLocalAuthUserFromToken(token);
  }

  getAuthUserFromRequest(request: Pick<Request, 'headers'>) {
    const bearerUser = this.getAuthUserFromAuthorizationHeader(request.headers.authorization);
    if (bearerUser) {
      return bearerUser;
    }

    return this.getAuthUserFromCookie(request.headers.cookie);
  }

  getAuthRedirectUrl(authenticated: boolean, options?: { errorMessage?: string }) {
    return buildRedirectUrl(authenticated, options);
  }

  getAuthCallbackUrl(params: { code?: string; errorMessage?: string; nextPath?: string }) {
    return buildAuthCallbackUrl(params);
  }

  async signupLocal(email: string, password: string, displayName?: string): Promise<LocalAuthSuccess> {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.usersService.findByEmail(normalizedEmail);

    if (existing) {
      if (existing.authProvider === 'google') {
        throw new ConflictException(GOOGLE_EMAIL_CONFLICT_MESSAGE);
      }
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await this.hashPassword(password);
    const createdUser = await this.usersService.createLocalUser({
      email: normalizedEmail,
      passwordHash,
      displayName,
    });

    if (!createdUser) {
      throw new Error('Failed to create user');
    }

    const roles = await this.usersService.getRolesForUser(createdUser.id);
    const serialized = this.serializeUser(createdUser, roles, 'local');

    return {
      accessToken: this.createAccessToken(serialized),
      user: serialized,
    };
  }

  async loginLocal(email: string, password: string): Promise<AuthExchangeCode> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.authProvider === 'google' && !user.passwordHash) {
      throw new ConflictException(GOOGLE_ACCOUNT_LOGIN_MESSAGE);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.isActive === false) {
      throw new ForbiddenException('User account is inactive');
    }

    const exchangeCode = this.issueExchangeCode({
      provider: 'local',
      id: user.id,
      email: user.email,
      name: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    });

    return { code: exchangeCode };
  }

  async getCurrentUser(request: Pick<Request, 'headers'>) {
    const authUser = this.getAuthUserFromRequest(request);
    if (!authUser) {
      throw new UnauthorizedException();
    }

    const dbUser = await this.usersService.ensureUserForAuth(authUser);
    if (!dbUser) {
      throw new UnauthorizedException();
    }

    if (dbUser.isActive === false) {
      throw new ForbiddenException('User account is inactive');
    }

    const roles = await this.usersService.getRolesForUser(dbUser.id);
    const provider = dbUser.authProvider === 'google' ? 'google' : 'local';
    return this.serializeUser(dbUser, roles, provider);
  }

  async updateCurrentUserProfile(
    request: Pick<Request, 'headers'>,
    params: { displayName: string },
  ) {
    const authUser = this.getAuthUserFromRequest(request);
    if (!authUser) {
      throw new UnauthorizedException();
    }

    const dbUser = await this.usersService.ensureUserForAuth(authUser);
    if (!dbUser) {
      throw new UnauthorizedException();
    }

    if (dbUser.isActive === false) {
      throw new ForbiddenException('User account is inactive');
    }

    const updatedUser = await this.usersService.updateUserProfile(dbUser.id, params);
    const roles = await this.usersService.getRolesForUser(updatedUser.id);
    const provider = updatedUser.authProvider === 'google' ? 'google' : 'local';
    return this.serializeUser(updatedUser, roles, provider);
  }

  async ensureGoogleSignInAllowed(user: AuthUser) {
    const normalizedEmail = this.normalizeOptionalEmail(user.email);
    if (!normalizedEmail) {
      return;
    }

    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing?.authProvider === 'local') {
      throw new ConflictException(LOCAL_ACCOUNT_GOOGLE_BLOCK_MESSAGE);
    }
  }

  issueExchangeCode(user: AuthUser) {
    this.pruneExpiredExchangeCodes();
    const code = randomBytes(EXCHANGE_CODE_BYTES).toString('base64url');
    this.exchangeCodeStore.set(code, {
      user,
      expiresAt: Date.now() + EXCHANGE_CODE_TTL_MS,
    });
    return code;
  }

  async exchangeCode(code: string): Promise<LocalAuthSuccess> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new UnauthorizedException(INVALID_EXCHANGE_CODE_MESSAGE);
    }

    this.pruneExpiredExchangeCodes();

    const record = this.exchangeCodeStore.get(normalizedCode);
    if (!record) {
      throw new UnauthorizedException(INVALID_EXCHANGE_CODE_MESSAGE);
    }

    this.exchangeCodeStore.delete(normalizedCode);

    const dbUser = await this.usersService.ensureUserForAuth(record.user);
    if (!dbUser) {
      throw new UnauthorizedException(INVALID_EXCHANGE_CODE_MESSAGE);
    }

    if (dbUser.isActive === false) {
      throw new ForbiddenException('User account is inactive');
    }

    const roles = await this.usersService.getRolesForUser(dbUser.id);
    const serialized = this.serializeUser(dbUser, roles, record.user.provider);

    return {
      accessToken: this.createAccessToken(serialized),
      user: serialized,
    };
  }

  async createPasswordReset(email: string) {
    const normalizedEmail = this.normalizeOptionalEmail(email);
    if (!normalizedEmail) {
      return this.buildForgotPasswordResponse();
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || user.authProvider !== 'local') {
      return this.buildForgotPasswordResponse();
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

    await this.usersService.consumeAllPasswordResetTokensForUser(user.id);
    await this.usersService.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return this.buildForgotPasswordResponse(token);
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashResetToken(token);
    const resetToken = await this.usersService.findValidPasswordResetTokenByHash(tokenHash);

    if (!resetToken) {
      throw new UnauthorizedException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const user = await this.usersService.findById(resetToken.userId);
    if (!user) {
      throw new UnauthorizedException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const passwordHash = await this.hashPassword(password);
    await this.usersService.updatePasswordHash(user.id, passwordHash);
    await this.usersService.consumePasswordResetToken(resetToken.id);
    await this.usersService.consumeAllPasswordResetTokensForUser(user.id);

    return { success: true };
  }

  private serializeUser(
    user: {
      id: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
      role: string;
      isActive: boolean;
      hotelId: string;
    },
    roles: Array<{ id: string; name: string }>,
    provider: 'local' | 'google',
  ) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      roles: roles.map((role) => ({ id: role.id, name: role.name })),
      isActive: user.isActive,
      hotelId: user.hotelId,
      provider,
    };
  }

  private pruneExpiredExchangeCodes() {
    const now = Date.now();
    for (const [code, record] of this.exchangeCodeStore.entries()) {
      if (record.expiresAt <= now) {
        this.exchangeCodeStore.delete(code);
      }
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeOptionalEmail(email?: string | null) {
    if (!email) {
      return undefined;
    }

    const normalized = email.trim().toLowerCase();
    return normalized || undefined;
  }

  private async hashPassword(password: string) {
    return hash(password, 10);
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildForgotPasswordResponse(rawToken?: string) {
    if (this.isProduction()) {
      return { statusCode: 204 as const };
    }

    if (!rawToken) {
      return { statusCode: 200 as const, body: { success: true } };
    }

    const baseUrl = this.getAuthRedirectUrl(false).replace(/\?.*$/, '');
    const separator = baseUrl.includes('?') ? '&' : '?';
    const devResetUrl = `${baseUrl.replace(/\/+$/, '')}/reset-password${separator}token=${encodeURIComponent(rawToken)}`;
    return { statusCode: 200 as const, body: { devResetUrl } };
  }

  private isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  private extractCookieValue(cookieHeader: string, cookieName: string) {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === cookieName) {
        return decodeURIComponent(valueParts.join('='));
      }
    }
    return undefined;
  }
}
