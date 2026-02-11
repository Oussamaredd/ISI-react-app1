import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { parseDatabaseEnv } from './src/env.ts';

const workspaceDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(workspaceDir, '..', '.env');

if (!process.env.DATABASE_URL && fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const { DATABASE_URL } = parseDatabaseEnv(process.env);

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
