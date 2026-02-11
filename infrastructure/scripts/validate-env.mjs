#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const OAUTH_CALLBACK_PATH = '/api/auth/google/callback';

const WORKFLOW_RULES = {
  'host-dev': {
    requiredKeys: [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'SESSION_SECRET',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
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
    entries.set(key, value);
    if (!keys.includes(key)) {
      keys.push(key);
    }
  });

  return { entries, keys, invalidLines };
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
    const expectedPortRaw = entries.get('API_PORT') ?? entries.get('PORT');
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
  const combined = new Map();

  for (const file of files) {
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${file}: file not found.`);
      continue;
    }

    const { entries, keys, invalidLines } = parseEnvFile(absolutePath);

    if (invalidLines.length > 0) {
      errors.push(`${file}: invalid env line format at lines ${invalidLines.join(', ')}.`);
    }

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

    checkDatabaseNamePolicy(entries, file, errors);
    checkGoogleCallbackPolicy(entries, file, errors);
  }

  const required = WORKFLOW_RULES[workflow].requiredKeys;
  const missing = required.filter((key) => !combined.has(key) || String(combined.get(key) ?? '').trim() === '');

  if (missing.length > 0) {
    errors.push(`Missing required keys for ${workflow}: ${missing.join(', ')}.`);
  }

  if (errors.length > 0) {
    console.error('[validate-env] FAILED');
    errors.forEach((error) => console.error(`[validate-env] ${error}`));
    process.exit(1);
  }

  console.log('[validate-env] PASS');
}

main();
