const UUID_SEGMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT_PATTERN = /^\d+$/;
const TOKEN_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

export const HTTP_REQUEST_DURATION_BUCKETS_MS = [
  25,
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
] as const;

const normalizeMetricsSegment = (segment: string): string => {
  if (
    UUID_SEGMENT_PATTERN.test(segment) ||
    NUMERIC_SEGMENT_PATTERN.test(segment) ||
    TOKEN_SEGMENT_PATTERN.test(segment)
  ) {
    return ':id';
  }

  return segment;
};

export const normalizeMetricsPath = (rawUrl?: string): string => {
  if (!rawUrl) {
    return '/';
  }

  const [pathOnly] = rawUrl.split('?');
  const normalizedPath = pathOnly || '/';
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.map(normalizeMetricsSegment).join('/')}`;
};

export const shouldIgnoreHttpMetricsPath = (rawUrl?: string): boolean => {
  const normalizedPath = normalizeMetricsPath(rawUrl);

  return (
    normalizedPath === '/health' ||
    normalizedPath === '/healthz' ||
    normalizedPath === '/startupz' ||
    normalizedPath === '/readyz' ||
    normalizedPath === '/api/metrics' ||
    normalizedPath.startsWith('/api/health')
  );
};
