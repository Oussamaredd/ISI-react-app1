const FALLBACK_API_BASE = 'http://localhost:3001';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const trimTrailingSlashes = (value: string) => {
  let endIndex = value.length;

  while (endIndex > 0 && value.charCodeAt(endIndex - 1) === 47) {
    endIndex -= 1;
  }

  return endIndex === value.length ? value : value.slice(0, endIndex);
};

const normalizeApiBase = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = trimTrailingSlashes(value.trim());
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const resolveWindowOrigin = (windowOrigin?: string | null) => {
  if (typeof windowOrigin === 'string') {
    return normalizeApiBase(windowOrigin);
  }

  if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    return normalizeApiBase(window.location.origin);
  }

  return null;
};

const isLoopbackOrigin = (value: string | null) => {
  if (!value) {
    return false;
  }

  try {
    const { hostname } = new URL(value);
    return LOOPBACK_HOSTS.has(hostname) || hostname.endsWith('.localhost');
  } catch {
    return false;
  }
};

export const resolveApiBase = ({
  configuredApiBase,
  edgeProxyEnabled = false,
  fallbackApiBase = FALLBACK_API_BASE,
  windowOrigin,
}: {
  configuredApiBase?: string;
  edgeProxyEnabled?: boolean;
  fallbackApiBase?: string;
  windowOrigin?: string | null;
} = {}) => {
  const currentOrigin = resolveWindowOrigin(windowOrigin);
  const normalizedConfiguredApiBase = normalizeApiBase(configuredApiBase);
  const normalizedFallbackApiBase = normalizeApiBase(fallbackApiBase) ?? FALLBACK_API_BASE;

  if (edgeProxyEnabled) {
    return currentOrigin ?? normalizedFallbackApiBase;
  }

  if (!normalizedConfiguredApiBase) {
    return currentOrigin ?? normalizedFallbackApiBase;
  }

  if (
    currentOrigin &&
    currentOrigin !== normalizedConfiguredApiBase &&
    isLoopbackOrigin(normalizedConfiguredApiBase)
  ) {
    return currentOrigin;
  }

  return normalizedConfiguredApiBase;
};
