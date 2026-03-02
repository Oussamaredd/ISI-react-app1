import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_ROOT_KEYS = [
  'DATABASE_URL',
  'API_PORT',
  'JWT_SECRET',
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
];
const REQUIRED_APP_KEYS = ['VITE_API_BASE_URL'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const rootEnvPath = path.join(repoRoot, '.env');
const appEnvPath = path.join(repoRoot, 'app', '.env.local');

const results = [];

const addResult = (level, name, detail) => {
  results.push({ level, name, detail });
};

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = {};
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
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }

  return parsed;
};

const checkRequiredKeys = (env, keys, sourceName) => {
  if (!env) {
    addResult('FAIL', sourceName, 'file is missing');
    return;
  }

  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    addResult('FAIL', sourceName, `missing keys: ${missing.join(', ')}`);
    return;
  }

  addResult('PASS', sourceName, `required keys are present (${keys.join(', ')})`);
};

const checkTcp = (host, port, timeoutMs = 1500) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });

const fetchStatus = async (url, timeoutMs = 2000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const checkMigrationStatus = async (databaseUrl) => {
  let postgres;
  try {
    ({ default: postgres } = await import('postgres'));
  } catch {
    addResult(
      'WARN',
      'drizzle.__drizzle_migrations',
      'postgres client package is unavailable; skipping migration status check',
    );
    return;
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 5,
    prepare: false,
  });

  try {
    const tableRows = await sql`
      select exists(
        select 1
        from information_schema.tables
        where table_schema = 'drizzle'
          and table_name = '__drizzle_migrations'
      ) as exists
    `;
    const tableExists = Boolean(tableRows[0]?.exists);

    if (!tableExists) {
      addResult('WARN', 'drizzle.__drizzle_migrations', 'table not found');
      return;
    }

    const migrationRows = await sql`
      select count(*)::int as applied, max(created_at) as last_applied
      from drizzle.__drizzle_migrations
    `;

    const applied = Number(migrationRows[0]?.applied ?? 0);
    const lastApplied = migrationRows[0]?.last_applied ?? null;
    addResult(
      'PASS',
      'drizzle.__drizzle_migrations',
      `applied=${Number.isFinite(applied) ? applied : 0}, lastApplied=${lastApplied ?? 'n/a'}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown migration status error';
    addResult('WARN', 'drizzle.__drizzle_migrations', message);
  } finally {
    await sql.end({ timeout: 3 });
  }
};

const run = async () => {
  const rootEnv = parseEnvFile(rootEnvPath);
  const appEnv = parseEnvFile(appEnvPath);

  checkRequiredKeys(rootEnv, REQUIRED_ROOT_KEYS, '.env');
  checkRequiredKeys(appEnv, REQUIRED_APP_KEYS, 'app/.env.local');

  if (rootEnv?.JWT_SECRET && rootEnv?.JWT_ACCESS_SECRET) {
    const sameSecret = rootEnv.JWT_SECRET === rootEnv.JWT_ACCESS_SECRET;
    addResult(
      sameSecret ? 'PASS' : 'WARN',
      'JWT access secret alignment',
      sameSecret
        ? 'JWT_ACCESS_SECRET matches JWT_SECRET'
        : 'JWT_ACCESS_SECRET differs from JWT_SECRET',
    );
  }

  let parsedDatabaseUrl;
  if (!rootEnv?.DATABASE_URL) {
    addResult('FAIL', 'DATABASE_URL', 'DATABASE_URL is required');
  } else {
    try {
      parsedDatabaseUrl = new URL(rootEnv.DATABASE_URL);
      addResult('PASS', 'DATABASE_URL', 'valid URL format');
    } catch {
      addResult('FAIL', 'DATABASE_URL', 'invalid URL format');
    }
  }

  if (parsedDatabaseUrl) {
    const dbHost = parsedDatabaseUrl.hostname || 'localhost';
    const dbPort = Number(parsedDatabaseUrl.port || '5432');
    const dbReachable = await checkTcp(dbHost, dbPort);
    addResult(
      dbReachable ? 'PASS' : 'WARN',
      'Database TCP reachability',
      `${dbHost}:${dbPort} ${dbReachable ? 'reachable' : 'unreachable'}`,
    );

    await checkMigrationStatus(rootEnv.DATABASE_URL);
  }

  const apiPort = Number(rootEnv?.API_PORT || 3001);
  const liveStatus = await fetchStatus(`http://localhost:${apiPort}/health`);
  const apiLiveStatus = await fetchStatus(`http://localhost:${apiPort}/api/health/live`);
  const readyStatus = await fetchStatus(`http://localhost:${apiPort}/api/health/ready`);

  addResult(
    liveStatus === 200 ? 'PASS' : 'WARN',
    'GET /health',
    liveStatus === null ? 'endpoint unreachable (API may be stopped)' : `status=${liveStatus}`,
  );
  addResult(
    apiLiveStatus === 200 ? 'PASS' : 'WARN',
    'GET /api/health/live',
    apiLiveStatus === null ? 'endpoint unreachable (API may be stopped)' : `status=${apiLiveStatus}`,
  );
  addResult(
    readyStatus === 200 ? 'PASS' : 'WARN',
    'GET /api/health/ready',
    readyStatus === null ? 'endpoint unreachable (API may be stopped)' : `status=${readyStatus}`,
  );

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.level === 'PASS') {
      passCount += 1;
    } else if (result.level === 'WARN') {
      warnCount += 1;
    } else {
      failCount += 1;
    }
    console.log(`[dev-doctor] ${result.level} ${result.name}: ${result.detail}`);
  }

  console.log(
    `[dev-doctor] summary: PASS=${passCount} WARN=${warnCount} FAIL=${failCount}`,
  );

  process.exit(failCount > 0 ? 1 : 0);
};

void run();
