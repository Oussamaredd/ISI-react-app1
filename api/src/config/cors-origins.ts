const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

type ResolveCorsOriginsOptions = {
  corsOrigins?: string;
  clientOrigin?: string;
  nodeEnv?: string;
};

const normalizeNodeEnv = (nodeEnv?: string) => nodeEnv?.trim().toLowerCase() ?? 'development';

const normalizePathname = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : '/';
};

const isLocalhostHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';

const normalizeCorsOrigin = (origin: string, options: { requireHttps: boolean }) => {
  if (origin === '*') {
    throw new Error('CORS_ORIGINS does not support wildcard (*) when credentials are enabled.');
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid CORS origin URL: '${origin}'.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid CORS origin protocol for '${origin}': use http or https.`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`Invalid CORS origin '${origin}': credentials in URL are not allowed.`);
  }

  if (parsed.search || parsed.hash) {
    throw new Error(`Invalid CORS origin '${origin}': query string and hash are not allowed.`);
  }

  const pathname = normalizePathname(parsed.pathname);
  if (pathname !== '/') {
    throw new Error(`Invalid CORS origin '${origin}': path segments are not allowed.`);
  }

  if (options.requireHttps && parsed.protocol !== 'https:' && !isLocalhostHost(parsed.hostname)) {
    throw new Error(`Invalid CORS origin '${origin}': production origins must use https.`);
  }

  return `${parsed.protocol}//${parsed.host}`;
};

export const resolveCorsOrigins = (options: ResolveCorsOriginsOptions): string[] => {
  const nodeEnv = normalizeNodeEnv(options.nodeEnv);
  const rawOrigins = options.corsOrigins ?? options.clientOrigin;
  const isProduction = nodeEnv === 'production';

  if (!rawOrigins || rawOrigins.trim().length === 0) {
    if (isProduction) {
      throw new Error('CORS_ORIGINS must be explicitly configured in production.');
    }

    return [DEFAULT_CORS_ORIGIN];
  }

  const parsedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeCorsOrigin(origin, { requireHttps: isProduction }));

  if (parsedOrigins.length === 0) {
    if (isProduction) {
      throw new Error('CORS_ORIGINS must contain at least one valid origin in production.');
    }

    return [DEFAULT_CORS_ORIGIN];
  }

  return [...new Set(parsedOrigins)];
};
