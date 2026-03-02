#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const OAUTH_CALLBACK_PATH = '/api/auth/google/callback';
const CANONICAL_MIGRATE_COMMAND = 'npm run db:migrate --workspace=ecotrack-database';
const CANONICAL_SEED_COMMAND = 'npm run db:seed --workspace=ecotrack-database';
const LEGACY_FRONTEND_PATHS = new Set([
  '/auth',
  '/dashboard',
  '/tickets',
  '/tickets/advanced',
  '/tickets/create',
  '/tickets/details',
  '/tickets/treat',
  '/admin',
]);
const DEPRECATED_KEYS = new Map([
  ['CLIENT_ORIGIN', 'CORS_ORIGINS'],
  ['DB_HOST', 'DATABASE_URL'],
  ['DB_NAME', 'DATABASE_URL'],
  ['DB_PASSWORD', 'DATABASE_URL'],
  ['DB_PORT', 'DATABASE_URL'],
  ['DB_USER', 'DATABASE_URL'],
  ['PORT', 'API_PORT'],
  ['VITE_API_URL', 'VITE_API_BASE_URL'],
]);

const WORKFLOW_RULES = {
  'host-dev': {
    requiredKeys: [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'SESSION_SECRET',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'JWT_ACCESS_SECRET',
      'JWT_ACCESS_EXPIRES_IN',
      'CORS_ORIGINS',
      'VITE_API_BASE_URL',
    ],
  },
  'docker-dev': {
    requiredKeys: [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_DB',
      'SESSION_SECRET',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'JWT_ACCESS_SECRET',
      'JWT_ACCESS_EXPIRES_IN',
      'CORS_ORIGINS',
      'MIGRATE_COMMAND',
      'ENABLE_SEED_DATA',
      'SEED_COMMAND',
    ],
  },
  'deploy-dev': {
    requiredKeys: [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'CORS_ORIGINS',
      'APP_URL',
      'SESSION_SECRET',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'JWT_ACCESS_SECRET',
      'JWT_ACCESS_EXPIRES_IN',
      'GOOGLE_CALLBACK_URL',
    ],
  },
  'deploy-staging': {
    requiredKeys: [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'CORS_ORIGINS',
      'APP_URL',
      'SESSION_SECRET',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'JWT_ACCESS_SECRET',
      'JWT_ACCESS_EXPIRES_IN',
      'GOOGLE_CALLBACK_URL',
      'WEBHOOK_URL',
      'WEBHOOK_SECRET',
    ],
  },
  'deploy-prod': {
    requiredKeys: [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'CORS_ORIGINS',
      'APP_URL',
      'SESSION_SECRET',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'JWT_ACCESS_SECRET',
      'JWT_ACCESS_EXPIRES_IN',
      'GOOGLE_CALLBACK_URL',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'EMAIL_FROM',
      'WEBHOOK_URL',
      'WEBHOOK_SECRET',
    ],
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = value;

    if (value !== 'true') {
      i += 1;
    }
  }
  return args;
}

function usageAndExit() {
  const workflows = Object.keys(WORKFLOW_RULES).join(', ');
  console.error('Usage: node ./infrastructure/scripts/validate-env.mjs --workflow <name> --files <file1,file2,...>');
  console.error(`Allowed workflows: ${workflows}`);
  process.exit(1);
}

function isFrontendEnvFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('app/.env');
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const entries = new Map();
  const keys = [];
  const duplicateKeys = [];
  const invalidLines = [];

  lines.forEach((line, index) => {
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      return;
    }

    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      invalidLines.push(index + 1);
      return;
    }

    const key = match[1];
    const value = match[2];
    if (entries.has(key) && !duplicateKeys.includes(key)) {
      duplicateKeys.push(key);
    }
    entries.set(key, value);
    if (!keys.includes(key)) {
      keys.push(key);
    }
  });

  return { entries, keys, duplicateKeys, invalidLines };
}

function checkDatabaseNamePolicy(entries, sourceLabel, errors) {
  if (entries.has('DATABASE_URL')) {
    const databaseUrl = String(entries.get('DATABASE_URL') ?? '').trim();
    if (!/\/ticketdb(?:[/?#]|$)/.test(databaseUrl)) {
      errors.push(`${sourceLabel}: DATABASE_URL must target /ticketdb.`);
    }
  }

  if (entries.has('POSTGRES_DB')) {
    const postgresDb = String(entries.get('POSTGRES_DB') ?? '').trim();
    if (postgresDb !== 'ticketdb') {
      errors.push(`${sourceLabel}: POSTGRES_DB must be ticketdb.`);
    }
  }
}

function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : '/';
}

function isDeployWorkflow(workflow) {
  return workflow === 'deploy-dev' || workflow === 'deploy-staging' || workflow === 'deploy-prod';
}

function normalizeCorsOrigin(rawOrigin, sourceLabel, errors) {
  const origin = String(rawOrigin ?? '').trim();
  if (!origin) {
    return null;
  }

  if (origin === '*') {
    errors.push(
      `${sourceLabel}: CORS_ORIGINS cannot include wildcard '*' when credentialed requests are enabled.`,
    );
    return null;
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    errors.push(`${sourceLabel}: CORS_ORIGINS entry '${origin}' must be a valid URL.`);
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    errors.push(`${sourceLabel}: CORS_ORIGINS entry '${origin}' must use http or https.`);
    return null;
  }

  if (parsed.username || parsed.password) {
    errors.push(`${sourceLabel}: CORS_ORIGINS entry '${origin}' must not include credentials.`);
    return null;
  }

  if (parsed.search || parsed.hash) {
    errors.push(`${sourceLabel}: CORS_ORIGINS entry '${origin}' must not include query or hash.`);
    return null;
  }

  if (normalizePathname(parsed.pathname) !== '/') {
    errors.push(`${sourceLabel}: CORS_ORIGINS entry '${origin}' must target origin root only.`);
    return null;
  }

  return `${parsed.protocol}//${parsed.host}`;
}

function checkCorsOriginsPolicy(entries, sourceLabel, workflow, errors) {
  if (!entries.has('CORS_ORIGINS')) {
    return;
  }

  const raw = String(entries.get('CORS_ORIGINS') ?? '').trim();
  if (!raw) {
    errors.push(`${sourceLabel}: CORS_ORIGINS must include at least one origin.`);
    return;
  }

  const normalizedOrigins = raw
    .split(',')
    .map((origin) => normalizeCorsOrigin(origin, sourceLabel, errors))
    .filter((origin) => typeof origin === 'string');

  if (normalizedOrigins.length === 0) {
    errors.push(`${sourceLabel}: CORS_ORIGINS must include at least one valid origin.`);
    return;
  }

  if (isDeployWorkflow(workflow)) {
    normalizedOrigins.forEach((origin) => {
      const parsed = new URL(origin);
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (parsed.protocol !== 'https:' && !isLocalhost) {
        errors.push(`${sourceLabel}: deploy workflows require https CORS origins (received '${origin}').`);
      }
    });
  }

  for (const key of ['APP_BASE_URL', 'APP_URL', 'CLIENT_ORIGIN']) {
    if (!entries.has(key)) {
      continue;
    }

    const parsed = parseNormalizedUrl(entries.get(key), sourceLabel, key, errors);
    if (!parsed) {
      continue;
    }

    const origin = parsed.origin;
    if (!normalizedOrigins.includes(origin)) {
      errors.push(`${sourceLabel}: ${key} origin (${origin}) must be included in CORS_ORIGINS.`);
    }
  }
}

function checkFrontendRoutePolicy(entries, sourceLabel, errors) {
  for (const key of ['APP_BASE_URL', 'APP_URL', 'CLIENT_ORIGIN']) {
    if (!entries.has(key)) {
      continue;
    }

    const value = String(entries.get(key) ?? '').trim();
    if (!value) {
      continue;
    }

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      errors.push(`${sourceLabel}: ${key} must be a valid URL when provided.`);
      continue;
    }

    const normalizedPath = normalizePathname(parsed.pathname);
    if (LEGACY_FRONTEND_PATHS.has(normalizedPath)) {
      errors.push(
        `${sourceLabel}: ${key} must target the frontend origin root, not legacy route '${normalizedPath}'.`,
      );
    }
  }

  if (!entries.has('VITE_BASE')) {
    return;
  }

  const rawBase = String(entries.get('VITE_BASE') ?? '').trim();
  if (!rawBase) {
    return;
  }

  const withLeadingSlash = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  const normalizedBase = normalizePathname(withLeadingSlash);

  if (LEGACY_FRONTEND_PATHS.has(normalizedBase)) {
    errors.push(
      `${sourceLabel}: VITE_BASE must not use removed legacy route path '${normalizedBase}'.`,
    );
  }
}

function checkGoogleCallbackPolicy(entries, sourceLabel, errors) {
  if (!entries.has('GOOGLE_CALLBACK_URL')) {
    return;
  }

  const callbackUrl = String(entries.get('GOOGLE_CALLBACK_URL') ?? '').trim();
  if (!callbackUrl) {
    return;
  }

  let parsed;
  try {
    parsed = new URL(callbackUrl);
  } catch {
    errors.push(`${sourceLabel}: GOOGLE_CALLBACK_URL must be a valid URL when provided.`);
    return;
  }

  if (parsed.pathname !== OAUTH_CALLBACK_PATH) {
    errors.push(
      `${sourceLabel}: GOOGLE_CALLBACK_URL path must be '${OAUTH_CALLBACK_PATH}' (received '${parsed.pathname}').`,
    );
  }

  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    const expectedPortRaw = entries.get('API_PORT');
    const expectedPort = Number(String(expectedPortRaw ?? '').trim());

    if (Number.isFinite(expectedPort) && expectedPort > 0) {
      const callbackPort = parsed.port
        ? Number(parsed.port)
        : parsed.protocol === 'https:'
          ? 443
          : 80;

      if (callbackPort !== expectedPort) {
        errors.push(
          `${sourceLabel}: GOOGLE_CALLBACK_URL port (${callbackPort}) must match API_PORT (${expectedPort}) for localhost callbacks.`,
        );
      }
    }
  }
}

function parseNormalizedUrl(rawValue, sourceLabel, key, errors) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${sourceLabel}: ${key} must be a valid URL when provided.`);
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    errors.push(`${sourceLabel}: ${key} must use http or https.`);
    return null;
  }

  if (parsed.username || parsed.password) {
    errors.push(`${sourceLabel}: ${key} must not include credentials.`);
    return null;
  }

  if (parsed.search || parsed.hash) {
    errors.push(`${sourceLabel}: ${key} must not include query or hash.`);
    return null;
  }

  return parsed;
}

function checkApiPortPolicy(entries, sourceLabel, errors) {
  if (!entries.has('API_PORT')) {
    return;
  }

  const rawPort = String(entries.get('API_PORT') ?? '').trim();
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`${sourceLabel}: API_PORT must be an integer between 1 and 65535.`);
  }
}

function checkFrontendApiBasePolicy(entries, sourceLabel, errors) {
  if (!entries.has('VITE_API_BASE_URL')) {
    return;
  }

  parseNormalizedUrl(entries.get('VITE_API_BASE_URL'), sourceLabel, 'VITE_API_BASE_URL', errors);
}

function checkDockerMigrationPolicy(entries, sourceLabel, warnings, errors) {
  if (entries.has('MIGRATE_COMMAND')) {
    const command = String(entries.get('MIGRATE_COMMAND') ?? '').trim();
    if (!command) {
      errors.push(`${sourceLabel}: MIGRATE_COMMAND must not be empty when provided.`);
    } else if (command !== CANONICAL_MIGRATE_COMMAND) {
      errors.push(`${sourceLabel}: MIGRATE_COMMAND must be '${CANONICAL_MIGRATE_COMMAND}'.`);
    }
  }

  if (entries.has('SEED_COMMAND')) {
    const command = String(entries.get('SEED_COMMAND') ?? '').trim();
    if (!command) {
      errors.push(`${sourceLabel}: SEED_COMMAND must not be empty when provided.`);
    } else if (command !== CANONICAL_SEED_COMMAND) {
      errors.push(`${sourceLabel}: SEED_COMMAND must be '${CANONICAL_SEED_COMMAND}'.`);
    }
  }

  if (!entries.has('ENABLE_SEED_DATA')) {
    return;
  }

  const rawValue = String(entries.get('ENABLE_SEED_DATA') ?? '').trim().toLowerCase();
  const canonicalValues = new Set(['true', 'false']);
  const acceptedValues = new Set(['true', 'false', '1', '0', 'yes', 'no', 'y', 'n']);

  if (!acceptedValues.has(rawValue)) {
    errors.push(`${sourceLabel}: ENABLE_SEED_DATA must be a boolean-like value.`);
    return;
  }

  if (!canonicalValues.has(rawValue)) {
    warnings.push(
      `${sourceLabel}: ENABLE_SEED_DATA should use canonical value 'true' or 'false'.`,
    );
  }
}

function checkDeprecatedKeyPolicy(keys, sourceLabel, errors) {
  const deprecatedKeys = keys.filter((key) => DEPRECATED_KEYS.has(key));

  deprecatedKeys.forEach((key) => {
    const canonicalKey = DEPRECATED_KEYS.get(key);
    const message = `${sourceLabel}: deprecated key '${key}' is not allowed here; use '${canonicalKey}' instead.`;
    errors.push(message);
  });
}

function checkDuplicateKeyPolicy(duplicateKeys, sourceLabel, errors) {
  if (duplicateKeys.length === 0) {
    return;
  }

  errors.push(`${sourceLabel}: duplicate keys are forbidden: ${duplicateKeys.join(', ')}.`);
}

function main() {
  const args = parseArgs(process.argv);
  const workflow = args.workflow;
  const filesArg = args.files;

  if (!workflow || !filesArg || !WORKFLOW_RULES[workflow]) {
    usageAndExit();
  }

  const files = filesArg
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (files.length === 0) {
    usageAndExit();
  }

  console.log(`[validate-env] workflow=${workflow}`);
  console.log(`[validate-env] files=${files.join(', ')}`);

  const errors = [];
  const warnings = [];
  const combined = new Map();

  for (const file of files) {
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${file}: file not found.`);
      continue;
    }

    const { entries, keys, duplicateKeys, invalidLines } = parseEnvFile(absolutePath);

    if (invalidLines.length > 0) {
      errors.push(`${file}: invalid env line format at lines ${invalidLines.join(', ')}.`);
    }

    checkDuplicateKeyPolicy(duplicateKeys, file, errors);

    console.log(`[validate-env] ${file} keys: ${keys.sort().join(', ')}`);

    keys.forEach((key) => {
      combined.set(key, entries.get(key));
    });

    if (isFrontendEnvFile(file)) {
      const nonViteKeys = keys.filter((key) => !key.startsWith('VITE_'));
      if (nonViteKeys.length > 0) {
        errors.push(`${file}: non-VITE keys are forbidden in frontend env files: ${nonViteKeys.join(', ')}.`);
      }
    }

    checkDeprecatedKeyPolicy(keys, file, errors);
    checkApiPortPolicy(entries, file, errors);
    checkFrontendApiBasePolicy(entries, file, errors);
    checkDatabaseNamePolicy(entries, file, errors);
    checkFrontendRoutePolicy(entries, file, errors);
    checkCorsOriginsPolicy(entries, file, workflow, errors);
    checkGoogleCallbackPolicy(entries, file, errors);

    if (workflow === 'docker-dev') {
      checkDockerMigrationPolicy(entries, file, warnings, errors);
    }
  }

  const required = WORKFLOW_RULES[workflow].requiredKeys;
  const missing = required.filter((key) => !combined.has(key) || String(combined.get(key) ?? '').trim() === '');

  if (missing.length > 0) {
    errors.push(`Missing required keys for ${workflow}: ${missing.join(', ')}.`);
  }

  warnings.forEach((warning) => console.warn(`[validate-env] WARN ${warning}`));

  if (errors.length > 0) {
    console.error('[validate-env] FAILED');
    errors.forEach((error) => console.error(`[validate-env] ${error}`));
    process.exit(1);
  }

  console.log('[validate-env] PASS');
}

main();
