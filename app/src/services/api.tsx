// API client with centralized configuration and error handling
import { clearAccessToken, withAuthHeader } from './authToken';

const FALLBACK_API_BASE = 'http://localhost:3001';
const EDGE_PROXY_ENABLED = import.meta.env.VITE_USE_EDGE_API_PROXY === 'true';

const trimTrailingSlashes = (value: string) => {
  let endIndex = value.length;

  while (endIndex > 0 && value.charCodeAt(endIndex - 1) === 47) {
    endIndex -= 1;
  }

  return endIndex === value.length ? value : value.slice(0, endIndex);
};

const resolveDefaultApiBase = () => {
  if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    const origin = window.location.origin.trim();
    if (origin.length > 0) {
      return origin;
    }
  }

  return FALLBACK_API_BASE;
};

const configuredApiBase =
  import.meta.env.VITE_API_BASE_URL ??
  // Temporary alias support during migration to VITE_API_BASE_URL.
  import.meta.env.VITE_API_URL;

const resolveApiBaseFromRuntime = () => {
  if (EDGE_PROXY_ENABLED) {
    return resolveDefaultApiBase();
  }

  if (typeof configuredApiBase === 'string' && configuredApiBase.trim().length > 0) {
    return configuredApiBase;
  }

  return resolveDefaultApiBase();
};

const rawApiBase =
  resolveApiBaseFromRuntime();

const trimmedApiBase = trimTrailingSlashes(rawApiBase);
export const API_BASE = trimmedApiBase.endsWith('/api')
  ? trimmedApiBase.slice(0, -4)
  : trimmedApiBase;

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const ensureConnectionHint = (rel: 'dns-prefetch' | 'preconnect', href: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (rel === 'preconnect') {
    link.crossOrigin = '';
  }
  document.head.appendChild(link);
};

const addApiConnectionHints = (apiBase: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const apiOrigin = normalizeOrigin(apiBase);
  const currentOrigin = normalizeOrigin(window.location.origin);
  if (!apiOrigin || !currentOrigin || apiOrigin === currentOrigin) {
    return;
  }

  ensureConnectionHint('dns-prefetch', apiOrigin);
  ensureConnectionHint('preconnect', apiOrigin);
};

if (typeof window !== 'undefined') {
  addApiConnectionHints(API_BASE);
}

export const AUTH_SESSION_INVALIDATED_EVENT = 'ecotrack:auth-session-invalidated';
const FRONTEND_ERROR_ENDPOINT = '/api/errors';
const FRONTEND_METRIC_ENDPOINT = '/api/metrics/frontend';
const FRONTEND_RELEASE = import.meta.env.VITE_RELEASE_VERSION ?? null;
const FRONTEND_ENVIRONMENT = import.meta.env.MODE;

const captureWebExceptionAsync = (
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>,
) => {
  void import('../monitoring/sentry').then(({ captureWebException }) => {
    captureWebException(error, context, metadata);
  });
};

const captureWebMessageAsync = (
  message: string,
  context: string,
  metadata?: Record<string, unknown>,
) => {
  void import('../monitoring/sentry').then(({ captureWebMessage }) => {
    captureWebMessage(message, context, metadata);
  });
};

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

type FrontendErrorPayload = {
  type: string;
  message: string;
  context?: string;
  severity?: string;
  status?: number;
  timestamp?: string;
  stack?: string | null;
  metadata?: Record<string, unknown>;
};

type FrontendMetricPayload = {
  type: string;
  name: string;
  value: number;
  rating?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

const scrubTelemetryMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(metadata).filter(([key]) => {
    const normalizedKey = key.trim().toLowerCase();
    return (
      !normalizedKey.includes('token') &&
      !normalizedKey.includes('password') &&
      !normalizedKey.includes('authorization')
    );
  });

  if (sanitizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(sanitizedEntries);
};

const postTelemetry = async (path: string, payload: Record<string, unknown>) => {
  if (typeof window === 'undefined' || FRONTEND_ENVIRONMENT === 'test') {
    return;
  }

  try {
    await fetch(buildApiUrl(path), {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: createApiHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(payload),
    });
  } catch {
    // Keep client telemetry best-effort only.
  }
};

export const reportFrontendError = async (payload: FrontendErrorPayload) =>
  postTelemetry(FRONTEND_ERROR_ENDPOINT, {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    context: payload.context ?? 'app',
    severity: payload.severity ?? 'medium',
    stack: payload.stack ?? null,
    metadata: scrubTelemetryMetadata(payload.metadata),
    environment: FRONTEND_ENVIRONMENT,
    release: FRONTEND_RELEASE,
    url: typeof window !== 'undefined' ? window.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });

export const reportFrontendMetric = async (payload: FrontendMetricPayload) =>
  postTelemetry(FRONTEND_METRIC_ENDPOINT, {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    metadata: scrubTelemetryMetadata(payload.metadata),
    environment: FRONTEND_ENVIRONMENT,
    release: FRONTEND_RELEASE,
    url: typeof window !== 'undefined' ? window.location.href : null,
  });

export const invalidateClientSession = () => {
  clearAccessToken();

  void reportFrontendError({
    type: 'AUTH',
    message: 'Frontend session invalidated',
    context: 'auth.session.invalidated',
    severity: 'high',
    status: 401,
  });
  captureWebMessageAsync('Frontend session invalidated', 'auth.session.invalidated');

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALIDATED_EVENT));
};

const resolveApiErrorMessage = (payload: unknown, status: number) => {
  if (payload && typeof payload === 'object') {
    const errorPayload = payload as { error?: unknown; message?: unknown };

    if (typeof errorPayload.error === 'string' && errorPayload.error.trim().length > 0) {
      return errorPayload.error;
    }

    if (typeof errorPayload.message === 'string' && errorPayload.message.trim().length > 0) {
      return errorPayload.message;
    }
  }

  return `HTTP ${status}`;
};

export const buildApiUrl = (url: string) => `${API_BASE}${url}`;

export const createApiHeaders = (headers?: HeadersInit) =>
  Object.fromEntries(withAuthHeader(headers).entries());

// Global error handler for API calls
const handleApiError = (error) => {
  console.error('API Error:', error);
  throw error;
};

export const parseJsonResponse = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const createApiRequestError = async (response: Response) => {
  const payload = await parseJsonResponse(response);
  const error = new ApiRequestError(
    resolveApiErrorMessage(payload, response.status),
    response.status,
    payload,
  );

  if (response.status === 401) {
    invalidateClientSession();
  }

  if (
    response.status >= 500 &&
    !response.url.includes(FRONTEND_ERROR_ENDPOINT) &&
    !response.url.includes(FRONTEND_METRIC_ENDPOINT)
  ) {
    void reportFrontendError({
      type: 'SERVER',
      message: resolveApiErrorMessage(payload, response.status),
      context: 'api.request',
      severity: 'high',
      status: response.status,
      metadata: {
        responseUrl: response.url,
      },
    });
    captureWebExceptionAsync(error, 'api.request', {
      responseUrl: response.url,
      status: response.status,
    });
  }

  return error;
};

export const ensureApiResponse = async (response: Response) => {
  if (!response.ok) {
    throw await createApiRequestError(response);
  }

  return response;
};

export const authorizedFetch = (url: string, init: RequestInit = {}) => {
  const { headers, ...restInit } = init;

  return fetch(buildApiUrl(url), {
    credentials: 'include',
    ...restInit,
    headers: createApiHeaders(headers),
  });
};

// Generic API wrapper
export const apiClient = {
  get: async (url, options: any = {}) => {
    try {
      const response = await authorizedFetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  post: async (url, data, options: any = {}) => {
    try {
      const response = await authorizedFetch(url, {
        method: 'POST',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  put: async (url, data, options: any = {}) => {
    try {
      const response = await authorizedFetch(url, {
        method: 'PUT',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async (url, options = {}) => {
    try {
      const response = await authorizedFetch(url, {
        method: 'DELETE',
        ...(options as RequestInit),
      });

      await ensureApiResponse(response);

      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
