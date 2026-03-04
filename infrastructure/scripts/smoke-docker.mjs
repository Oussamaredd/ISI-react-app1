#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const infraDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(infraDir, '..');
const envFile = path.join(infraDir, 'environments', '.env.docker');
const composeFile = path.join(infraDir, 'docker-compose.yml');
const composeArgs = ['compose', '--env-file', envFile, '-f', composeFile, '--profile', 'core'];
const DEFAULT_TIMEOUT_MS = 5000;

function fail(step, detail) {
  console.error(`[smoke] FAIL ${step}: ${detail}`);
  process.exit(1);
}

function pass(step, detail) {
  console.log(`[smoke] PASS ${step}: ${detail}`);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail('env-file', `missing ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    env.set(key, value);
  }

  return env;
}

function normalizePublicOrigin(rawValue, key) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    fail(key, `${key} must be set in ${path.relative(repoRoot, envFile)}`);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(key, `${key} must be a valid URL (received '${value}')`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail(key, `${key} must use http or https`);
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath !== '/' && normalizedPath !== '/api') {
    fail(key, `${key} path must be '/' or '/api' (received '${normalizedPath}')`);
  }

  return normalizedPath === '/api' ? `${parsed.origin}` : parsed.origin;
}

function buildExpectedCallbackUrl(publicOrigin) {
  return `${publicOrigin}/api/auth/google/callback`;
}

function runDockerCommand(label, args) {
  const result = spawnSync('docker', [...composeArgs, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
      .join('\n');
    fail(label, detail || 'docker command failed');
  }

  return result.stdout.trim();
}

async function fetchWithTimeout(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    return { error };
  } finally {
    clearTimeout(timer);
  }
}

async function expectStatus(step, url, expectedStatus, init = {}) {
  const response = await fetchWithTimeout(url, init);
  if (response?.error) {
    const detail = response.error instanceof Error ? response.error.message : 'request failed';
    fail(step, `${url} -> ${detail}`);
  }

  if (response.status !== expectedStatus) {
    fail(step, `${url} -> expected ${expectedStatus}, received ${response.status}`);
  }

  pass(step, `${url} -> ${expectedStatus}`);
  return response;
}

async function expectHostPortClosed(url) {
  const response = await fetchWithTimeout(url, { method: 'GET' }, 1500);
  if (!response?.error) {
    fail('backend-host-port', `${url} must be unreachable from the host`);
  }

  pass('backend-host-port', `${url} is not reachable from the host`);
}

const env = parseEnvFile(envFile);
const publicOrigin = normalizePublicOrigin(env.get('API_BASE_URL'), 'API_BASE_URL');
const appOrigin = normalizePublicOrigin(env.get('APP_URL'), 'APP_URL');
const expectedCallbackUrl = buildExpectedCallbackUrl(publicOrigin);

if (appOrigin !== publicOrigin) {
  fail('public-origin-alignment', `APP_URL (${appOrigin}) must match API_BASE_URL (${publicOrigin}) in docker-dev`);
}

pass('public-origin-alignment', `APP_URL and API_BASE_URL resolve to ${publicOrigin}`);

runDockerCommand('compose-ps', ['ps']);
pass('compose-ps', 'docker compose core profile is reachable');

runDockerCommand('backend-live-internal', ['exec', '-T', 'backend', 'curl', '-fsS', 'http://localhost:3001/health']);
pass('backend-live-internal', 'backend responds on internal port 3001');

runDockerCommand(
  'backend-ready-internal',
  ['exec', '-T', 'backend', 'curl', '-fsS', 'http://localhost:3001/api/health/ready'],
);
pass('backend-ready-internal', 'backend readiness responds on internal port 3001');

await expectHostPortClosed('http://localhost:3001/health');

await expectStatus('frontend-root', `${publicOrigin}/`, 200);
await expectStatus('frontend-health', `${publicOrigin}/health`, 200);
await expectStatus('frontend-ready', `${publicOrigin}/api/health/ready`, 200);

const authStatus = await expectStatus('auth-status', `${publicOrigin}/api/auth/status`, 200);
let authPayload;
try {
  authPayload = await authStatus.json();
} catch {
  fail('auth-status', 'response is not valid JSON');
}

if (typeof authPayload?.authenticated !== 'boolean') {
  fail('auth-status', 'payload must include boolean authenticated');
}

pass('auth-status-payload', `authenticated=${String(authPayload.authenticated)}`);

await expectStatus(
  'planning-ws-session',
  `${publicOrigin}/api/planning/ws-session`,
  401,
  {
    method: 'POST',
  },
);

const googleAuth = await expectStatus(
  'oauth-entry',
  `${publicOrigin}/api/auth/google`,
  302,
  {
    method: 'GET',
    redirect: 'manual',
  },
);

const googleAuthLocation = googleAuth.headers.get('location');
if (!googleAuthLocation) {
  fail('oauth-entry', 'missing Location header');
}

let googleAuthRedirectUri;
try {
  googleAuthRedirectUri = new URL(googleAuthLocation).searchParams.get('redirect_uri');
} catch {
  fail('oauth-entry', `invalid redirect URL '${googleAuthLocation}'`);
}

if (googleAuthRedirectUri !== expectedCallbackUrl) {
  fail('oauth-entry', `redirect_uri must be ${expectedCallbackUrl} (received ${googleAuthRedirectUri ?? 'null'})`);
}

pass('oauth-entry-redirect', `redirect_uri=${googleAuthRedirectUri}`);

const googleCallback = await expectStatus(
  'oauth-callback-route',
  expectedCallbackUrl,
  302,
  {
    method: 'GET',
    redirect: 'manual',
  },
);

const googleCallbackLocation = googleCallback.headers.get('location');
if (!googleCallbackLocation) {
  fail('oauth-callback-route', 'missing Location header');
}

let googleCallbackRedirectUri;
try {
  googleCallbackRedirectUri = new URL(googleCallbackLocation).searchParams.get('redirect_uri');
} catch {
  fail('oauth-callback-route', `invalid redirect URL '${googleCallbackLocation}'`);
}

if (googleCallbackRedirectUri !== expectedCallbackUrl) {
  fail(
    'oauth-callback-route',
    `callback redirect_uri must be ${expectedCallbackUrl} (received ${googleCallbackRedirectUri ?? 'null'})`,
  );
}

pass('oauth-callback-route-redirect', `redirect_uri=${googleCallbackRedirectUri}`);
console.log('[smoke] PASS all checks');
