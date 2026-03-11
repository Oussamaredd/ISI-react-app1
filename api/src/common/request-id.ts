import type { Request } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
export const RESPONSE_REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * Normalizes a request identifier candidate into a trimmed string value.
 *
 * @param value - Raw header or framework-provided request identifier input.
 * @returns The normalized identifier, or `undefined` when the input cannot be used.
 */
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

/**
 * Resolves the request identifier from the request object using the repository header contract.
 *
 * @param request - Request-like object that may already contain framework-level request identifiers.
 * @returns The first valid request identifier from request state or headers.
 */
export const getRequestIdFromRequest = (
  request: Pick<Request, 'headers' | 'requestId' | 'id'>,
): string | undefined =>
  normalizeRequestId(request.requestId) ??
  normalizeRequestId(request.id) ??
  normalizeRequestId(request.headers[REQUEST_ID_HEADER]);
