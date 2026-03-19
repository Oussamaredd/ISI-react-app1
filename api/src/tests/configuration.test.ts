import { afterEach, describe, expect, it } from 'vitest';

import configuration from '../config/configuration.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('configuration', () => {
  it('builds canonical defaults when optional env vars are missing', () => {
    process.env = {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ecotrack',
    };

    const config = configuration();

    expect(config).toEqual({
      nodeEnv: 'development',
      api: {
        port: 3001,
        rateLimit: {
          windowMs: 60_000,
          maxRequests: 120,
        },
      },
      database: {
        url: 'postgres://postgres:postgres@localhost:5432/ecotrack',
      },
      logging: {
        level: 'info',
        format: 'pretty',
      },
      routing: {
        baseUrl: 'https://router.project-osrm.org',
        circuitBreaker: {
          timeoutMs: 10_000,
          failureThreshold: 5,
          resetWindowMs: 30_000,
        },
      },
      iotIngestion: {
        IOT_INGESTION_ENABLED: true,
        IOT_MQTT_ENABLED: false,
        IOT_MQTT_TOPIC: 'ecotrack/measurements',
        IOT_QUEUE_CONCURRENCY: 50,
        IOT_QUEUE_BATCH_SIZE: 500,
        IOT_BACKPRESSURE_THRESHOLD: 100000,
        IOT_MAX_BATCH_SIZE: 1000,
        IOT_REDIS_URL: undefined,
      },
    });
  });

  it('normalizes valid overrides and falls back from invalid numeric values', () => {
    process.env = {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ecotrack',
      NODE_ENV: 'production',
      API_PORT: '4100',
      RATE_LIMIT_WINDOW_MS: 'not-a-number',
      RATE_LIMIT_MAX_REQUESTS: '-5',
      LOG_LEVEL: 'DEBUG',
      ROUTING_API_BASE_URL: 'https://router.internal.example',
      ROUTING_TIMEOUT_MS: '5000',
      ROUTING_FAILURE_THRESHOLD: '7',
      ROUTING_RESET_WINDOW_MS: '45000',
      IOT_INGESTION_ENABLED: 'false',
      IOT_MQTT_ENABLED: 'true',
      IOT_MQTT_TOPIC: 'custom/topic',
      IOT_QUEUE_CONCURRENCY: '8',
      IOT_QUEUE_BATCH_SIZE: '40',
      IOT_BACKPRESSURE_THRESHOLD: '250',
      IOT_MAX_BATCH_SIZE: '500',
      IOT_REDIS_URL: 'redis://cache.internal:6379',
    };

    const config = configuration();

    expect(config).toEqual({
      nodeEnv: 'production',
      api: {
        port: 4100,
        rateLimit: {
          windowMs: 60_000,
          maxRequests: 120,
        },
      },
      database: {
        url: 'postgres://postgres:postgres@localhost:5432/ecotrack',
      },
      logging: {
        level: 'debug',
        format: 'json',
      },
      routing: {
        baseUrl: 'https://router.internal.example',
        circuitBreaker: {
          timeoutMs: 5000,
          failureThreshold: 7,
          resetWindowMs: 45_000,
        },
      },
      iotIngestion: {
        IOT_INGESTION_ENABLED: false,
        IOT_MQTT_ENABLED: true,
        IOT_MQTT_TOPIC: 'custom/topic',
        IOT_QUEUE_CONCURRENCY: 8,
        IOT_QUEUE_BATCH_SIZE: 40,
        IOT_BACKPRESSURE_THRESHOLD: 250,
        IOT_MAX_BATCH_SIZE: 500,
        IOT_REDIS_URL: 'redis://cache.internal:6379',
      },
    });
  });

  it('rejects missing DATABASE_URL', () => {
    process.env = {};

    expect(() => configuration()).toThrow('DATABASE_URL is required.');
  });
});
