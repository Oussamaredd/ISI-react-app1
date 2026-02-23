import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
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

function resolveDatabaseUrl(explicitUrl?: string): string | undefined {
  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const envCandidates = [
    path.resolve(moduleDir, '.env'),
    path.resolve(moduleDir, '..', '.env'),
    path.resolve(moduleDir, '..', '..', '.env'),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    dotenv.config({ path: envPath });
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
  }

  return undefined;
}

export function createDatabaseInstance(config: DatabaseConfig = {}): DatabaseInstance {
  const env = parseDatabaseEnv({
    DATABASE_URL: resolveDatabaseUrl(config.url),
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
