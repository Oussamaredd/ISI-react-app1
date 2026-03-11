import type { NextFunction, Request, Response } from 'express';

import { resolveTraceContext } from '../trace-context.js';

type TraceAwareRequest = Request & {
  traceId?: string;
  spanId?: string;
  traceparent?: string;
  tracestate?: string;
};

export function traceContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const traceAwareRequest = request as TraceAwareRequest;
  const traceContext = resolveTraceContext(traceAwareRequest);

  traceAwareRequest.traceId = traceContext.traceId;
  traceAwareRequest.spanId = traceContext.spanId;
  traceAwareRequest.traceparent = traceContext.traceparent;
  traceAwareRequest.tracestate = traceContext.tracestate;

  response.setHeader('Traceparent', traceContext.traceparent);
  if (traceContext.tracestate) {
    response.setHeader('Tracestate', traceContext.tracestate);
  }

  next();
}
