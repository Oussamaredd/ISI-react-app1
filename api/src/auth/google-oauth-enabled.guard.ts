import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common';

import { getGoogleClientId, getGoogleClientSecret } from './auth.utils.js';

@Injectable()
export class GoogleOAuthEnabledGuard implements CanActivate {
  canActivate() {
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException('Google OAuth is not configured.');
    }

    return true;
  }
}
