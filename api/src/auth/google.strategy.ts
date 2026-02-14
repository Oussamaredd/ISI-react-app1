import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import type { Profile } from 'passport-google-oauth20';

import type { AuthUser } from './auth.types.js';
import {
  getGoogleCallbackUrl,
  getGoogleClientId,
  getGoogleClientSecret,
} from './auth.utils.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly oauthEnabled: boolean;

  constructor() {
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    const oauthEnabled = Boolean(clientId && clientSecret);

    super({
      clientID: clientId ?? 'oauth-disabled',
      clientSecret: clientSecret ?? 'oauth-disabled',
      callbackURL: getGoogleCallbackUrl(),
      scope: ['profile', 'email'],
    });

    this.oauthEnabled = oauthEnabled;
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): AuthUser {
    if (!this.oauthEnabled) {
      throw new Error('Google OAuth is not configured.');
    }

    const profilePayload = profile as Profile & { _json?: { picture?: string | null } };
    const avatarUrl = profile.photos?.[0]?.value ?? profilePayload._json?.picture ?? null;

    return {
      provider: 'google',
      id: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName ?? null,
      avatarUrl,
    };
  }
}
