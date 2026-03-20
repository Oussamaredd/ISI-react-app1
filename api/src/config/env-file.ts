import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rootEnvPath = path.resolve(workspaceDir, '..', '.env');

export const apiEnvFilePath = fs.existsSync(rootEnvPath) ? rootEnvPath : undefined;

let envLoaded = false;

export function ensureApiEnvLoaded() {
  if (!envLoaded && apiEnvFilePath) {
    dotenv.config({ path: apiEnvFilePath });
    envLoaded = true;
  }

  return apiEnvFilePath;
}
