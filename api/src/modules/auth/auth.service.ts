import { randomBytes, createHash } from 'node:crypto';

import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcryptPkg from 'bcryptjs';
import type { Request } from 'express';
import jwtPkg from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';

import { trimTrailingSlashes } from '../../config/public-api-url.js';
import { withActiveSpan } from '../../observability/tracing.helpers.js';
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
import type { AuthenticatedRequestUser } from './authorization.types.js';

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
const CURRENT_PASSWORD_INCORRECT_MESSAGE = 'Current password is incorrect.';
const PASSWORD_CHANGE_LOCAL_ONLY_MESSAGE = 'Password changes are available only for email/password accounts.';
const PASSWORD_RESET_EXPIRY_MINUTES = 30;
const ACCESS_TOKEN_TYPE = 'access';
const LEGACY_LOCAL_TOKEN_TYPE = 'local_access';
const OAUTH_TOKEN_TYPE = 'oauth_session';
const STREAM_SESSION_TOKEN_TYPE = 'planning_stream_session';
const WEBSOCKET_SESSION_TOKEN_TYPE = 'planning_ws_session';
const EXCHANGE_CODE_BYTES = 24;
const EXCHANGE_CODE_TTL_MS = 60_000;
const STREAM_SESSION_TTL_MS = 120_000;

const stripQueryString = (value: string) => {
  const queryIndex = value.indexOf('?');
  return queryIndex === -1 ? value : value.slice(0, queryIndex);
};

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
    provider: 'local' | 'google';
  };
};

type AuthExchangeCode = {
  code: string;
};

type LocalLoginSuccess = AuthExchangeCode & LocalAuthSuccess;

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

  getAuthUserFromRequest(
    request: Pick<Request, 'headers'> & {
      query?: Request['query'];
      path?: string;
      originalUrl?: string;
      url?: string;
    },
  ) {
    const bearerUser = this.getAuthUserFromAuthorizationHeader(request.headers.authorization);
    if (bearerUser) {
      return bearerUser;
    }

    const rawStreamSessionToken = request.query?.stream_session ?? request.query?.session_token;
    const streamSessionToken =
      typeof rawStreamSessionToken === 'string'
        ? rawStreamSessionToken
        : Array.isArray(rawStreamSessionToken)
          ? rawStreamSessionToken[0]
          : undefined;

    if (typeof streamSessionToken === 'string' && streamSessionToken.trim().length > 0) {
      const streamSessionUser = this.getAuthUserFromStreamSessionToken(
        streamSessionToken.trim(),
        request.path ?? request.originalUrl ?? request.url,
      );
      if (streamSessionUser) {
        return streamSessionUser;
      }
    }

    return this.getAuthUserFromCookie(request.headers.cookie);
  }

  getAuthRedirectUrl(authenticated: boolean, options?: { errorMessage?: string }) {
    return buildRedirectUrl(authenticated, options);
  }

  getAuthCallbackUrl(params: { code?: string; errorMessage?: string; nextPath?: string }) {
    return buildAuthCallbackUrl(params);
  }

  async enrichAuthUser(user: AuthUser) {
    try {
      const dbUser = await this.usersService.ensureUserForAuth(user);
      if (!dbUser) {
        return user;
      }

      const roles = await this.usersService.getRolesForUser(dbUser.id);

      return {
        ...user,
        provider: dbUser.authProvider === 'google' ? 'google' : 'local',
        role: dbUser.role ?? null,
        roles: roles.map((role) => ({ id: role.id, name: role.name })),
        isActive: dbUser.isActive ?? true,
      };
    } catch (error) {
      console.error('Failed to enrich auth user:', error);
      return user;
    }
  }

  async resolveActiveUserFromRequest(
    request: Pick<Request, 'headers'> & {
      query?: Request['query'];
      path?: string;
      originalUrl?: string;
      url?: string;
    },
  ) {
    const authUser = this.getAuthUserFromRequest(request);
    if (!authUser) {
      return null;
    }

    return this.requireActiveAuthenticatedRequestUser(authUser);
  }

  async resolveActiveUserFromPlanningWebSocketSessionToken(token: string) {
    const authUser = this.getAuthUserFromPlanningWebSocketSessionToken(token);
    if (!authUser) {
      return null;
    }

    return this.requireActiveAuthenticatedRequestUser(authUser);
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
      defaultRoleName: 'citizen',
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

  async loginLocal(email: string, password: string): Promise<LocalLoginSuccess> {
    return withActiveSpan(
      'auth.login_local',
      async () => {
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

        const roles = await this.usersService.getRolesForUser(user.id);
        const serialized = this.serializeUser(user, roles, 'local');

        return {
          code: exchangeCode,
          accessToken: this.createAccessToken(serialized),
          user: serialized,
        };
      },
      {
        attributes: {
          'auth.provider': 'local',
          'auth.email_domain': this.normalizeEmail(email).split('@')[1] ?? 'unknown',
        },
      },
    );
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
    params: { displayName: string; avatarUrl?: string },
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

  async changeCurrentUserPassword(
    request: Pick<Request, 'headers'>,
    params: { currentPassword: string; newPassword: string },
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

    if (dbUser.authProvider !== 'local' || !dbUser.passwordHash) {
      throw new ForbiddenException(PASSWORD_CHANGE_LOCAL_ONLY_MESSAGE);
    }

    const currentPassword = params.currentPassword;
    const newPassword = params.newPassword;

    const isCurrentPasswordValid = await compare(currentPassword, dbUser.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException(CURRENT_PASSWORD_INCORRECT_MESSAGE);
    }

    const isReusedPassword = await compare(newPassword, dbUser.passwordHash);
    if (isReusedPassword) {
      throw new BadRequestException('New password must be different from your current password.');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.usersService.updatePasswordHash(dbUser.id, passwordHash);
    await this.usersService.consumeAllPasswordResetTokensForUser(dbUser.id);

    return { success: true };
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

  issuePlanningStreamSession(userId: string) {
    return this.issuePlanningRealtimeSession(userId, STREAM_SESSION_TOKEN_TYPE);
  }

  issuePlanningWebSocketSession(userId: string) {
    return this.issuePlanningRealtimeSession(userId, WEBSOCKET_SESSION_TOKEN_TYPE);
  }

  getAuthUserFromPlanningWebSocketSessionToken(token: string) {
    return this.getAuthUserFromPlanningSessionTokenByType(token, WEBSOCKET_SESSION_TOKEN_TYPE);
  }

  private issuePlanningRealtimeSession(
    userId: string,
    tokenType: typeof STREAM_SESSION_TOKEN_TYPE | typeof WEBSOCKET_SESSION_TOKEN_TYPE,
  ) {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      throw new UnauthorizedException();
    }

    const secret = this.localAccessJwtSecret;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET (or JWT_SECRET/SESSION_SECRET fallback) is required.');
    }

    const expiresAt = Date.now() + STREAM_SESSION_TTL_MS;
    const token = sign(
      {
        sub: normalizedUserId,
        provider: 'local',
        tokenType,
      } satisfies AuthTokenPayload,
      secret,
      {
        expiresIn: Math.floor(STREAM_SESSION_TTL_MS / 1000),
      },
    );

    return {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInSeconds: Math.floor(STREAM_SESSION_TTL_MS / 1000),
    };
  }

  async exchangeCode(code: string): Promise<LocalAuthSuccess> {
    return withActiveSpan(
      'auth.exchange_code',
      async () => {
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
      },
      {
        attributes: {
          'auth.provider': 'exchange_code',
        },
      },
    );
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
      provider,
    };
  }

  private async requireActiveAuthenticatedRequestUser(authUser: AuthUser) {
    const resolvedUser = await this.resolveAuthenticatedRequestUser(authUser);
    if (!resolvedUser) {
      return null;
    }

    if (resolvedUser.isActive === false) {
      throw new ForbiddenException('User account is inactive');
    }

    return resolvedUser;
  }

  private async resolveAuthenticatedRequestUser(authUser: AuthUser): Promise<AuthenticatedRequestUser | null> {
    const dbUser = await this.usersService.ensureUserForAuth(authUser);
    if (!dbUser) {
      return null;
    }

    const dbRoles = await this.usersService.getRolesForUser(dbUser.id);

    return {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      role: dbUser.role,
      roles: dbRoles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
      permissions: this.collectPermissions(dbRoles),
      isActive: dbUser.isActive,
    };
  }

  private collectPermissions(
    roles: Array<{ permissions?: unknown }>,
  ) {
    const permissions = new Set<string>();

    for (const role of roles) {
      if (!Array.isArray(role.permissions)) {
        continue;
      }

      for (const permission of role.permissions) {
        if (typeof permission === 'string' && permission.trim().length > 0) {
          permissions.add(permission.trim().toLowerCase());
        }
      }
    }

    return Array.from(permissions);
  }

  private pruneExpiredExchangeCodes() {
    const now = Date.now();
    for (const [code, record] of this.exchangeCodeStore.entries()) {
      if (record.expiresAt <= now) {
        this.exchangeCodeStore.delete(code);
      }
    }
  }

  private getAuthUserFromStreamSessionToken(token: string, requestPath?: string) {
    if (!this.isPlanningStreamPath(requestPath)) {
      return null;
    }

    return this.getAuthUserFromPlanningSessionTokenByType(token, STREAM_SESSION_TOKEN_TYPE);
  }

  private getAuthUserFromPlanningSessionTokenByType(
    token: string,
    tokenType: typeof STREAM_SESSION_TOKEN_TYPE | typeof WEBSOCKET_SESSION_TOKEN_TYPE,
  ) {

    const secret = this.localAccessJwtSecret;
    if (!secret) {
      return null;
    }

    try {
      const decoded = verify(token, secret);
      if (typeof decoded === 'string') {
        return null;
      }

      const payload = decoded as AuthTokenPayload;
      if (payload.tokenType !== tokenType || !payload.sub) {
        return null;
      }

      return {
        id: payload.sub,
        provider: 'local',
        email: null,
        name: null,
        avatarUrl: null,
      } satisfies AuthUser;
    } catch {
      return null;
    }
  }

  private isPlanningStreamPath(pathname?: string) {
    if (!pathname) {
      return false;
    }

    const sanitized = pathname.split('?')[0] ?? '';
    return /\/planning\/stream\/?$/.test(sanitized);
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

    const baseUrl = stripQueryString(this.getAuthRedirectUrl(false));
    const separator = baseUrl.includes('?') ? '&' : '?';
    const devResetUrl = `${trimTrailingSlashes(baseUrl)}/reset-password${separator}token=${encodeURIComponent(rawToken)}`;
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

