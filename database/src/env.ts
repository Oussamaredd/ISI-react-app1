import { z } from 'zod';

const DatabaseEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid Postgres connection string'),
});

export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>;

export function parseDatabaseEnv(source: Record<string, unknown> = process.env): DatabaseEnv {
  const result = DatabaseEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid database environment: ${result.error.message}`);
  }

  return {
    DATABASE_URL: String(result.data.DATABASE_URL),
  };
}
