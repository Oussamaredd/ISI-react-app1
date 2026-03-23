export const OAUTH_CALLBACK_PATH = '/api/auth/google/callback';

const ALLOWED_PUBLIC_API_PATHS = new Set(['/', '/api']);

export const trimTrailingSlashes = (value: string) => {
  let endIndex = value.length;

  while (endIndex > 0 && value.charCodeAt(endIndex - 1) === 47) {
    endIndex -= 1;
  }

  return endIndex === value.length ? value : value.slice(0, endIndex);
};

const normalizePathname = (pathname: string) => {
  const trimmed = trimTrailingSlashes(pathname);
  return trimmed.length > 0 ? trimmed : '/';
};

export const parsePublicApiBaseUrl = (apiBaseUrl: string, key = 'API_BASE_URL') => {
  const trimmed = apiBaseUrl.trim();
  if (!trimmed) {
    throw new Error(`${key} must be a valid URL when provided.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${key} must be a valid URL when provided.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${key} must use http or https.`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${key} must not include credentials.`);
  }

  if (parsed.search || parsed.hash) {
    throw new Error(`${key} must not include query or hash.`);
  }

  const normalizedPath = normalizePathname(parsed.pathname);
  if (!ALLOWED_PUBLIC_API_PATHS.has(normalizedPath)) {
    throw new Error(`${key} path must be '/' or '/api' (received '${normalizedPath}').`);
  }

  return parsed;
};

export const normalizePublicApiBaseUrl = (apiBaseUrl: string, key = 'API_BASE_URL') => {
  const parsed = parsePublicApiBaseUrl(apiBaseUrl, key);
  const normalizedPath = normalizePathname(parsed.pathname);

  return normalizedPath === '/api' ? `${parsed.origin}/api` : parsed.origin;
};

export const buildOAuthCallbackUrlFromApiBase = (apiBaseUrl: string, key = 'API_BASE_URL') => {
  const normalizedBase = normalizePublicApiBaseUrl(apiBaseUrl, key);

  return normalizedBase.endsWith('/api')
    ? `${normalizedBase}/auth/google/callback`
    : `${normalizedBase}${OAUTH_CALLBACK_PATH}`;
};
