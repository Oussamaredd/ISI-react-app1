import { randomBytes } from 'node:crypto';

import type { Request } from 'express';

export const TRACEPARENT_HEADER = 'traceparent';
export const TRACESTATE_HEADER = 'tracestate';

const TRACEPARENT_PATTERN =
  /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const HEX_32_PATTERN = /^[0-9a-f]{32}$/;
const HEX_16_PATTERN = /^[0-9a-f]{16}$/;

type TraceAwareRequest = Pick<Request, 'headers'> & {
  traceId?: unknown;
  spanId?: unknown;
  traceparent?: unknown;
  tracestate?: unknown;
};

export type TraceContext = {
  traceId: string;
  spanId: string;
  traceparent: string;
  tracestate?: string;
};

const normalizeSingleHeader = (value: unknown): string | undefined => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') {
    return undefined;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeHex = (value: unknown, pattern: RegExp): string | undefined => {
  const normalized = normalizeSingleHeader(value)?.toLowerCase();
  return normalized && pattern.test(normalized) ? normalized : undefined;
};

const createHex = (byteLength: number) => randomBytes(byteLength).toString('hex');

export const normalizeTraceparent = (value: unknown): string | undefined => {
  const candidate = normalizeSingleHeader(value)?.toLowerCase();
  if (!candidate) {
    return undefined;
  }

  const match = candidate.match(TRACEPARENT_PATTERN);
  if (!match) {
    return undefined;
  }

  const [, traceId, spanId] = match;
  if (
    traceId === '00000000000000000000000000000000' ||
    spanId === '0000000000000000'
  ) {
    return undefined;
  }

  return candidate;
};

export const resolveTraceContext = (
  request: TraceAwareRequest,
): TraceContext => {
  const requestTraceId = normalizeHex(request.traceId, HEX_32_PATTERN);
  const requestSpanId = normalizeHex(request.spanId, HEX_16_PATTERN);
  const requestTraceparent = normalizeTraceparent(request.traceparent);
  const requestTracestate = normalizeSingleHeader(request.tracestate);

  if (requestTraceId && requestSpanId && requestTraceparent) {
    return {
      traceId: requestTraceId,
      spanId: requestSpanId,
      traceparent: requestTraceparent,
      ...(requestTracestate ? { tracestate: requestTracestate } : {}),
    };
  }

  const incomingTraceparent = normalizeTraceparent(
    request.headers[TRACEPARENT_HEADER],
  );
  const incomingTracestate = normalizeSingleHeader(
    request.headers[TRACESTATE_HEADER],
  );

  if (incomingTraceparent) {
    const [, traceId, spanId] = incomingTraceparent.match(TRACEPARENT_PATTERN) ?? [];
    if (traceId && spanId) {
      return {
        traceId,
        spanId,
        traceparent: incomingTraceparent,
        ...(incomingTracestate ? { tracestate: incomingTracestate } : {}),
      };
    }
  }

  const traceId = createHex(16);
  const spanId = createHex(8);

  return {
    traceId,
    spanId,
    traceparent: `00-${traceId}-${spanId}-01`,
  };
};
