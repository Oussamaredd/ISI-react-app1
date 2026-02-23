import type { Request } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
export const RESPONSE_REQUEST_ID_HEADER = 'X-Request-Id';

export const normalizeRequestId = (value: unknown): string | undefined => {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return String(candidate);
  }

  if (typeof candidate !== 'string') {
    return undefined;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const getRequestIdFromRequest = (
  request: Pick<Request, 'headers' | 'requestId' | 'id'>,
): string | undefined =>
  normalizeRequestId(request.requestId) ??
  normalizeRequestId(request.id) ??
  normalizeRequestId(request.headers[REQUEST_ID_HEADER]);
