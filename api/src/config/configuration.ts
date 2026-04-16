import { resolveApiPort } from './api-port.js';
import { loadIotIngestionConfig, type IotIngestionConfig } from './iot-ingestion.js';

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
const DEFAULT_LOGSTASH_HOST = 'logstash';
const DEFAULT_LOGSTASH_PORT = 5001;
const DEFAULT_ROUTING_API_BASE_URL = 'https://router.project-osrm.org';
const DEFAULT_ROUTING_TIMEOUT_MS = 10_000;
const DEFAULT_ROUTING_FAILURE_THRESHOLD = 5;
const DEFAULT_ROUTING_RESET_WINDOW_MS = 30_000;
const DEFAULT_OTEL_SERVICE_NAME = 'ecotrack-api';
const DEFAULT_OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
const DEFAULT_OTEL_TRACES_SAMPLER_RATIO = 1;

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
    directUrl: string;
    maxConnections: number;
    poolerUrl: string | null;
    url: string;
  };
  cache: {
    analyticsTtlSeconds: number;
    citizenTtlSeconds: number;
    dashboardTtlSeconds: number;
    defaultTtlSeconds: number;
    enabled: boolean;
    maxMemoryEntries: number;
    planningTtlSeconds: number;
    prefix: string;
    redisUrl: string | null;
  };
  logging: {
    level: string;
    format: 'json' | 'pretty';
    logstash: {
      enabled: boolean;
      host: string;
      port: number;
    };
  };
  observability: {
    tracing: {
      enabled: boolean;
      serviceName: string;
      exporterOtlpEndpoint: string;
      samplingRatio: number;
    };
  };
  transport: {
    compression: {
      enabled: boolean;
      level: number;
      thresholdBytes: number;
    };
  };
  routing: {
    baseUrl: string;
    circuitBreaker: {
      timeoutMs: number;
      failureThreshold: number;
      resetWindowMs: number;
    };
  };
  iotIngestion: IotIngestionConfig;
};

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    port: resolveApiPort(process.env as Record<string, unknown>),
    rateLimit: {
      windowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
      maxRequests: toPositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_RATE_LIMIT_MAX_REQUESTS),
    },
  },
  database: {
    directUrl: requireEnv('DATABASE_URL'),
    maxConnections: toPositiveInt(process.env.DATABASE_POOL_MAX, 5),
    poolerUrl: process.env.DATABASE_POOLER_URL?.trim() || null,
    url: process.env.DATABASE_POOLER_URL?.trim() || requireEnv('DATABASE_URL'),
  },
  cache: {
    analyticsTtlSeconds: toPositiveInt(process.env.CACHE_ANALYTICS_TTL_SECONDS, 60),
    citizenTtlSeconds: toPositiveInt(process.env.CACHE_CITIZEN_TTL_SECONDS, 30),
    dashboardTtlSeconds: toPositiveInt(process.env.CACHE_DASHBOARD_TTL_SECONDS, 30),
    defaultTtlSeconds: toPositiveInt(process.env.CACHE_DEFAULT_TTL_SECONDS, 60),
    enabled: process.env.CACHE_ENABLED?.trim().toLowerCase() !== 'false',
    maxMemoryEntries: toPositiveInt(process.env.CACHE_MAX_MEMORY_ENTRIES, 250),
    planningTtlSeconds: toPositiveInt(process.env.CACHE_PLANNING_TTL_SECONDS, 20),
    prefix: process.env.CACHE_PREFIX?.trim() || 'ecotrack',
    redisUrl: process.env.CACHE_REDIS_URL?.trim() || null,
  },
  logging: {
    level: normalizeLogLevel(process.env.LOG_LEVEL),
    format: normalizeLogFormat(process.env.LOG_FORMAT, process.env.NODE_ENV),
    logstash: {
      enabled: process.env.ENABLE_LOGSTASH?.trim().toLowerCase() === 'true',
      host: process.env.LOGSTASH_HOST?.trim() || DEFAULT_LOGSTASH_HOST,
      port: toPositiveInt(process.env.LOGSTASH_PORT, DEFAULT_LOGSTASH_PORT),
    },
  },
  observability: {
    tracing: {
      enabled: process.env.OTEL_TRACING_ENABLED?.trim().toLowerCase() === 'true',
      serviceName: process.env.OTEL_SERVICE_NAME?.trim() || DEFAULT_OTEL_SERVICE_NAME,
      exporterOtlpEndpoint:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || DEFAULT_OTEL_EXPORTER_OTLP_ENDPOINT,
      samplingRatio: (() => {
        const parsed = Number(process.env.OTEL_TRACES_SAMPLER_RATIO);
        return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
          ? parsed
          : DEFAULT_OTEL_TRACES_SAMPLER_RATIO;
      })(),
    },
  },
  transport: {
    compression: {
      enabled: process.env.RESPONSE_COMPRESSION_ENABLED?.trim().toLowerCase() !== 'false',
      level: (() => {
        const parsed = Number(process.env.RESPONSE_COMPRESSION_LEVEL);
        return Number.isInteger(parsed) && parsed >= -1 && parsed <= 9 ? parsed : 6;
      })(),
      thresholdBytes: toPositiveInt(process.env.RESPONSE_COMPRESSION_THRESHOLD_BYTES, 1024),
    },
  },
  routing: {
    baseUrl: process.env.ROUTING_API_BASE_URL ?? DEFAULT_ROUTING_API_BASE_URL,
    circuitBreaker: {
      timeoutMs: toPositiveInt(process.env.ROUTING_TIMEOUT_MS, DEFAULT_ROUTING_TIMEOUT_MS),
      failureThreshold: toPositiveInt(process.env.ROUTING_FAILURE_THRESHOLD, DEFAULT_ROUTING_FAILURE_THRESHOLD),
      resetWindowMs: toPositiveInt(process.env.ROUTING_RESET_WINDOW_MS, DEFAULT_ROUTING_RESET_WINDOW_MS),
    },
  },
  iotIngestion: loadIotIngestionConfig(process.env as Record<string, unknown>),
});
