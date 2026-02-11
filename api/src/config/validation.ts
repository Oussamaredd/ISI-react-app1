import { z } from 'zod';

const OAUTH_CALLBACK_PATH = '/api/auth/google/callback';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(3001),
  API_HOST: z.string().optional(),
  PORT: z.coerce.number().int().positive().max(65535).optional(),
  CORS_ORIGINS: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const normalized = {
    ...config,
    API_PORT: config.API_PORT ?? config.PORT,
  };

  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`Invalid environment variables: ${result.error.message}`);
  }

  const callbackUrl = result.data.GOOGLE_CALLBACK_URL;
  if (callbackUrl) {
    const parsed = new URL(callbackUrl);
    if (parsed.pathname !== OAUTH_CALLBACK_PATH) {
      throw new Error(
        `Invalid GOOGLE_CALLBACK_URL path: expected '${OAUTH_CALLBACK_PATH}', received '${parsed.pathname}'.`,
      );
    }

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
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

  return result.data;
}
