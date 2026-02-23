const DEFAULT_URL = 'http://localhost:3001/health';
const DEFAULT_INTERVAL_MS = 1200;
const DEFAULT_TIMEOUT_MS = 90000;

const parseArg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  const value = process.argv[index + 1];
  return value ?? fallback;
};

const probeUrl = parseArg('--url', DEFAULT_URL);
const intervalMs = Number.parseInt(parseArg('--interval-ms', `${DEFAULT_INTERVAL_MS}`), 10);
const timeoutMs = Number.parseInt(parseArg('--timeout-ms', `${DEFAULT_TIMEOUT_MS}`), 10);
const startedAt = Date.now();

const wait = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const isReady = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(2000, intervalMs));

  try {
    const response = await fetch(probeUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const run = async () => {
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReady()) {
      const elapsedMs = Date.now() - startedAt;
      console.log(`[wait-for-api-ready] API is ready at ${probeUrl} (${elapsedMs}ms)`);
      process.exit(0);
    }

    console.log(`[wait-for-api-ready] waiting for API at ${probeUrl}`);
    await wait(intervalMs);
  }

  console.error(`[wait-for-api-ready] timeout after ${timeoutMs}ms while probing ${probeUrl}`);
  process.exit(1);
};

void run();
