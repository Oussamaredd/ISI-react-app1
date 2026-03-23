import { z } from 'zod';

import { resolveCorsOrigins } from './cors-origins.js';
import {
  buildOAuthCallbackUrlFromApiBase,
  OAUTH_CALLBACK_PATH,
  parsePublicApiBaseUrl,
  trimTrailingSlashes,
} from './public-api-url.js';
const GOOGLE_WEB_CLIENT_ID_PATTERN = /^\d+-[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(3001),
  API_HOST: z.string().optional(),
  API_BASE_URL: z.string().url().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  LOG_FORMAT: z.enum(['json', 'pretty']).optional(),
  ENABLE_LOGSTASH: z.enum(['true', 'false']).optional(),
  LOGSTASH_HOST: z.string().optional(),
  LOGSTASH_PORT: z.coerce.number().int().positive().optional(),
  OTEL_TRACING_ENABLED: z.enum(['true', 'false']).optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_TRACES_SAMPLER_RATIO: z.coerce.number().min(0).max(1).optional(),
  ROUTING_API_BASE_URL: z.string().url().optional(),
  ROUTING_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  ROUTING_FAILURE_THRESHOLD: z.coerce.number().int().positive().optional(),
  ROUTING_RESET_WINDOW_MS: z.coerce.number().int().positive().optional(),
  IOT_INGESTION_ENABLED: z.enum(['true', 'false']).optional(),
  IOT_MQTT_ENABLED: z.enum(['true', 'false']).optional(),
  IOT_MQTT_BROKER_URL: z.string().optional(),
  IOT_MQTT_USERNAME: z.string().optional(),
  IOT_MQTT_PASSWORD: z.string().optional(),
  IOT_MQTT_TOPIC: z.string().optional(),
  IOT_QUEUE_CONCURRENCY: z.coerce.number().int().positive().optional(),
  IOT_QUEUE_BATCH_SIZE: z.coerce.number().int().positive().optional(),
  IOT_INGESTION_SHARD_COUNT: z.coerce.number().int().positive().optional(),
  IOT_BACKPRESSURE_THRESHOLD: z.coerce.number().int().positive().optional(),
  IOT_MAX_BATCH_SIZE: z.coerce.number().int().positive().optional(),
  IOT_VALIDATED_CONSUMER_CONCURRENCY: z.coerce.number().int().positive().optional(),
  IOT_VALIDATED_CONSUMER_BATCH_SIZE: z.coerce.number().int().positive().optional(),
  IOT_VALIDATED_CONSUMER_SHARD_COUNT: z.coerce.number().int().positive().optional(),
  CORS_ORIGINS: z.string().optional(),
  APP_BASE_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  CLIENT_ORIGIN: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().optional(),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables: ${result.error.message}`);
  }

  if (result.data.API_BASE_URL) {
    parsePublicApiBaseUrl(result.data.API_BASE_URL, 'API_BASE_URL');
  }

  const callbackUrl = result.data.GOOGLE_CALLBACK_URL;
  if (callbackUrl) {
    const parsed = new URL(callbackUrl);
    if (parsed.pathname !== OAUTH_CALLBACK_PATH) {
      throw new Error(
        `Invalid GOOGLE_CALLBACK_URL path: expected '${OAUTH_CALLBACK_PATH}', received '${parsed.pathname}'.`,
      );
    }

    if (result.data.API_BASE_URL) {
      const expectedCallbackUrl = buildOAuthCallbackUrlFromApiBase(result.data.API_BASE_URL, 'API_BASE_URL');
      if (trimTrailingSlashes(callbackUrl) !== expectedCallbackUrl) {
        throw new Error(
          `GOOGLE_CALLBACK_URL must match the callback derived from API_BASE_URL (${expectedCallbackUrl}).`,
        );
      }
    } else if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const callbackPort = parsed.port
        ? Number(parsed.port)
        : parsed.protocol === 'https:'
          ? 443
          : 80;

      if (callbackPort !== result.data.API_PORT) {
        throw new Error(
          `GOOGLE_CALLBACK_URL port (${callbackPort}) must match API_PORT (${result.data.API_PORT}) for localhost callbacks.`,
        );
      }
    }
  }

  const googleClientId = result.data.GOOGLE_CLIENT_ID?.trim();
  if (googleClientId && !GOOGLE_WEB_CLIENT_ID_PATTERN.test(googleClientId)) {
    throw new Error(
      "Invalid GOOGLE_CLIENT_ID format: expected '<numeric-project-id>-<client>.apps.googleusercontent.com'.",
    );
  }

  const corsOrigins = resolveCorsOrigins({
    corsOrigins: result.data.CORS_ORIGINS,
    clientOrigin: result.data.CLIENT_ORIGIN,
    nodeEnv: result.data.NODE_ENV,
  });

  if (result.data.APP_URL) {
    const appUrlOrigin = new URL(result.data.APP_URL).origin;
    if (!corsOrigins.includes(appUrlOrigin)) {
      throw new Error(`APP_URL origin (${appUrlOrigin}) must be listed in CORS_ORIGINS.`);
    }
  }

  if (result.data.APP_BASE_URL) {
    const appBaseUrlOrigin = new URL(result.data.APP_BASE_URL).origin;
    if (!corsOrigins.includes(appBaseUrlOrigin)) {
      throw new Error(`APP_BASE_URL origin (${appBaseUrlOrigin}) must be listed in CORS_ORIGINS.`);
    }
  }

  return result.data;
}
