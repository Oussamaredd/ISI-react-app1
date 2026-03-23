import { useEffect, useMemo, useState } from 'react';

const API_READY_RETRY_DELAYS_MS = [400, 900, 1600];
const API_READY_STEADY_RETRY_DELAY_MS = 3000;
const API_READY_TIMEOUT_MS = 1500;
const FALLBACK_API_BASE = 'http://localhost:3001';

export type ApiReachability = 'checking' | 'ready' | 'degraded';

const getRetryDelayMs = (attemptCount: number) =>
  API_READY_RETRY_DELAYS_MS[attemptCount] ?? API_READY_STEADY_RETRY_DELAY_MS;

const trimTrailingSlashes = (value: string) => {
  let endIndex = value.length;

  while (endIndex > 0 && value.charCodeAt(endIndex - 1) === 47) {
    endIndex -= 1;
  }

  return endIndex === value.length ? value : value.slice(0, endIndex);
};

const normalizeApiBaseUrl = (apiBaseUrl: string) => {
  const trimmed = trimTrailingSlashes(apiBaseUrl.trim());
  if (!trimmed) {
    if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
      const origin = window.location.origin.trim();
      if (origin.length > 0) {
        return origin;
      }
    }

    return FALLBACK_API_BASE;
  }

  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

export const probeApiHealth = async (
  apiBaseUrl: string,
  options: { timeoutMs?: number } = {},
) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? API_READY_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const useApiReady = (apiBaseUrl: string) => {
  const [isApiReady, setIsApiReady] = useState(false);
  const [apiReachability, setApiReachability] = useState<ApiReachability>('checking');
  const healthUrl = useMemo(() => `${normalizeApiBaseUrl(apiBaseUrl)}/health`, [apiBaseUrl]);

  const runProbe = async () => {
    const isHealthy = await probeApiHealth(apiBaseUrl);
    setIsApiReady(isHealthy);
    setApiReachability(isHealthy ? 'ready' : 'degraded');
    return isHealthy;
  };

  useEffect(() => {
    let isActive = true;
    let bootstrapTimer: number | null = null;
    let retryTimer: number | null = null;
    let retryAttemptCount = 0;

    const clearRetryTimer = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const probe = async ({ scheduleRetry = true }: { scheduleRetry?: boolean } = {}) => {
      if (!isActive) {
        return false;
      }

      const isHealthy = await runProbe();

      if (!isActive) {
        return false;
      }

      if (isHealthy) {
        retryAttemptCount = 0;
        clearRetryTimer();
      } else if (scheduleRetry) {
        const retryDelayMs = getRetryDelayMs(retryAttemptCount);
        retryAttemptCount += 1;

        clearRetryTimer();
        retryTimer = window.setTimeout(() => {
          void probe();
        }, retryDelayMs);
      }

      return isHealthy;
    };

    const reprobeSoon = () => {
      if (!isActive) {
        return;
      }

      retryAttemptCount = 0;
      clearRetryTimer();
      void probe();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reprobeSoon();
      }
    };

    bootstrapTimer = window.setTimeout(() => {
      setIsApiReady(false);
      setApiReachability('checking');
      void probe();
    }, 0);
    window.addEventListener('online', reprobeSoon);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      window.removeEventListener('online', reprobeSoon);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (bootstrapTimer !== null) {
        window.clearTimeout(bootstrapTimer);
      }
      clearRetryTimer();
    };
  }, [healthUrl]);

  return {
    isApiReady,
    apiReachability,
    healthUrl,
    retry: runProbe,
  };
};
