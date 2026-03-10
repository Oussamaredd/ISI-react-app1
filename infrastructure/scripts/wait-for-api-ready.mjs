const DEFAULT_URL = 'http://localhost:3001/api/health/ready';
const DEFAULT_INTERVAL_MS = 1200;
const DEFAULT_REQUEST_TIMEOUT_MS = 2000;
const DEFAULT_TIMEOUT_MS = 180000;

const hasArg = (name) => process.argv.includes(name);

const parseArg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  const value = process.argv[index + 1];
  return value ?? fallback;
};

const parsePositiveIntArg = (name, fallback) => {
  const parsed = Number.parseInt(parseArg(name, `${fallback}`), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const probeUrl = parseArg('--url', DEFAULT_URL);
const intervalMs = parsePositiveIntArg('--interval-ms', DEFAULT_INTERVAL_MS);
const requestTimeoutMs = parsePositiveIntArg('--request-timeout-ms', DEFAULT_REQUEST_TIMEOUT_MS);
const timeoutMs = parsePositiveIntArg('--timeout-ms', DEFAULT_TIMEOUT_MS);
const noFail = hasArg('--no-fail');
const startedAt = Date.now();

const wait = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const resolveProbeErrorReason = (error) => {
  if (!(error instanceof Error)) {
    return 'Error';
  }

  const errorCause = error.cause;
  if (errorCause && typeof errorCause === 'object' && 'code' in errorCause) {
    const errorCode = errorCause.code;
    if (typeof errorCode === 'string' && errorCode.length > 0) {
      return `${error.name}:${errorCode}`;
    }
  }

  return error.name;
};

const probe = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(probeUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return {
      isReady: response.ok,
      status: response.status,
      reason: null,
    };
  } catch (error) {
    return {
      isReady: false,
      status: null,
      reason: resolveProbeErrorReason(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const formatProbeResult = (result) => {
  if (!result) {
    return 'probe unavailable';
  }

  if (typeof result.status === 'number') {
    return `status ${result.status}`;
  }

  return result.reason ? `error ${result.reason}` : 'unreachable';
};

const run = async () => {
  let lastProbeResult = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastProbeResult = await probe();
    if (lastProbeResult.isReady) {
      const elapsedMs = Date.now() - startedAt;
      console.log(`[wait-for-api-ready] API is ready at ${probeUrl} (${elapsedMs}ms)`);
      process.exit(0);
    }

    console.log(
      `[wait-for-api-ready] waiting for API at ${probeUrl} (${formatProbeResult(lastProbeResult)})`,
    );
    await wait(intervalMs);
  }

  if (noFail) {
    console.warn(
      `[wait-for-api-ready] timeout after ${timeoutMs}ms while probing ${probeUrl} (last probe: ${formatProbeResult(lastProbeResult)}); continuing because --no-fail is set`,
    );
    process.exit(0);
  }

  console.error(
    `[wait-for-api-ready] timeout after ${timeoutMs}ms while probing ${probeUrl} (last probe: ${formatProbeResult(lastProbeResult)})`,
  );
  process.exit(1);
};

void run();
