import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { parseDatabaseEnv } from './env.js';

export type DatabaseConfig = {
  url?: string;
  maxConnections?: number;
};

export type DatabaseInstance = {
  db: ReturnType<typeof drizzle<typeof schema>>;
  dispose: () => Promise<void>;
};

export function createDatabaseInstance(config: DatabaseConfig = {}): DatabaseInstance {
  const env = parseDatabaseEnv({
    DATABASE_URL: config.url ?? process.env.DATABASE_URL,
  });

  const sql = postgres(env.DATABASE_URL, {
    max: config.maxConnections ?? 5,
    prepare: false,
  });

  const db = drizzle(sql, { schema });

  return {
    db,
    dispose: () => sql.end({ timeout: 5 }).catch(() => undefined),
  };
}

export type DatabaseClient = DatabaseInstance['db'];
