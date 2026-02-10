import { z } from 'zod';

const DEFAULT_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/ticketdb';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(3001),
  API_HOST: z.string().optional(),
  PORT: z.coerce.number().int().positive().max(65535).optional(),
  CORS_ORIGINS: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional(),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string').default(DEFAULT_DATABASE_URL),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables: ${result.error.message}`);
  }

  return result.data;
}
