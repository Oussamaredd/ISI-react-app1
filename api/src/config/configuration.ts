function requireEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 120;
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_LOG_FORMAT: AppConfig['logging']['format'] = 'json';

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeLogLevel = (value: string | undefined): string => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_LOG_LEVEL;
  }

  return ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(normalized)
    ? normalized
    : DEFAULT_LOG_LEVEL;
};

const normalizeLogFormat = (
  value: string | undefined,
  nodeEnv: string | undefined,
): AppConfig['logging']['format'] => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'pretty' || normalized === 'json') {
    return normalized;
  }

  return nodeEnv?.trim().toLowerCase() === 'production' ? DEFAULT_LOG_FORMAT : 'pretty';
};

export type AppConfig = {
  nodeEnv: string;
  api: {
    port: number;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  database: {
    url: string;
  };
  logging: {
    level: string;
    format: 'json' | 'pretty';
  };
};

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    port: Number(process.env.API_PORT ?? process.env.PORT ?? 3001),
    rateLimit: {
      windowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
      maxRequests: toPositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_RATE_LIMIT_MAX_REQUESTS),
    },
  },
  database: {
    url: requireEnv('DATABASE_URL'),
  },
  logging: {
    level: normalizeLogLevel(process.env.LOG_LEVEL),
    format: normalizeLogFormat(process.env.LOG_FORMAT, process.env.NODE_ENV),
  },
});
