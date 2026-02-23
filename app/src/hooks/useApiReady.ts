import { useEffect, useMemo, useState } from 'react';

const API_READY_RETRY_DELAY_MS = 1200;
const API_READY_TIMEOUT_MS = 1500;

const normalizeApiBaseUrl = (apiBaseUrl: string) => {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return 'http://localhost:3001';
  }

  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

export const useApiReady = (apiBaseUrl: string) => {
  const [isApiReady, setIsApiReady] = useState(false);
  const healthUrl = useMemo(() => `${normalizeApiBaseUrl(apiBaseUrl)}/health`, [apiBaseUrl]);

  useEffect(() => {
    let isActive = true;
    let retryTimer: number | null = null;

    const probe = async () => {
      if (!isActive) {
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), API_READY_TIMEOUT_MS);

      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!isActive) {
          return;
        }

        if (response.ok) {
          setIsApiReady(true);
          return;
        }
      } catch {
        // no-op: retry until API starts.
      } finally {
        window.clearTimeout(timeout);
      }

      if (!isActive) {
        return;
      }

      setIsApiReady(false);
      retryTimer = window.setTimeout(() => {
        void probe();
      }, API_READY_RETRY_DELAY_MS);
    };

    setIsApiReady(false);
    void probe();

    return () => {
      isActive = false;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [healthUrl]);

  return {
    isApiReady,
    healthUrl,
  };
};
