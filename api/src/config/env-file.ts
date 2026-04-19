import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const resolveModuleDirectory = () => {
  if (typeof import.meta.url === 'string' && import.meta.url.length > 0) {
    return path.dirname(fileURLToPath(import.meta.url));
  }

  return process.cwd();
};

const resolveApiEnvPath = () => {
  const explicitEnvPath = process.env.ECOTRACK_API_ENV_FILE?.trim();
  if (explicitEnvPath) {
    return explicitEnvPath;
  }

  const currentWorkingDirectory = process.cwd();
  const workingDirectoryEnvPath = path.resolve(currentWorkingDirectory, '.env');
  if (fs.existsSync(workingDirectoryEnvPath)) {
    return workingDirectoryEnvPath;
  }

  const moduleDirectory = resolveModuleDirectory();
  return path.resolve(moduleDirectory, '..', '..', '..', '.env');
};

const resolvedApiEnvPath = resolveApiEnvPath();
export const apiEnvFilePath = fs.existsSync(resolvedApiEnvPath) ? resolvedApiEnvPath : undefined;

let envLoaded = false;

export function ensureApiEnvLoaded() {
  if (!envLoaded && apiEnvFilePath) {
    dotenv.config({ path: apiEnvFilePath });
    envLoaded = true;
  }

  return apiEnvFilePath;
}
