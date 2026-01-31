import { Injectable } from '@nestjs/common';
import jwtPkg from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import type { AuthTokenPayload, AuthUser } from './auth.types.js';
import {
  buildRedirectUrl,
  getAuthCookieName,
  getCookieSecureFlag,
  getJwtExpiresIn,
  getJwtSecret,
  getSessionMaxAge,
} from './auth.utils.js';

const { sign, verify } = jwtPkg as any;

@Injectable()
export class AuthService {
  private readonly jwtSecret: Secret | undefined = getJwtSecret() as Secret | undefined;
  private readonly jwtExpiresIn: SignOptions['expiresIn'] =
    getJwtExpiresIn() as SignOptions['expiresIn'];
  private readonly cookieName = getAuthCookieName();

  getSupportedProviders() {
    return ['google'];
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
    };

    const expiresIn = this.jwtExpiresIn;
    return sign(payload, secret, expiresIn ? { expiresIn } : undefined);
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

      return {
        id: payload.sub,
        provider: 'google',
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

  getAuthRedirectUrl(authenticated: boolean) {
    return buildRedirectUrl(authenticated);
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
