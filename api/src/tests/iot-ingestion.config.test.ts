import { describe, expect, it } from 'vitest';

import { DEFAULT_IOT_CONFIG, loadIotIngestionConfig } from '../config/iot-ingestion.js';

describe('IoT ingestion config parsing', () => {
  it('uses canonical defaults when variables are omitted', () => {
    expect(loadIotIngestionConfig({})).toEqual({
      ...DEFAULT_IOT_CONFIG,
      IOT_MQTT_BROKER_URL: undefined,
      IOT_MQTT_USERNAME: undefined,
      IOT_MQTT_PASSWORD: undefined,
    });
  });

  it('normalizes explicit boolean and numeric overrides', () => {
    expect(
      loadIotIngestionConfig({
        IOT_INGESTION_ENABLED: 'false',
        IOT_MQTT_ENABLED: 'true',
        IOT_MQTT_BROKER_URL: 'mqtt://broker.internal:1883',
        IOT_MQTT_USERNAME: 'iot-user',
        IOT_MQTT_PASSWORD: 'secret',
        IOT_MQTT_TOPIC: 'custom/topic',
        IOT_QUEUE_CONCURRENCY: '8',
        IOT_QUEUE_BATCH_SIZE: '40',
        IOT_BACKPRESSURE_THRESHOLD: '250',
        IOT_MAX_BATCH_SIZE: '500',
        IOT_VALIDATED_CONSUMER_CONCURRENCY: '12',
        IOT_VALIDATED_CONSUMER_BATCH_SIZE: '30',
        IOT_REDIS_URL: 'redis://cache.internal:6379',
      }),
    ).toEqual({
      IOT_INGESTION_ENABLED: false,
      IOT_MQTT_ENABLED: true,
      IOT_MQTT_BROKER_URL: 'mqtt://broker.internal:1883',
      IOT_MQTT_USERNAME: 'iot-user',
      IOT_MQTT_PASSWORD: 'secret',
      IOT_MQTT_TOPIC: 'custom/topic',
      IOT_QUEUE_CONCURRENCY: 8,
      IOT_QUEUE_BATCH_SIZE: 40,
      IOT_BACKPRESSURE_THRESHOLD: 250,
      IOT_MAX_BATCH_SIZE: 500,
      IOT_VALIDATED_CONSUMER_CONCURRENCY: 12,
      IOT_VALIDATED_CONSUMER_BATCH_SIZE: 30,
      IOT_REDIS_URL: 'redis://cache.internal:6379',
    });
  });

  it('falls back to defaults for invalid numeric values', () => {
    expect(
      loadIotIngestionConfig({
        IOT_QUEUE_CONCURRENCY: '0',
        IOT_QUEUE_BATCH_SIZE: '-2',
        IOT_BACKPRESSURE_THRESHOLD: 'not-a-number',
        IOT_MAX_BATCH_SIZE: '3.5',
        IOT_VALIDATED_CONSUMER_CONCURRENCY: '-1',
        IOT_VALIDATED_CONSUMER_BATCH_SIZE: 'NaN',
      }),
    ).toEqual({
      ...DEFAULT_IOT_CONFIG,
      IOT_MQTT_BROKER_URL: undefined,
      IOT_MQTT_USERNAME: undefined,
      IOT_MQTT_PASSWORD: undefined,
    });
  });
});
