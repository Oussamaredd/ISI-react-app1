const DEFAULT_APP_BASE_URL = 'http://localhost:5173';
const DEFAULT_API_PORT = 3001;
const DEFAULT_AUTH_COOKIE_NAME = 'auth_token';
const OAUTH_CALLBACK_PATH = '/api/auth/google/callback';
const FRONTEND_AUTH_CALLBACK_PATH = '/auth/callback';

export const getEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

export const getGoogleClientId = () =>
  getEnvValue('GOOGLE_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENTID');

export const getGoogleClientSecret = () =>
  getEnvValue('GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CLIENTSECRET');

export const getGoogleCallbackUrl = () => {
  const explicitCallback = getEnvValue(
    'GOOGLE_CALLBACK_URL',
    'GOOGLE_REDIRECT_URI',
    'GOOGLE_OAUTH_CALLBACK_URL',
    'GOOGLE_OAUTH_REDIRECT_URI',
    'GOOGLE_CALLBACK',
  );

  if (explicitCallback) {
    const parsed = new URL(explicitCallback);
    if (parsed.pathname !== OAUTH_CALLBACK_PATH) {
      throw new Error(
        `Invalid GOOGLE_CALLBACK_URL path: expected '${OAUTH_CALLBACK_PATH}', got '${parsed.pathname}'.`,
      );
    }
    return explicitCallback.replace(/\/+$/, '');
  }

  const apiBase = getEnvValue('API_URL', 'API_BASE_URL');
  if (apiBase) {
    const normalized = apiBase.replace(/\/+$/, '');
    return normalized.endsWith('/api')
      ? `${normalized}/auth/google/callback`
      : `${normalized}${OAUTH_CALLBACK_PATH}`;
  }

  const apiHost = getEnvValue('API_HOST');
  const host = apiHost && apiHost !== '0.0.0.0' ? apiHost : 'localhost';
  const port = Number(process.env.API_PORT ?? DEFAULT_API_PORT) || DEFAULT_API_PORT;

  return `http://${host}:${port}${OAUTH_CALLBACK_PATH}`;
};

export const getJwtSecret = () => getEnvValue('JWT_SECRET', 'SESSION_SECRET');

export const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN ?? '7d';

export const getLocalAccessJwtSecret = () =>
  getEnvValue('JWT_ACCESS_SECRET', 'JWT_SECRET', 'SESSION_SECRET');

export const getLocalAccessJwtExpiresIn = () =>
  process.env.JWT_ACCESS_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? '15m';

export const getAuthCookieName = () => process.env.AUTH_COOKIE_NAME ?? DEFAULT_AUTH_COOKIE_NAME;

export const getSessionMaxAge = () => {
  const raw = process.env.SESSION_MAX_AGE;
  const maxAge = raw ? Number(raw) : NaN;
  return Number.isFinite(maxAge) ? maxAge : undefined;
};

export const getCookieSecureFlag = () => {
  if (process.env.SESSION_SECURE) {
    return process.env.SESSION_SECURE.toLowerCase() === 'true';
  }

  return process.env.NODE_ENV === 'production';
};

export const getAppBaseUrl = () => {
  const explicit = getEnvValue('APP_BASE_URL', 'APP_URL', 'CLIENT_ORIGIN', 'FRONTEND_URL', 'WEB_APP_URL');
  if (explicit) {
    return explicit;
  }

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  return corsOrigins[0] ?? DEFAULT_APP_BASE_URL;
};

export const getClientRedirectBase = () => {
  return getAppBaseUrl();
};

export const buildRedirectUrl = (
  authenticated: boolean,
  options?: { errorMessage?: string },
) => {
  const base = getClientRedirectBase().replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('auth', authenticated ? 'true' : 'false');

  if (!authenticated && options?.errorMessage) {
    params.set('error', options.errorMessage);
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${params.toString()}`;
};

export const buildAuthCallbackUrl = (params: {
  code?: string;
  errorMessage?: string;
  nextPath?: string;
}) => {
  const base = getAppBaseUrl().replace(/\/+$/, '');
  const query = new URLSearchParams();

  if (params.code) {
    query.set('code', params.code);
  }

  if (params.errorMessage) {
    query.set('error', params.errorMessage);
  }

  if (params.nextPath && params.nextPath.startsWith('/')) {
    query.set('next', params.nextPath);
  }

  const serialized = query.toString();
  return serialized
    ? `${base}${FRONTEND_AUTH_CALLBACK_PATH}?${serialized}`
    : `${base}${FRONTEND_AUTH_CALLBACK_PATH}`;
};
