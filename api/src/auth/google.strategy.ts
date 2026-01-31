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
  constructor() {
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth env vars are missing (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).');
    }

    super({
      clientID: clientId,
      clientSecret,
      callbackURL: getGoogleCallbackUrl(),
      scope: ['profile', 'email'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): AuthUser {
    return {
      provider: 'google',
      id: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
