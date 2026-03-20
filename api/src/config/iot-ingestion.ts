import { z } from 'zod';

const DEFAULT_IOT_QUEUE_CONCURRENCY = 50;
const DEFAULT_IOT_QUEUE_BATCH_SIZE = 500;
const DEFAULT_IOT_BACKPRESSURE_THRESHOLD = 100000;
const DEFAULT_IOT_MAX_BATCH_SIZE = 1000;
const DEFAULT_IOT_VALIDATED_CONSUMER_CONCURRENCY = 20;
const DEFAULT_IOT_VALIDATED_CONSUMER_BATCH_SIZE = 250;

const iotIngestionSchema = z.object({
  IOT_INGESTION_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  IOT_MQTT_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  IOT_MQTT_BROKER_URL: z.string().optional(),
  IOT_MQTT_USERNAME: z.string().optional(),
  IOT_MQTT_PASSWORD: z.string().optional(),
  IOT_MQTT_TOPIC: z.string().default('ecotrack/measurements'),
  IOT_QUEUE_CONCURRENCY: z
    .string()
    .transform((val) => {
      const parsed = Number(val);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_IOT_QUEUE_CONCURRENCY;
    })
    .default(String(DEFAULT_IOT_QUEUE_CONCURRENCY)),
  IOT_QUEUE_BATCH_SIZE: z
    .string()
    .transform((val) => {
      const parsed = Number(val);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_IOT_QUEUE_BATCH_SIZE;
    })
    .default(String(DEFAULT_IOT_QUEUE_BATCH_SIZE)),
  IOT_BACKPRESSURE_THRESHOLD: z
    .string()
    .transform((val) => {
      const parsed = Number(val);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_IOT_BACKPRESSURE_THRESHOLD;
    })
    .default(String(DEFAULT_IOT_BACKPRESSURE_THRESHOLD)),
  IOT_MAX_BATCH_SIZE: z
    .string()
    .transform((val) => {
      const parsed = Number(val);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_IOT_MAX_BATCH_SIZE;
    })
    .default(String(DEFAULT_IOT_MAX_BATCH_SIZE)),
  IOT_VALIDATED_CONSUMER_CONCURRENCY: z
    .string()
    .transform((val) => {
      const parsed = Number(val);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_IOT_VALIDATED_CONSUMER_CONCURRENCY;
    })
    .default(String(DEFAULT_IOT_VALIDATED_CONSUMER_CONCURRENCY)),
  IOT_VALIDATED_CONSUMER_BATCH_SIZE: z
    .string()
    .transform((val) => {
      const parsed = Number(val);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_IOT_VALIDATED_CONSUMER_BATCH_SIZE;
    })
    .default(String(DEFAULT_IOT_VALIDATED_CONSUMER_BATCH_SIZE)),
  IOT_REDIS_URL: z.string().optional(),
});

export type IotIngestionConfig = z.infer<typeof iotIngestionSchema>;

export const IOT_INGESTION_CONFIG_TOKEN = 'IOT_INGESTION_CONFIG';

export function loadIotIngestionConfig(env: Record<string, unknown>): IotIngestionConfig {
  return iotIngestionSchema.parse(env);
}

export const DEFAULT_IOT_CONFIG: IotIngestionConfig = {
  IOT_INGESTION_ENABLED: true,
  IOT_MQTT_ENABLED: false,
  IOT_MQTT_TOPIC: 'ecotrack/measurements',
  IOT_QUEUE_CONCURRENCY: DEFAULT_IOT_QUEUE_CONCURRENCY,
  IOT_QUEUE_BATCH_SIZE: DEFAULT_IOT_QUEUE_BATCH_SIZE,
  IOT_BACKPRESSURE_THRESHOLD: DEFAULT_IOT_BACKPRESSURE_THRESHOLD,
  IOT_MAX_BATCH_SIZE: DEFAULT_IOT_MAX_BATCH_SIZE,
  IOT_VALIDATED_CONSUMER_CONCURRENCY: DEFAULT_IOT_VALIDATED_CONSUMER_CONCURRENCY,
  IOT_VALIDATED_CONSUMER_BATCH_SIZE: DEFAULT_IOT_VALIDATED_CONSUMER_BATCH_SIZE,
  IOT_REDIS_URL: undefined,
};
