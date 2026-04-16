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
      cache: {
        analyticsTtlSeconds: 60,
        citizenTtlSeconds: 30,
        dashboardTtlSeconds: 30,
        defaultTtlSeconds: 60,
        enabled: true,
        maxMemoryEntries: 250,
        planningTtlSeconds: 20,
        prefix: 'ecotrack',
        redisUrl: null,
      },
      database: {
        directUrl: 'postgres://postgres:postgres@localhost:5432/ecotrack',
        maxConnections: 5,
        poolerUrl: null,
        url: 'postgres://postgres:postgres@localhost:5432/ecotrack',
      },
      logging: {
        level: 'info',
        format: 'pretty',
        logstash: {
          enabled: false,
          host: 'logstash',
          port: 5001,
        },
      },
      observability: {
        tracing: {
          enabled: false,
          serviceName: 'ecotrack-api',
          exporterOtlpEndpoint: 'http://localhost:4318',
          samplingRatio: 1,
        },
      },
      transport: {
        compression: {
          enabled: true,
          level: 6,
          thresholdBytes: 1024,
        },
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
        IOT_VALIDATED_CONSUMER_CONCURRENCY: 20,
        IOT_VALIDATED_CONSUMER_BATCH_SIZE: 250,
        IOT_INGESTION_SHARD_COUNT: 12,
        IOT_VALIDATED_CONSUMER_SHARD_COUNT: 12,
      },
    });
  });

  it('normalizes valid overrides and falls back from invalid numeric values', () => {
    process.env = {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ecotrack',
      NODE_ENV: 'production',
      API_PORT: '4100',
      CACHE_ANALYTICS_TTL_SECONDS: '120',
      CACHE_CITIZEN_TTL_SECONDS: '45',
      CACHE_DASHBOARD_TTL_SECONDS: '15',
      CACHE_DEFAULT_TTL_SECONDS: '90',
      CACHE_ENABLED: 'true',
      CACHE_MAX_MEMORY_ENTRIES: '512',
      CACHE_PLANNING_TTL_SECONDS: '10',
      CACHE_PREFIX: 'eco-cache',
      CACHE_REDIS_URL: 'redis://cache.internal:6379',
      DATABASE_POOLER_URL: 'postgres://postgres:postgres@pooler.internal:6432/ecotrack',
      DATABASE_POOL_MAX: '12',
      RATE_LIMIT_WINDOW_MS: 'not-a-number',
      RATE_LIMIT_MAX_REQUESTS: '-5',
      LOG_LEVEL: 'DEBUG',
      OTEL_TRACING_ENABLED: 'true',
      OTEL_SERVICE_NAME: 'ecotrack-api-prod',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.internal.example',
      OTEL_TRACES_SAMPLER_RATIO: '0.25',
      RESPONSE_COMPRESSION_ENABLED: 'true',
      RESPONSE_COMPRESSION_LEVEL: '4',
      RESPONSE_COMPRESSION_THRESHOLD_BYTES: '4096',
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
      IOT_VALIDATED_CONSUMER_CONCURRENCY: '12',
      IOT_VALIDATED_CONSUMER_BATCH_SIZE: '30',
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
      cache: {
        analyticsTtlSeconds: 120,
        citizenTtlSeconds: 45,
        dashboardTtlSeconds: 15,
        defaultTtlSeconds: 90,
        enabled: true,
        maxMemoryEntries: 512,
        planningTtlSeconds: 10,
        prefix: 'eco-cache',
        redisUrl: 'redis://cache.internal:6379',
      },
      database: {
        directUrl: 'postgres://postgres:postgres@localhost:5432/ecotrack',
        maxConnections: 12,
        poolerUrl: 'postgres://postgres:postgres@pooler.internal:6432/ecotrack',
        url: 'postgres://postgres:postgres@pooler.internal:6432/ecotrack',
      },
      logging: {
        level: 'debug',
        format: 'json',
        logstash: {
          enabled: false,
          host: 'logstash',
          port: 5001,
        },
      },
      observability: {
        tracing: {
          enabled: true,
          serviceName: 'ecotrack-api-prod',
          exporterOtlpEndpoint: 'https://otel.internal.example',
          samplingRatio: 0.25,
        },
      },
      transport: {
        compression: {
          enabled: true,
          level: 4,
          thresholdBytes: 4096,
        },
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
        IOT_VALIDATED_CONSUMER_CONCURRENCY: 12,
        IOT_VALIDATED_CONSUMER_BATCH_SIZE: 30,
        IOT_INGESTION_SHARD_COUNT: 12,
        IOT_VALIDATED_CONSUMER_SHARD_COUNT: 12,
        IOT_REDIS_URL: 'redis://cache.internal:6379',
      },
    });
  });

  it('falls back to PORT when API_PORT is absent', () => {
    process.env = {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ecotrack',
      PORT: '10000',
    };

    const config = configuration();

    expect(config.api.port).toBe(10000);
  });

  it('rejects missing DATABASE_URL', () => {
    process.env = {};

    expect(() => configuration()).toThrow('DATABASE_URL is required.');
  });
});
